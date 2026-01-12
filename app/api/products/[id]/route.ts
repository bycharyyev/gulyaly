import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper function to extract params
async function getId(params: Promise<{ id: string }>): Promise<string> {
  const resolvedParams = await params;
  return resolvedParams.id;
}

// GET /api/products/[id] - получить один продукт по ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
      include: { variants: true }
    });

    if (!product || product.isActive === false) {
      return NextResponse.json(
        { error: 'Продукт не найден или неактивен' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Ошибка получения продукта:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки продукта' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const id = await getId(params);
    await prisma.product.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления продукта:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления продукта' },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - обновить продукт
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }
    
    const id = await getId(params);
    const body = await request.json();
    const { name, description, image, images, variants, isActive } = body;
    
    // Delete existing variants
    await prisma.productVariant.deleteMany({
      where: { productId: id }
    });
    
    // Update product with new variants
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        image,
        images: images || [],
        isActive: isActive !== undefined ? isActive : true,
        variants: {
          create: (variants || []).map((v: any) => ({
            name: v.name,
            price: v.price,
            description: v.description || ''
          }))
        }
      },
      include: {
        variants: true
      }
    });
    
    return NextResponse.json(product);
  } catch (error) {
    console.error('Ошибка обновления продукта:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления продукта' },
      { status: 500 }
    );
  }
}