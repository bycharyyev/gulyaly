import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { sendOrderNotification } from '@/lib/notifications';
import Stripe from 'stripe';

// Whitelist of allowed event types
const ALLOWED_EVENTS = [
  'checkout.session.completed',
  'payment_intent.succeeded',
  'charge.refunded',
  'payment_intent.payment_failed'
] as const;

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

  // 5. Handle events
  try {
    // ❗ SECURITY FIX: Check if webhook event already processed (idempotency)
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id }
    });

    if (existingEvent) {
      console.log(`[STRIPE_WEBHOOK] Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Process event
    let result;
    switch (event.type) {
      case 'checkout.session.completed':
        result = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.id);
        break;
      
      case 'payment_intent.succeeded':
        result = await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, event.id);
        break;
      
      case 'charge.refunded':
        result = await handleChargeRefunded(event.data.object as Stripe.Charge, event.id);
        break;
      
      case 'payment_intent.payment_failed':
        result = await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, event.id);
        break;
      
      default:
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`);
        return NextResponse.json({ received: true, ignored: true });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[STRIPE_WEBHOOK] Error processing ${event.type}:`, errorMessage);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// ❗ Handle checkout.session.completed
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  console.log(`[WEBHOOK] checkout.session.completed: ${session.id}`);

  // Get orderId from metadata (created during checkout)
  const orderId = session.metadata?.orderId;
  
  if (!orderId) {
    console.error('[WEBHOOK] Missing orderId in session metadata');
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  // Update order with payment_intent_id
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      stripePaymentIntentId: session.payment_intent as string,
      status: 'PAID',
      paidAt: new Date()
    },
    include: { transaction: true }
  });

  console.log(`[WEBHOOK] Order ${orderId} marked as PAID`);

  // ❗ Record webhook event
  await prisma.webhookEvent.create({
    data: {
      stripeEventId: eventId,
      type: 'checkout.session.completed',
      status: 'PROCESSED'
    }
  });

  // Send notification
  try {
    await sendOrderNotification(order.id, order.userId, order.productId, order.amount);
  } catch (err) {
    console.error('[WEBHOOK] Notification failed:', err);
  }

  return NextResponse.json({ received: true, orderId: order.id });
}

// ❗ Handle payment_intent.succeeded (CRITICAL)
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent, eventId: string) {
  console.log(`[WEBHOOK] payment_intent.succeeded: ${paymentIntent.id}`);

  // Find order by payment_intent_id
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: { transaction: true }
  });

  if (!order) {
    console.error(`[WEBHOOK] Order not found for payment_intent: ${paymentIntent.id}`);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // ❗ Idempotency check
  if (order.status === 'PAID' && order.transaction?.status === 'COMPLETED') {
    console.log(`[WEBHOOK] Order ${order.id} already processed, skipping`);
    return NextResponse.json({ received: true, orderId: order.id, duplicate: true });
  }

  // ❗ Update Order + Transaction atomically
  await prisma.$transaction([
    // Update Order status
    prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date()
      }
    }),
    // Update Transaction status
    prisma.transaction.update({
      where: { orderId: order.id },
      data: {
        status: 'COMPLETED',
        stripePaymentIntentId: paymentIntent.id
      }
    })
  ]);

  console.log(`[WEBHOOK] Order ${order.id} & Transaction marked as COMPLETED`);

  return NextResponse.json({ received: true, orderId: order.id });
}

// ❗ Handle charge.refunded
async function handleChargeRefunded(charge: Stripe.Charge, eventId: string) {
  console.log(`[WEBHOOK] charge.refunded: ${charge.id}`);

  const paymentIntentId = charge.payment_intent as string;
  
  // Find order
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { transaction: true }
  });

  if (!order) {
    console.error(`[WEBHOOK] Order not found for charge: ${charge.id}`);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // ❗ Update Order + Transaction to REFUNDED
  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: 'REFUNDED' }
    }),
    prisma.transaction.update({
      where: { orderId: order.id },
      data: { status: 'REFUNDED' }
    })
  ]);

  console.log(`[WEBHOOK] Order ${order.id} refunded`);

  return NextResponse.json({ received: true, orderId: order.id });
}

// ❗ Handle payment_intent.payment_failed
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, eventId: string) {
  console.log(`[WEBHOOK] payment_intent.payment_failed: ${paymentIntent.id}`);

  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id }
  });

  if (!order) {
    console.error(`[WEBHOOK] Order not found for payment_intent: ${paymentIntent.id}`);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Update Order + Transaction to FAILED
  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' }
    }),
    prisma.transaction.update({
      where: { orderId: order.id },
      data: { status: 'FAILED' }
    })
  ]);

  console.log(`[WEBHOOK] Order ${order.id} payment failed`);

  return NextResponse.json({ received: true, orderId: order.id });
}
