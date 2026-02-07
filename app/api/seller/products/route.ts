import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent, checkRateLimit } from '@/lib/security';

// GET /seller/products - Мои товары
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    // Получить товары seller'а
    const where: any = {
      store: {
        ownerId: userId
      }
    };

    if (storeId) {
      where.storeId = storeId;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        variants: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ products }, { status: 200 });

  } catch (error) {
    console.error('Get seller products error:', error);
    logSecurityEvent('api_error', { 
      action: 'seller_get_products', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка получения товаров' },
      { status: 500 }
    );
  }
}

// POST /seller/products - Создать товар
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Rate limit: 20 products per hour
    if (!checkRateLimit(`seller_create_product:${userId}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429 }
      );
    }

    const { storeId, name, description, image, variants } = await request.json();

    if (!storeId || !name) {
      return NextResponse.json({ 
        error: 'Укажите магазин и название товара' 
      }, { status: 400 });
    }

    if (!variants || variants.length === 0) {
      return NextResponse.json({ 
        error: 'Добавьте хотя бы один вариант товара' 
      }, { status: 400 });
    }

    // ❗ seller owns store check
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { ownerId: true, isActive: true }
    });

    if (!store || store.ownerId !== userId) {
      logSecurityEvent('access_denied', { 
        action: 'seller_create_product', 
        userId, 
        storeId,
        reason: 'not_owner' 
      });
      return NextResponse.json({ error: 'Это не ваш магазин' }, { status: 403 });
    }

    if (!store.isActive) {
      return NextResponse.json({ error: 'Магазин неактивен' }, { status: 400 });
    }

    // ❗ Product goes to PENDING_APPROVAL - seller cannot self-activate
    const product = await prisma.product.create({
      data: {
        storeId,
        name,
        description,
        image,
        isActive: false,
        status: 'PENDING_APPROVAL',
        variants: {
          create: variants.map((v: any) => ({
            name: v.name,
            price: v.price,
            description: v.description
          }))
        }
      },
      include: {
        variants: true
      }
    });

    logSecurityEvent('api_error', { 
      action: 'seller_create_product', 
      userId,
      productId: product.id,
      storeId
    });

    return NextResponse.json({
      success: true,
      product
    }, { status: 201 });

  } catch (error) {
    console.error('Create product error:', error);
    logSecurityEvent('api_error', { 
      action: 'seller_create_product', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка создания товара' },
      { status: 500 }
    );
  }
}
