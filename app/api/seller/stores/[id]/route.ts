import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent } from '@/lib/security';
import { validateSlug, sanitizeSlug } from '@/lib/security';

// PATCH /api/seller/stores/[id] - Update store
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const user = session.user as any;
    const sellerId = user.id;
    const storeId = params.id;

    // Verify seller role
    if (user.role !== 'SELLER') {
      logSecurityEvent('access_denied', { action: 'seller_update_store', sellerId, reason: 'not_seller' });
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    if (user.sellerStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Продавец не одобрен' }, { status: 403 });
    }

    // Get store and verify ownership
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { ownerId: true, slug: true }
    });

    if (!store) {
      return NextResponse.json({ error: 'Магазин не найден' }, { status: 404 });
    }

    // ❗ Hard ownership check
    if (store.ownerId !== sellerId) {
      logSecurityEvent('access_denied', {
        action: 'seller_update_store',
        sellerId,
        storeId,
        reason: 'not_owner'
      });
      return NextResponse.json({ error: 'Это не ваш магазин' }, { status: 403 });
    }

    const { name, slug, description, logo, banner, isActive } = await request.json();

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (logo !== undefined) updateData.logo = logo;
    if (banner !== undefined) updateData.banner = banner;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle slug change
    if (slug !== undefined) {
      const sanitizedSlug = sanitizeSlug(slug);
      if (!validateSlug(sanitizedSlug)) {
        return NextResponse.json({
          error: 'Неверный формат slug'
        }, { status: 400 });
      }

      // Check if new slug is taken by another store
      if (sanitizedSlug !== store.slug) {
        const existingStore = await prisma.store.findUnique({
          where: { slug: sanitizedSlug }
        });
        if (existingStore) {
          return NextResponse.json({
            error: 'Магазин с таким slug уже существует'
          }, { status: 409 });
        }
        updateData.slug = sanitizedSlug;
      }
    }

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      store: updatedStore
    }, { status: 200 });

  } catch (error) {
    console.error('Update store error:', error);
    logSecurityEvent('api_error', {
      action: 'seller_update_store',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Ошибка обновления магазина' },
      { status: 500 }
    );
  }
}

// DELETE /api/seller/stores/[id] - Delete store
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const user = session.user as any;
    const sellerId = user.id;
    const storeId = params.id;

    // Verify seller role
    if (user.role !== 'SELLER') {
      logSecurityEvent('access_denied', { action: 'seller_delete_store', sellerId, reason: 'not_seller' });
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    if (user.sellerStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Продавец не одобрен' }, { status: 403 });
    }

    // Get store with orders check
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        products: {
          include: {
            orders: {
              where: {
                status: {
                  in: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED']
                }
              },
              select: { id: true },
              take: 1
            }
          }
        }
      }
    });

    if (!store) {
      return NextResponse.json({ error: 'Магазин не найден' }, { status: 404 });
    }

    // ❗ Hard ownership check
    if (store.ownerId !== sellerId) {
      logSecurityEvent('access_denied', {
        action: 'seller_delete_store',
        sellerId,
        storeId,
        reason: 'not_owner'
      });
      return NextResponse.json({ error: 'Это не ваш магазин' }, { status: 403 });
    }

    // ❗ Check for active orders
    const hasActiveOrders = store.products.some(p => p.orders.length > 0);
    if (hasActiveOrders) {
      return NextResponse.json({
        error: 'Нельзя удалить магазин с активными заказами'
      }, { status: 400 });
    }

    // Delete store (cascade will handle products)
    await prisma.store.delete({
      where: { id: storeId }
    });

    logSecurityEvent('api_error', {
      action: 'seller_delete_store',
      sellerId,
      storeId
    });

    return NextResponse.json({
      success: true,
      message: 'Магазин удален'
    }, { status: 200 });

  } catch (error) {
    console.error('Delete store error:', error);
    logSecurityEvent('api_error', {
      action: 'seller_delete_store',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Ошибка удаления магазина' },
      { status: 500 }
    );
  }
}
