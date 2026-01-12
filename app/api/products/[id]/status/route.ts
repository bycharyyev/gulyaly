import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Helper function to extract params
async function getId(params: Promise<{ id: string }>): Promise<string> {
  const resolvedParams = await params;
  return resolvedParams.id;
}

// PATCH /api/products/[id]/status - обновить статус продукта
export async function PATCH(
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
    const { isActive } = body;
    
    const product = await prisma.product.update({
      where: { id },
      data: {
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        variants: true,
      },
    });
    
    return NextResponse.json(product);
  } catch (error) {
    console.error('Ошибка обновления статуса продукта:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления статуса продукта' },
      { status: 500 }
    );
  }
}