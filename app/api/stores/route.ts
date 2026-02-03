import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/security';
import { validateSlug, sanitizeSlug } from '@/lib/security';

// GET /api/stores - Get all stores
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const stores = await prisma.store.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}

// POST /api/stores - Create new store (admin only)
export async function POST(request: NextRequest) {
  const adminError = await requireAdmin();
  if (adminError) {
    return adminError;
  }

  try {
    const body = await request.json();
    const { name, slug, description, logo, banner } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Validate and sanitize slug
    const sanitizedSlug = sanitizeSlug(slug);
    if (!validateSlug(sanitizedSlug)) {
      return NextResponse.json(
        { error: 'Invalid slug. Use only letters, numbers, hyphens, and underscores (2-50 chars)' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingStore = await prisma.store.findUnique({
      where: { slug: sanitizedSlug },
    });

    if (existingStore) {
      return NextResponse.json(
        { error: 'Store with this slug already exists' },
        { status: 400 }
      );
    }

    const store = await prisma.store.create({
      data: {
        name,
        slug: sanitizedSlug,
        description,
        logo,
        banner,
        isActive: true,
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json(
      { error: 'Failed to create store' },
      { status: 500 }
    );
  }
}
