import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/security';
import { validateSlug, sanitizeSlug } from '@/lib/security';

// GET /api/stores/[id] - Get single store
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    );
  }
}

// PUT /api/stores/[id] - Update store (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminError = await requireAdmin();
  if (adminError) {
    return adminError;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, slug, description, logo, banner, isActive } = body;

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { id },
    });

    if (!existingStore) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Validate and sanitize slug if provided
    if (slug && slug !== existingStore.slug) {
      const sanitizedSlug = sanitizeSlug(slug);
      if (!validateSlug(sanitizedSlug)) {
        return NextResponse.json(
          { error: 'Invalid slug. Use only letters, numbers, hyphens, and underscores (2-50 chars)' },
          { status: 400 }
        );
      }

      // Check if new slug already exists
      const slugExists = await prisma.store.findFirst({
        where: {
          slug: sanitizedSlug,
          id: { not: id },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'Store with this slug already exists' },
          { status: 400 }
        );
      }

      // Update with new slug
      await prisma.store.update({
        where: { id },
        data: {
          name,
          slug: sanitizedSlug,
          description,
          logo,
          banner,
          isActive,
        },
      });

      const updatedStore = await prisma.store.findUnique({
        where: { id },
      });

      return NextResponse.json(updatedStore);
    }

    // Update without slug change
    const store = await prisma.store.update({
      where: { id },
      data: {
        name,
        description,
        logo,
        banner,
        isActive,
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    console.error('Error updating store:', error);
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    );
  }
}

// DELETE /api/stores/[id] - Delete store (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminError = await requireAdmin();
  if (adminError) {
    return adminError;
  }

  try {
    const { id } = await params;

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existingStore) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Check if store has products
    if (existingStore._count.products > 0) {
      return NextResponse.json(
        { error: 'Cannot delete store with products. Remove or reassign products first.' },
        { status: 400 }
      );
    }

    await prisma.store.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      { error: 'Failed to delete store' },
      { status: 500 }
    );
  }
}
