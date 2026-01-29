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

    let whereClause = '';
    const params: any[] = [];

    if (status && status !== 'all') {
      whereClause = 'WHERE o.status = ?';
      params.push(status);
    }

    const orders = await prisma.$queryRawUnsafe(`
      SELECT o.*, u.name as userName, u.email as userEmail, u.phone as userPhone,
             p.name as productName, p.description as productDescription,
             v.name as variantName, v.description as variantDescription, v.price
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN products p ON o.productId = p.id
      LEFT JOIN product_variants v ON o.variantId = v.id
      ${whereClause}
      ORDER BY o.createdAt DESC
    `, ...params);

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

    const result = await prisma.$queryRawUnsafe(`
      UPDATE orders 
      SET status = ?, updatedAt = datetime('now')
      WHERE id = ?
      RETURNING *
    `, status, orderId);

    const updatedOrder = Array.isArray(result) ? result[0] : result;

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
