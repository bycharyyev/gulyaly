import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      logSecurityEvent('access_denied', { action: 'seller_application_status', reason: 'not_authenticated' });
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Получить последнюю заявку пользователя
    const application = await prisma.sellerApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            sellerStatus: true
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json({
        hasApplication: false,
        message: 'У вас нет заявок на становление продавцом'
      }, { status: 200 });
    }

    // Если заявка отклонена, проверить cooldown
    let canReapply = true;
    let cooldownEndsAt = null;
    
    if (application.status === 'REJECTED') {
      const daysSinceRejection = 
        (Date.now() - application.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRejection < 30) {
        canReapply = false;
        cooldownEndsAt = new Date(application.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Парсим documents если есть
    let documents = null;
    if (application.documents) {
      try {
        documents = JSON.parse(application.documents);
      } catch (e) {
        documents = application.documents;
      }
    }

    return NextResponse.json({
      hasApplication: true,
      application: {
        id: application.id,
        businessName: application.businessName,
        businessType: application.businessType,
        taxId: application.taxId,
        documents,
        status: application.status,
        reviewedBy: application.reviewedBy,
        reviewedAt: application.reviewedAt,
        reviewNotes: application.reviewNotes,
        rejectionReason: application.rejectionReason,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt
      },
      user: application.user,
      canReapply,
      cooldownEndsAt
    }, { status: 200 });

  } catch (error) {
    console.error('Get seller application error:', error);
    logSecurityEvent('api_error', { 
      action: 'seller_application_status', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка получения статуса заявки' },
      { status: 500 }
    );
  }
}
