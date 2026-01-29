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
    
    console.log('🔍 [ADDRESSES-PUT] Начало обновления адреса:', addressId);
    
    const session = await auth();
    const userId = session?.user?.id ? String(session.user.id) : null;
    console.log('🔍 [ADDRESSES-PUT] Сессия:', userId);
    console.log('🔍 [ADDRESSES-PUT] Params:', { id: addressId, userId });
    
    if (!userId) {
      console.log('❌ [ADDRESSES-PUT] Нет сессии');
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const data = await request.json();
    console.log('🔍 [ADDRESSES-PUT] Данные:', data);

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

    const existingAddress = await prisma.$queryRawUnsafe(
      `SELECT id, userId FROM addresses WHERE id = ? AND userId = ?`,
      addressId,
      userId
    );

    console.log('🔍 [ADDRESSES-PUT] existingAddress:', existingAddress);
    console.log('🔍 [ADDRESSES-PUT] Query params:', { 
      addressId: addressId, 
      sessionUserId: userId,
      addressIdType: typeof addressId,
      userIdType: typeof userId
    });
    
    // Debug: check what addresses exist for this user
    const allUserAddresses = await prisma.$queryRawUnsafe(
      'SELECT id, title FROM addresses WHERE userId = ?',
      userId
    );
    console.log('🔍 [ADDRESSES-PUT] All user addresses:', allUserAddresses);

    const existingRows = Array.isArray(existingAddress)
      ? existingAddress
      : existingAddress
        ? [existingAddress]
        : [];

    if (existingRows.length === 0) {
      console.log('❌ [ADDRESSES-PUT] Адрес не найден');
      return NextResponse.json(
        { 
          error: 'Адрес не найден',
          debug: {
            addressId: addressId,
            sessionUserId: userId,
            addressIdType: typeof addressId,
            userIdType: typeof userId,
            existingAddress: existingAddress,
            allUserAddresses: allUserAddresses
          }
        },
        { status: 404 }
      );
    }

    if (isDefault) {
      await prisma.$queryRawUnsafe(
        `UPDATE addresses SET isDefault = false WHERE userId = ? AND id != ? AND isDefault = true`,
        userId,
        addressId
      );
    }

    const result = await prisma.$queryRawUnsafe(
      `UPDATE addresses SET title = ?, street = ?, house = ?, apartment = ?, entrance = ?, floor = ?, intercom = ?, comment = ?, isDefault = ?, updatedAt = datetime('now') WHERE id = ? AND userId = ? RETURNING *`,
      title,
      street,
      house,
      apartment || null,
      entrance || null,
      floor || null,
      intercom || null,
      comment || null,
      isDefault || false,
      addressId,
      userId
    );

    const address = Array.isArray(result) ? result[0] : result;
    console.log('✅ [ADDRESSES-PUT] Адрес обновлен:', address);

    return NextResponse.json(address);
  } catch (error) {
    console.error('💥 [ADDRESSES-PUT] Ошибка обновления адреса:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления адреса: ' + (error instanceof Error ? error.message : String(error)) },
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
    
    console.log('🔍 [ADDRESSES-DELETE] Начало удаления адреса:', addressId);
    
    const session = await auth();
    const userId = session?.user?.id ? String(session.user.id) : null;
    console.log('🔍 [ADDRESSES-DELETE] Сессия:', userId);
    console.log('🔍 [ADDRESSES-DELETE] Params:', { id: addressId, userId });
    
    if (!userId) {
      console.log('❌ [ADDRESSES-DELETE] Нет сессии');
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const existingAddress = await prisma.$queryRawUnsafe(
      `SELECT id, userId FROM addresses WHERE id = ? AND userId = ?`,
      addressId,
      userId
    );

    console.log('🔍 [ADDRESSES-DELETE] existingAddress:', existingAddress);
    console.log('🔍 [ADDRESSES-DELETE] Query params:', { 
      addressId: addressId, 
      sessionUserId: userId,
      addressIdType: typeof addressId,
      userIdType: typeof userId
    });
    
    // Debug: check what addresses exist for this user
    const allUserAddresses = await prisma.$queryRawUnsafe(
      'SELECT id, title FROM addresses WHERE userId = ?',
      userId
    );
    console.log('🔍 [ADDRESSES-DELETE] All user addresses:', allUserAddresses);

    const existingRows = Array.isArray(existingAddress)
      ? existingAddress
      : existingAddress
        ? [existingAddress]
        : [];

    if (existingRows.length === 0) {
      console.log('❌ [ADDRESSES-DELETE] Адрес не найден');
      return NextResponse.json(
        { 
          error: 'Адрес не найден',
          debug: {
            addressId: addressId,
            sessionUserId: userId,
            addressIdType: typeof addressId,
            userIdType: typeof userId,
            existingAddress: existingAddress,
            allUserAddresses: allUserAddresses
          }
        },
        { status: 404 }
      );
    }

    await prisma.$queryRawUnsafe(
      `DELETE FROM addresses WHERE id = ?`,
      addressId
    );

    console.log('✅ [ADDRESSES-DELETE] Адрес удален');

    return NextResponse.json({ message: 'Адрес удален' });
  } catch (error) {
    console.error('💥 [ADDRESSES-DELETE] Ошибка удаления адреса:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления адреса: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
