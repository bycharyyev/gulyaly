import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/footer - Получить настройки футера
export async function GET() {
  try {
    let settings = await prisma.footerSettings.findFirst();

    // Если настроек нет, создаем дефолтные
    if (!settings) {
      settings = await prisma.footerSettings.create({
        data: {
          companyName: 'Gulyaly',
          email: 'info@gulyaly.com',
          phone: '+7 (999) 123-45-67',
          description: 'Цифровой магазин. Просто. Быстро. Красиво.',
          year: new Date().getFullYear(),
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching footer settings:', error);
    return NextResponse.json(
      { error: 'Ошибка получения настроек' },
      { status: 500 }
    );
  }
}

// PUT /api/footer - Обновить настройки футера (только админ)
export async function PUT(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const body = await request.json();
    const {
      companyName,
      email,
      phone,
      telegram,
      whatsapp,
      vk,
      instagram,
      description,
      year,
    } = body;

    // Find existing settings
    let existing = await prisma.footerSettings.findFirst();
    
    let settings;
    if (existing) {
      settings = await prisma.footerSettings.update({
        where: { id: existing.id },
        data: {
          companyName,
          email,
          phone,
          telegram,
          whatsapp,
          vk,
          instagram,
          description,
          year: year || new Date().getFullYear(),
        },
      });
    } else {
      settings = await prisma.footerSettings.create({
        data: {
          companyName,
          email,
          phone,
          telegram,
          whatsapp,
          vk,
          instagram,
          description,
          year: year || new Date().getFullYear(),
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating footer settings:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления настроек' },
      { status: 500 }
    );
  }
}
