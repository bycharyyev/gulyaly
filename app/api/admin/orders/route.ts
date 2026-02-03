import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusNotification } from '@/lib/notifications';

// GET /api/admin/orders - получить все заказы (только для админа)
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status && status !== 'all' ? { status: status as any } : {};

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        product: {
          select: { id: true, name: true, description: true },
        },
        variant: {
          select: { id: true, name: true, description: true, price: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки заказов' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/orders - обновить статус заказа (только для админа)
export async function PUT(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId и status обязательны' }, { status: 400 });
    }

    const validStatuses = ['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Неверный статус' }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        product: {
          select: { id: true, name: true, description: true },
        },
        variant: {
          select: { id: true, name: true, description: true, price: true },
        },
      },
    });

    // Отправляем уведомление об изменении статуса
    await sendOrderStatusNotification(orderId, status);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Ошибка обновления заказа:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления заказа' },
      { status: 500 }
    );
  }
}
