import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, logSecurityEvent } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      logSecurityEvent('access_denied', { action: 'checkout', reason: 'not_authenticated' });
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Rate limiting - максимум 5 checkout сессий в минуту
    if (!checkRateLimit(`checkout:${userId}`, 5, 60000)) {
      logSecurityEvent('rate_limit', { action: 'checkout', userId });
      return NextResponse.json(
        { error: 'Слишком много попыток. Подождите минуту' },
        { status: 429 }
      );
    }

    const { variantId } = await request.json();

    // Получаем вариант продукта
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant) {
      logSecurityEvent('invalid_input', { action: 'checkout', userId, reason: 'variant_not_found', variantId });
      return NextResponse.json({ error: 'Вариант не найден' }, { status: 404 });
    }

    // Проверяем что продукт активен
    if (!variant.product.isActive) {
      logSecurityEvent('invalid_input', { action: 'checkout', userId, reason: 'product_inactive', variantId });
      return NextResponse.json({ error: 'Продукт недоступен' }, { status: 400 });
    }

    // Создаем Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'rub',
            product_data: {
              name: `${variant.product.name} - ${variant.name}`,
              description: variant.description || variant.product.description,
            },
            unit_amount: variant.price, // цена в копейках
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?tab=orders&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/product/${variant.product.id}?canceled=true`,
      metadata: {
        userId: (session.user as any).id,
        productId: variant.product.id,
        variantId: variant.id,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Ошибка создания сессии оплаты' },
      { status: 500 }
    );
  }
}
