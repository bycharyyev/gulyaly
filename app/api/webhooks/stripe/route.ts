import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { sendOrderNotification } from '@/lib/notifications';
import Stripe from 'stripe';

// Whitelist of allowed event types
const ALLOWED_EVENTS = ['checkout.session.completed'] as const;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  // 1. Validate signature presence
  if (!signature) {
    console.error('[STRIPE_WEBHOOK] Missing stripe-signature header');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  // 2. Validate Stripe configuration
  if (!stripe) {
    console.error('[STRIPE_WEBHOOK] Stripe not configured - missing STRIPE_SECRET_KEY');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[STRIPE_WEBHOOK] Missing STRIPE_WEBHOOK_SECRET environment variable');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  let event: Stripe.Event;

  // 3. Cryptographically verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[STRIPE_WEBHOOK] Signature verification failed: ${errorMessage}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 4. Explicit event type validation (whitelist approach)
  if (!ALLOWED_EVENTS.includes(event.type as typeof ALLOWED_EVENTS[number])) {
    console.log(`[STRIPE_WEBHOOK] Ignoring unhandled event type: ${event.type}`);
    return NextResponse.json({ received: true, ignored: true });
  }

  // 5. Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Validate metadata presence
    if (!session.metadata?.userId || !session.metadata?.productId || !session.metadata?.variantId) {
      console.error('[STRIPE_WEBHOOK] Missing required metadata in session:', session.id);
      return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 });
    }

    const { userId, productId, variantId } = session.metadata;
    const amountTotal = session.amount_total || 0;
    const stripeSessionId = session.id;

    try {
      // 6. Idempotency check - prevent duplicate order creation
      const existingOrder = await prisma.order.findFirst({
        where: { stripeSessionId },
      });

      if (existingOrder) {
        console.log(`[STRIPE_WEBHOOK] Order already exists for session ${stripeSessionId}, skipping`);
        return NextResponse.json({ received: true, orderId: existingOrder.id, duplicate: true });
      }

      // 7. Atomic transaction for order creation
      const order = await prisma.$transaction(async (tx) => {
        // Verify user exists
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new Error(`User ${userId} not found`);
        }

        // Verify product exists
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) {
          throw new Error(`Product ${productId} not found`);
        }

        // Verify variant exists
        const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
        if (!variant) {
          throw new Error(`Variant ${variantId} not found`);
        }

        // Create order
        const newOrder = await tx.order.create({
          data: {
            userId,
            productId,
            variantId,
            amount: amountTotal,
            status: 'PAID',
            stripeSessionId,
          },
        });

        return newOrder;
      });

      console.log(`[STRIPE_WEBHOOK] Order created successfully: ${order.id} for user ${userId}`);

      // 8. Send notifications (non-blocking, separate try/catch)
      try {
        await sendOrderNotification(order.id, userId, productId, amountTotal);
      } catch (notificationError) {
        // Log but don't fail the webhook - order is already created
        const errorMessage = notificationError instanceof Error ? notificationError.message : 'Unknown error';
        console.error(`[STRIPE_WEBHOOK] Notification failed for order ${order.id}: ${errorMessage}`);
      }

      return NextResponse.json({ received: true, orderId: order.id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[STRIPE_WEBHOOK] Failed to create order: ${errorMessage}`);

      // Log without exposing internal details
      return NextResponse.json({ error: 'Failed to process order' }, { status: 500 });
    }
  }

  // Fallback for other allowed but unhandled events
  return NextResponse.json({ received: true });
}
