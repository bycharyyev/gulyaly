import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireAdmin, logSecurityEvent } from '@/lib/security';

// ❗ POST /admin/sellers/{id}/approve
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authorization
    const adminCheck = await requireAdmin();
    if (adminCheck) return adminCheck;

    const session = await auth();
    const adminId = (session?.user as any)?.id;
    const applicationId = params.id;

    const { reviewNotes } = await request.json();

    // Get application
    const application = await prisma.sellerApplication.findUnique({
      where: { id: applicationId },
      include: { user: true }
    });

    if (!application) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `Заявка уже обработана. Статус: ${application.status}` 
      }, { status: 400 });
    }

    // ❗ Проверка: нельзя approve banned user
    if (application.user.banned) {
      return NextResponse.json({ 
        error: 'Невозможно одобрить заявку заблокированного пользователя' 
      }, { status: 400 });
    }

    // Check if seller already exists for this user
    const existingSeller = await prisma.seller.findUnique({
      where: { email: application.email }
    });

    let sellerId: string;

    if (existingSeller) {
      // Update existing seller
      await prisma.seller.update({
        where: { id: existingSeller.id },
        data: {
          sellerStatus: 'APPROVED',
          businessName: application.businessName,
          businessType: application.businessType,
          taxId: application.taxId
        }
      });
      sellerId = existingSeller.id;
    } else {
      // Create new seller record
      const newSeller = await prisma.seller.create({
        data: {
          email: application.email,
          name: application.businessName,
          phone: application.phone,
          sellerStatus: 'APPROVED',
          businessName: application.businessName,
          businessType: application.businessType,
          taxId: application.taxId,
          // Note: Password will need to be set by the user via a setup flow
          passwordHash: '' // Placeholder - requires password setup
        }
      });
      sellerId = newSeller.id;
    }

    // Atomic update: Application
    const updatedApplication = await prisma.sellerApplication.update({
      where: { id: applicationId },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null
      }
    });

    // ❗ Логирование действия
    await logSecurityEvent('seller_application_reviewed', {
      adminId,
      applicationId,
      userId: application.userId,
      action: 'APPROVED',
      reviewNotes
    });

    // ❗ SECURITY NOTE: User's JWT token still has old sellerStatus
    // User MUST re-login to get updated token with sellerStatus='APPROVED'
    // Alternative: Implement token refresh endpoint or use short-lived tokens

    // TODO: Notify user about approval
    // await notifyUser(application.userId, 'seller_application_approved');

    return NextResponse.json({
      success: true,
      message: 'Заявка одобрена. Пользователь теперь продавец.',
      application: updatedApplication,
      requiresRelogin: true  // ❗ Signal that user needs to re-login
    }, { status: 200 });

  } catch (error) {
    console.error('Approve seller error:', error);
    logSecurityEvent('api_error', { 
      action: 'admin_approve_seller', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка одобрения заявки' },
      { status: 500 }
    );
  }
}
