import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - получить все адреса пользователя
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id ? String(session.user.id) : null;

    if (!userId) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(addresses);
  } catch (error) {
    console.error('Ошибка получения адресов:', error);
    return NextResponse.json(
      { error: 'Ошибка получения адресов' },
      { status: 500 }
    );
  }
}

// POST - создать новый адрес
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? String(session.user.id) : null;

    if (!userId) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const {
      title,
      street,
      house,
      apartment,
      entrance,
      floor,
      intercom,
      comment,
      isDefault
    } = data;

    // Use Prisma transaction for atomicity
    const address = await prisma.$transaction(async (tx) => {
      // If setting as default, unset other defaults
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Create new address
      return tx.address.create({
        data: {
          userId,
          title,
          street,
          house,
          apartment,
          entrance,
          floor,
          intercom,
          comment,
          isDefault: isDefault || false,
        },
      });
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания адреса:', error);
    return NextResponse.json(
      { error: 'Ошибка создания адреса' },
      { status: 500 }
    );
  }
}
