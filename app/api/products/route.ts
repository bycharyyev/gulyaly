import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/products - получить все активные продукты
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        variants: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(products);
  } catch (error) {
    console.error('Ошибка получения продуктов:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки продуктов' },
      { status: 500 }
    );
  }
}

// POST /api/products - создать новый продукт (только для админа)
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    // Проверка админских прав
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, description, image, images, variants } = body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        image,
        images: images || [],
        isActive: true,
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
    console.error('Ошибка создания продукта:', error);
    return NextResponse.json(
      { error: 'Ошибка создания продукта' },
      { status: 500 }
    );
  }
}
