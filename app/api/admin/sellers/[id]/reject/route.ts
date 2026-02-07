import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireAdmin, logSecurityEvent } from '@/lib/security';

// ❗ POST /admin/sellers/{id}/reject
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

    // ❗ Причина обязательна
    const { rejectionReason, reviewNotes } = await request.json();

    if (!rejectionReason || rejectionReason.length < 10) {
      return NextResponse.json({ 
        error: 'Укажите причину отклонения (минимум 10 символов)' 
      }, { status: 400 });
    }

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

    // Atomic update: Application + User
    const [updatedApplication] = await prisma.$transaction([
      // ❗ Update application: status = REJECTED
      prisma.sellerApplication.update({
        where: { id: applicationId },
        data: {
          status: 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
          rejectionReason
        }
      }),
      // ❗ Update user: sellerStatus = REJECTED
      prisma.user.update({
        where: { id: application.userId },
        data: {
          sellerStatus: 'REJECTED'
        }
      })
    ]);

    // ❗ Логирование действия
    await logSecurityEvent('seller_application_reviewed', {
      adminId,
      applicationId,
      userId: application.userId,
      action: 'REJECTED',
      rejectionReason,
      reviewNotes
    });

    // TODO: Notify user about rejection
    // await notifyUser(application.userId, 'seller_application_rejected', { reason: rejectionReason });

    return NextResponse.json({
      success: true,
      message: 'Заявка отклонена. Пользователь может подать повторную заявку через 30 дней.',
      application: updatedApplication
    }, { status: 200 });

  } catch (error) {
    console.error('Reject seller error:', error);
    logSecurityEvent('api_error', { 
      action: 'admin_reject_seller', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка отклонения заявки' },
      { status: 500 }
    );
  }
}
