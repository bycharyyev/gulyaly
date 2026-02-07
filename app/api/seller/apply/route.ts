import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, logSecurityEvent } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    // ❗ Проверка: user == authorized
    if (!session?.user) {
      logSecurityEvent('access_denied', { action: 'seller_apply', reason: 'not_authenticated' });
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // Rate limiting - максимум 3 попытки в час
    if (!checkRateLimit(`seller_apply:${userId}`, 3, 60 * 60 * 1000)) {
      logSecurityEvent('rate_limit', { action: 'seller_apply', userId });
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте через час' },
        { status: 429 }
      );
    }

    // ❗ Проверка: sellerStatus != APPROVED
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sellerApplication: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Уже seller - проверяем через sellerApplication
    if (user.sellerApplication?.status === 'APPROVED') {
      return NextResponse.json({ error: 'Вы уже являетесь продавцом' }, { status: 400 });
    }

    // ❗ Блок повторной заявки: проверка активной заявки
    const existingApplication = user.sellerApplication;
    if (existingApplication && existingApplication.status === 'PENDING') {
      return NextResponse.json({ 
        error: 'У вас уже есть активная заявка на рассмотрении',
        applicationId: existingApplication.id
      }, { status: 400 });
    }

    // ❗ Cooldown после отклонения: 30 дней
    if (existingApplication && existingApplication.status === 'REJECTED') {
      const daysSinceRejection = 
        (Date.now() - existingApplication.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRejection < 30) {
        return NextResponse.json({
          error: `Можно подать повторную заявку через ${Math.ceil(30 - daysSinceRejection)} дней`,
          rejectedAt: existingApplication.createdAt,
          cooldownEndsAt: new Date(existingApplication.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
        }, { status: 400 });
      }
    }

    // Валидация данных
    const { businessName, businessType, taxId, documents, phone, email } = await request.json();

    if (!businessName || businessName.length < 2) {
      return NextResponse.json({ error: 'Укажите название бизнеса' }, { status: 400 });
    }

    if (!businessType || !['individual', 'company'].includes(businessType)) {
      return NextResponse.json({ error: 'Укажите тип бизнеса: individual или company' }, { status: 400 });
    }

    if (!phone || phone.length < 5) {
      return NextResponse.json({ error: 'Укажите номер телефона' }, { status: 400 });
    }

    if (!email || email.length < 5 || !email.includes('@')) {
      return NextResponse.json({ error: 'Укажите корректный email' }, { status: 400 });
    }

    // ❗ Создание SellerApplication (PENDING)
    const application = await prisma.sellerApplication.create({
      data: {
        userId,
        businessName,
        businessType,
        taxId: taxId || null,
        documents: documents ? JSON.stringify(documents) : null,
        status: 'PENDING',
        phone,
        email
      }
    });

    // Примечание: sellerStatus хранится в модели Seller, не в User
    // Заявка уже создана со статусом PENDING выше

    // Логирование
    await logSecurityEvent('seller_application_submitted', {
      userId,
      applicationId: application.id,
      businessName,
      businessType
    });

    // TODO: Уведомить админов о новой заявке
    // await notifyAdmins('new_seller_application', { applicationId: application.id });

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        createdAt: application.createdAt
      },
      message: 'Заявка отправлена на рассмотрение. Ожидайте проверки администратором.'
    }, { status: 201 });

  } catch (error) {
    console.error('Seller application error:', error);
    logSecurityEvent('api_error', { 
      action: 'seller_apply', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка создания заявки' },
      { status: 500 }
    );
  }
}
