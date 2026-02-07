import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent } from '@/lib/security';

// PATCH /seller/products/[id] - Редактировать товар
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const productId = params.id;

    const { name, description, image, storeId, variants } = await request.json();

    // Get product with store owner check
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          select: { ownerId: true }
        },
        orders: {
          select: { id: true },
          take: 1
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    // ❗ только владелец
    if (!product.store || product.store.ownerId !== userId) {
      logSecurityEvent('access_denied', { 
        action: 'seller_update_product', 
        userId, 
        productId,
        reason: 'not_owner' 
      });
      return NextResponse.json({ error: 'Это не ваш товар' }, { status: 403 });
    }

    // ❗ нельзя редактировать, если ORDER EXISTS
    if (product.orders.length > 0 && variants) {
      return NextResponse.json({ 
        error: 'Нельзя изменять варианты товара с существующими заказами' 
      }, { status: 400 });
    }

    // ❗ Seller CANNOT change isActive or status - only admin can approve
    // Update product
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (storeId !== undefined) {
      // Verify seller owns the new store too
      const newStore = await prisma.store.findUnique({
        where: { id: storeId },
        select: { ownerId: true }
      });
      if (!newStore || newStore.ownerId !== userId) {
        return NextResponse.json({ error: 'Нельзя перенести товар в чужой магазин' }, { status: 403 });
      }
      updateData.storeId = storeId;
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        variants: true
      }
    });

    // Update variants if provided and no orders exist
    if (variants && product.orders.length === 0) {
      // Delete existing variants
      await prisma.productVariant.deleteMany({
        where: { productId }
      });

      // Create new variants
      await prisma.productVariant.createMany({
        data: variants.map((v: any) => ({
          productId,
          name: v.name,
          price: v.price,
          description: v.description
        }))
      });
    }

    return NextResponse.json({
      success: true,
      product: updatedProduct
    }, { status: 200 });

  } catch (error) {
    console.error('Update product error:', error);
    logSecurityEvent('api_error', { 
      action: 'seller_update_product', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка обновления товара' },
      { status: 500 }
    );
  }
}

// DELETE /seller/products/[id] - SOFT DELETE
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const productId = params.id;

    // Get product with orders check
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          select: { ownerId: true }
        },
        orders: {
          where: {
            status: {
              in: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED']
            }
          },
          select: { id: true }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    // ❗ только владелец
    if (!product.store || product.store.ownerId !== userId) {
      logSecurityEvent('access_denied', { 
        action: 'seller_delete_product', 
        userId, 
        productId,
        reason: 'not_owner' 
      });
      return NextResponse.json({ error: 'Это не ваш товар' }, { status: 403 });
    }

    // ❗ нельзя удалить товар с активными заказами
    if (product.orders.length > 0) {
      return NextResponse.json({ 
        error: 'Нельзя удалить товар с активными заказами. Деактивируйте товар вместо удаления.' 
      }, { status: 400 });
    }

    // ❗ SOFT DELETE - просто деактивируем
    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false }
    });

    logSecurityEvent('api_error', { 
      action: 'seller_delete_product', 
      userId,
      productId
    });

    return NextResponse.json({
      success: true,
      message: 'Товар деактивирован'
    }, { status: 200 });

  } catch (error) {
    console.error('Delete product error:', error);
    logSecurityEvent('api_error', { 
      action: 'seller_delete_product', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка удаления товара' },
      { status: 500 }
    );
  }
}
