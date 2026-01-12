import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
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
      await prisma.order.create({
        data: {
          userId,
          productId,
          variantId,
          amount: session.amount_total || 0,
          status: 'PAID',
          stripeSessionId: session.id,
        },
      });

      console.log(`Order created for user ${userId}`);
    } catch (error) {
      console.error('Error creating order:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
