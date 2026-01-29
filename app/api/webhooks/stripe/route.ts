import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { sendOrderNotification } from '@/lib/notifications';
import Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Обработка события оплаты
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, productId, variantId } = session.metadata as {
      userId: string;
      productId: string;
      variantId: string;
    };

    try {
      // Создаем заказ в базе данных
      const result = await prisma.$queryRawUnsafe(`
        INSERT INTO orders (id, userId, productId, variantId, amount, status, stripeSessionId, createdAt, updatedAt)
        VALUES (cuid(), ?, ?, ?, ?, 'PAID', ?, datetime('now'), datetime('now'))
        RETURNING id
      `, userId, productId, variantId, session.amount_total || 0, session.id) as any[];

      const orderId = result[0]?.id;
      console.log(`Order created: ${orderId} for user ${userId}`);

      // Отправляем уведомления о новом заказе
      if (orderId) {
        await sendOrderNotification(orderId, userId, productId, session.amount_total || 0);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
