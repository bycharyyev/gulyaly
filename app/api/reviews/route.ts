import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, logSecurityEvent } from '@/lib/security';

// POST /api/reviews - Create review
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      logSecurityEvent('access_denied', { action: 'create_review', reason: 'not_authenticated' });
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Rate limit: 10 reviews per hour
    if (!checkRateLimit(`create_review:${userId}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Слишком много попыток' },
        { status: 429 }
      );
    }

    const { orderId, rating, comment, images } = await request.json();

    // Validation
    if (!orderId || !rating) {
      return NextResponse.json({ 
        error: 'Укажите заказ и оценку' 
      }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ 
        error: 'Оценка должна быть от 1 до 5' 
      }, { status: 400 });
    }

    // ❗ Только если order.status == COMPLETED
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          select: {
            id: true,
            storeId: true
          }
        },
        review: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    // ❗ Проверка ownership
    if (order.userId !== userId) {
      logSecurityEvent('access_denied', { 
        action: 'create_review', 
        userId, 
        orderId,
        reason: 'not_order_owner' 
      });
      return NextResponse.json({ error: 'Это не ваш заказ' }, { status: 403 });
    }

    // ❗ Check order status
    if (order.status !== 'COMPLETED') {
      return NextResponse.json({ 
        error: 'Можно оставить отзыв только на завершенный заказ' 
      }, { status: 400 });
    }

    // ❗ Только один review на order
    if (order.review) {
      return NextResponse.json({ 
        error: 'Вы уже оставили отзыв на этот заказ' 
      }, { status: 400 });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        orderId,
        userId,
        productId: order.productId,
        storeId: order.product.storeId!,
        rating,
        comment: comment || null,
        images: images ? JSON.stringify(images) : null,
        isVerified: true  // Verified purchase
      }
    });

    return NextResponse.json({
      success: true,
      review
    }, { status: 201 });

  } catch (error) {
    console.error('Create review error:', error);
    logSecurityEvent('api_error', { 
      action: 'create_review', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка создания отзыва' },
      { status: 500 }
    );
  }
}

// GET /api/reviews - Get reviews
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const storeId = searchParams.get('storeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (productId) where.productId = productId;
    if (storeId) where.storeId = storeId;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),
      prisma.review.count({ where })
    ]);

    // Parse images JSON
    const formattedReviews = reviews.map(review => ({
      ...review,
      images: review.images ? (() => {
        try {
          return JSON.parse(review.images);
        } catch (e) {
          return review.images;
        }
      })() : null
    }));

    // Calculate average rating
    let avgRating = 0;
    if (total > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      avgRating = sum / reviews.length;
    }

    return NextResponse.json({
      reviews: formattedReviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        avgRating: parseFloat(avgRating.toFixed(1)),
        totalReviews: total
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения отзывов' },
      { status: 500 }
    );
  }
}
