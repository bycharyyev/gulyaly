import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/footer - Получить настройки футера
export async function GET() {
  try {
    let settings = await prisma.$queryRawUnsafe(`SELECT * FROM footer_settings LIMIT 1`);
    
    // Если настроек нет, создаем дефолтные
    if (!settings || (Array.isArray(settings) && settings.length === 0)) {
      settings = await prisma.$queryRawUnsafe(`
        INSERT INTO footer_settings (id, companyName, email, phone, description, year, createdAt, updatedAt)
        VALUES (cuid(), 'Gulyaly', 'info@gulyaly.com', '+7 (999) 123-45-67', 'Цифровой магазин. Просто. Быстро. Красиво.', ${new Date().getFullYear()}, datetime('now'), datetime('now'))
        RETURNING *
      `);
    }

    const result = Array.isArray(settings) ? settings[0] : settings;
    return NextResponse.json(result);
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
    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM footer_settings LIMIT 1`);
    
    let settings;
    if (existing && (!Array.isArray(existing) || existing.length > 0)) {
      const existingRecord = Array.isArray(existing) ? existing[0] : existing;
      const existingId = (existingRecord as any).id;
      settings = await prisma.$queryRawUnsafe(`
        UPDATE footer_settings 
        SET companyName = ?, email = ?, phone = ?, telegram = ?, whatsapp = ?, vk = ?, instagram = ?, description = ?, year = ?, updatedAt = datetime('now')
        WHERE id = ?
        RETURNING *
      `, companyName, email, phone, telegram || null, whatsapp || null, vk || null, instagram || null, description, parseInt(year) || new Date().getFullYear(), existingId);
    } else {
      settings = await prisma.$queryRawUnsafe(`
        INSERT INTO footer_settings (id, companyName, email, phone, telegram, whatsapp, vk, instagram, description, year, createdAt, updatedAt)
        VALUES (cuid(), ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        RETURNING *
      `, companyName, email, phone, telegram || null, whatsapp || null, vk || null, instagram || null, description, parseInt(year) || new Date().getFullYear());
    }

    const result = Array.isArray(settings) ? settings[0] : settings;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating footer settings:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления настроек' },
      { status: 500 }
    );
  }
}
