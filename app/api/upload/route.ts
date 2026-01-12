import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// POST /api/upload - загрузка файла на локальное хранилище
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    // Проверка размера файла (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Файл слишком большой. Максимум 5MB' }, { status: 400 });
    }

    // Проверка типа файла (только изображения и PDF)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Разрешены только изображения (JPG, PNG, GIF, WebP) и PDF' }, { status: 400 });
    }

    // Генерируем уникальное имя файла
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    
    // Создаем директорию для загрузок
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Директория уже существует
    }
    
    // Сохраняем файл
    const filePath = path.join(uploadDir, uniqueFileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    
    // URL для доступа к файлу
    const fileUrl = `/uploads/products/${uniqueFileName}`;
    
    return NextResponse.json({ 
      url: fileUrl,
      name: file.name,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки файла' },
      { status: 500 }
    );
  }
}