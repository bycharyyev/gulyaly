import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent, checkRateLimit } from '@/lib/security';
import { validateSlug, sanitizeSlug } from '@/lib/security';

// GET /api/seller/stores - Get all stores owned by seller
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const user = session.user as any;
    const sellerId = user.id;

    // Verify seller role
    if (user.role !== 'SELLER') {
      logSecurityEvent('access_denied', { action: 'seller_get_stores', sellerId, reason: 'not_seller' });
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    if (user.sellerStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Продавец не одобрен' }, { status: 403 });
    }

    const stores = await prisma.store.findMany({
      where: { ownerId: sellerId },
      include: {
        products: {
          select: { id: true, name: true, isActive: true }
        },
        _count: {
          select: { products: true, reviews: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ stores }, { status: 200 });

  } catch (error) {
    console.error('Get seller stores error:', error);
    logSecurityEvent('api_error', {
      action: 'seller_get_stores',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Ошибка получения магазинов' },
      { status: 500 }
    );
  }
}

// POST /api/seller/stores - Create new store
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const user = session.user as any;
    const sellerId = user.id;

    // Verify seller role
    if (user.role !== 'SELLER') {
      logSecurityEvent('access_denied', { action: 'seller_create_store', sellerId, reason: 'not_seller' });
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    if (user.sellerStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Продавец не одобрен' }, { status: 403 });
    }

    // Rate limit: 5 stores per hour
    if (!checkRateLimit(`seller_create_store:${sellerId}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429 }
      );
    }

    const { name, slug, description, logo, banner } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({
        error: 'Укажите название и slug магазина'
      }, { status: 400 });
    }

    // Validate slug
    const sanitizedSlug = sanitizeSlug(slug);
    if (!validateSlug(sanitizedSlug)) {
      return NextResponse.json({
        error: 'Неверный формат slug. Используйте только буквы, цифры, дефисы и подчеркивания (2-50 символов)'
      }, { status: 400 });
    }

    // Check if slug is already taken
    const existingStore = await prisma.store.findUnique({
      where: { slug: sanitizedSlug }
    });

    if (existingStore) {
      return NextResponse.json({
        error: 'Магазин с таким slug уже существует'
      }, { status: 409 });
    }

    // Create store
    const store = await prisma.store.create({
      data: {
        name,
        slug: sanitizedSlug,
        description,
        logo,
        banner,
        ownerId: sellerId,
        isActive: true
      }
    });

    logSecurityEvent('api_error', {
      action: 'seller_create_store',
      sellerId,
      storeId: store.id
    });

    return NextResponse.json({
      success: true,
      store
    }, { status: 201 });

  } catch (error) {
    console.error('Create store error:', error);
    logSecurityEvent('api_error', {
      action: 'seller_create_store',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Ошибка создания магазина' },
      { status: 500 }
    );
  }
}
