import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - обновить адрес
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const addressId = resolvedParams.id;

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

    // Verify address belongs to user
    const existingAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress || existingAddress.userId !== userId) {
      return NextResponse.json(
        { error: 'Адрес не найден' },
        { status: 404 }
      );
    }

    // Use Prisma transaction for atomicity
    const address = await prisma.$transaction(async (tx) => {
      // If setting as default, unset other defaults
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      // Update address
      return tx.address.update({
        where: { id: addressId },
        data: {
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

    return NextResponse.json(address);
  } catch (error) {
    console.error('Ошибка обновления адреса:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления адреса' },
      { status: 500 }
    );
  }
}

// DELETE - удалить адрес
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const addressId = resolvedParams.id;

    const session = await auth();
    const userId = session?.user?.id ? String(session.user.id) : null;

    if (!userId) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    // Verify address belongs to user
    const existingAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress || existingAddress.userId !== userId) {
      return NextResponse.json(
        { error: 'Адрес не найден' },
        { status: 404 }
      );
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    return NextResponse.json({ message: 'Адрес удален' });
  } catch (error) {
    console.error('Ошибка удаления адреса:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления адреса' },
      { status: 500 }
    );
  }
}
