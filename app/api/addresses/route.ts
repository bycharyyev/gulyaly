import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// GET - получить все адреса пользователя
export async function GET() {
  try {
    console.log(' [ADDRESSES-GET] Начало загрузки адресов');
    
    const session = await auth();
    const userId = session?.user?.id ? String(session.user.id) : null;
    console.log(' [ADDRESSES-GET] User ID:', userId);
    
    if (!userId) {
      console.log(' [ADDRESSES-GET] Нет сессии или user.id');
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const addresses = await prisma.$queryRaw`
      SELECT * FROM addresses
      WHERE userId = ${userId}
      ORDER BY isDefault DESC, createdAt DESC
    `;

    console.log(' [ADDRESSES-GET] Адреса загружены:', Array.isArray(addresses) ? addresses.length : 0);
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
    console.log(' [ADDRESSES-POST] Начало создания адреса');
    
    const session = await auth();
    const userId = session?.user?.id ? String(session.user.id) : null;
    console.log(' [ADDRESSES-POST] User ID:', userId);
    
    if (!userId) {
      console.log(' [ADDRESSES-POST] Нет сессии или user.id');
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const data = await request.json();
    console.log(' [ADDRESSES-POST] Данные:', data);
    
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

    if (isDefault) {
      await prisma.$queryRaw`
        UPDATE addresses
        SET isDefault = false
        WHERE userId = ${userId} AND isDefault = true
      `;
    }

    const result = await prisma.$queryRaw`
      INSERT INTO addresses (
        id, userId, title, street, house, apartment, entrance, floor, intercom, comment, isDefault, createdAt, updatedAt
      ) VALUES (
        ${randomUUID()}, ${userId}, ${title}, ${street}, ${house},
        ${apartment || null}, ${entrance || null}, ${floor || null}, ${intercom || null},
        ${comment || null}, ${isDefault || false}, datetime('now'), datetime('now')
      )
      RETURNING *
    `;

    const address = Array.isArray(result) ? result[0] : result;
    console.log(' [ADDRESSES-POST] Адрес создан:', address);
    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.log(' [ADDRESSES-POST] Ошибка создания адреса:', error);
    return NextResponse.json(
      { error: 'Ошибка создания адреса: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
