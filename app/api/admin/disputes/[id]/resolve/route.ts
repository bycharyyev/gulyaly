import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireAdmin, logSecurityEvent } from '@/lib/security';

// POST /admin/disputes/{id}/resolve - Admin resolves dispute
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authorization
    const adminCheck = await requireAdmin();
    if (adminCheck) return adminCheck;

    const session = await auth();
    const adminId = (session?.user as any)?.id;
    const disputeId = params.id;

    const { resolution, action } = await request.json();

    // Validation
    if (!resolution || !action) {
      return NextResponse.json({ 
        error: 'Укажите решение и действие' 
      }, { status: 400 });
    }

    if (!['REFUND', 'REJECT', 'PARTIAL_REFUND'].includes(action)) {
      return NextResponse.json({ 
        error: 'Неверное действие. Доступны: REFUND, REJECT, PARTIAL_REFUND' 
      }, { status: 400 });
    }

    // Get dispute
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          include: {
            transaction: true
          }
        }
      }
    });

    if (!dispute) {
      return NextResponse.json({ error: 'Спор не найден' }, { status: 404 });
    }

    if (dispute.status !== 'OPEN') {
      return NextResponse.json({ 
        error: `Спор уже обработан. Статус: ${dispute.status}` 
      }, { status: 400 });
    }

    // Update dispute and order based on action
    if (action === 'REFUND') {
      // Full refund - update order and transaction
      await prisma.$transaction([
        prisma.dispute.update({
          where: { id: disputeId },
          data: {
            status: 'RESOLVED',
            resolution,
            resolvedBy: adminId,
            resolvedAt: new Date()
          }
        }),
        prisma.order.update({
          where: { id: dispute.orderId },
          data: { status: 'REFUNDED' }
        }),
        prisma.transaction.update({
          where: { orderId: dispute.orderId },
          data: { status: 'REFUNDED' }
        })
      ]);
    } else if (action === 'REJECT') {
      // Reject dispute - order continues
      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'RESOLVED',
          resolution,
          resolvedBy: adminId,
          resolvedAt: new Date()
        }
      });
      
      // Restore order status
      await prisma.order.update({
        where: { id: dispute.orderId },
        data: { status: 'COMPLETED' }
      });
    } else if (action === 'PARTIAL_REFUND') {
      // Partial refund logic (would need Stripe API call)
      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'RESOLVED',
          resolution,
          resolvedBy: adminId,
          resolvedAt: new Date()
        }
      });
    }

    logSecurityEvent('api_error', {
      action: 'dispute_resolved',
      adminId,
      disputeId,
      orderId: dispute.orderId,
      resolutionAction: action
    });

    return NextResponse.json({
      success: true,
      message: `Спор разрешен: ${action}`
    }, { status: 200 });

  } catch (error) {
    console.error('Resolve dispute error:', error);
    logSecurityEvent('api_error', { 
      action: 'admin_resolve_dispute', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка разрешения спора' },
      { status: 500 }
    );
  }
}
