import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireAdmin, logSecurityEvent } from '@/lib/security';

// ❗ GET /admin/sellers - Список заявок с фильтрами
export async function GET(request: Request) {
  try {
    // Check admin authorization
    const adminCheck = await requireAdmin();
    if (adminCheck) return adminCheck; // Return error response if not admin

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build query filters
    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    // Get applications with pagination
    const [applications, total] = await Promise.all([
      prisma.sellerApplication.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              sellerStatus: true,
              createdAt: true,
            }
          }
        },
        orderBy: [
          { status: 'asc' }, // PENDING first
          { createdAt: 'desc' }
        ],
        take: limit,
        skip
      }),
      prisma.sellerApplication.count({ where })
    ]);

    // Parse documents JSON
    const formattedApplications = applications.map(app => ({
      ...app,
      documents: app.documents ? (() => {
        try {
          return JSON.parse(app.documents);
        } catch (e) {
          return app.documents;
        }
      })() : null
    }));

    return NextResponse.json({
      applications: formattedApplications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        pending: await prisma.sellerApplication.count({ where: { status: 'PENDING' } }),
        approved: await prisma.sellerApplication.count({ where: { status: 'APPROVED' } }),
        rejected: await prisma.sellerApplication.count({ where: { status: 'REJECTED' } })
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Admin sellers list error:', error);
    logSecurityEvent('api_error', { 
      action: 'admin_sellers_list', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Ошибка получения списка заявок' },
      { status: 500 }
    );
  }
}
