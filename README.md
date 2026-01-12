# 🌸 Gulyaly Digital Shop

> Современный, быстрый и красивый цифровой магазин с минималистичным дизайном в стиле Apple

## ✨ Особенности

- 🎨 **Современный дизайн** — Минималистичный интерфейс вдохновлённый Apple
- ⚡ **Молниеносная скорость** — Next.js 14+ с App Router и SSR
- 🌙 **Dark Mode** — Полная поддержка тёмной темы
- 📱 **Mobile-First** — Адаптивный дизайн для всех устройств
- 🛍️ **Прямая покупка** — Без корзины, оплата в 1 клик
- 🎯 **Варианты продукта** — Гибкая система вариантов (1 роза, 10 роз, 50 роз)
- 👨‍💼 **Админ-панель** — Полное управление продуктами, заказами и пользователями
- 🔒 **Type-Safe** — TypeScript для надёжности кода
- 🗄️ **PostgreSQL** — Надёжная база данных с Prisma ORM

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- PostgreSQL 14+
- npm или yarn

### Установка

1. **Клонируйте репозиторий**
```bash
git clone <repo-url>
cd codeakgus
```

2. **Установите зависимости**
```bash
npm install
```

3. **Настройте базу данных**

Создайте PostgreSQL базу:
```sql
CREATE DATABASE gulyaly_shop;
```

Обновите `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/gulyaly_shop?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

4. **Примените схему и заполните данными**
```bash
npm run db:push
## 🅿️ Быстрый старт (БЕЗ базы данных)

Сайт работает ДАЖЕ БЕЗ PostgreSQL! Используется mock-данные по умолчанию:

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) – сайт работает! 🎉

## 💾 Полная настройка (с PostgreSQL)

1. **Установите PostgreSQL**
   - Скачайте: https://www.postgresql.org/download/
   - Создайте базу данных `gulyaly_shop`

2. **Клонируйте репозиторий**
```bash
git clone https://github.com/yourusername/gulyaly-shop.git
cd gulyaly-shop
```

3. **Установите зависимости**
```bash
npm install
```

4. **Настройте переменные окружения**

Отредактируйте `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gulyaly_shop?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="ваш-секретный-ключ"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Stripe (опционально)
STRIPE_PUBLIC_KEY="pk_test_your_key"
STRIPE_SECRET_KEY="sk_test_your_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
```

5. **Настройте базу данных**
```bash
npm run db:generate  # Генерация Prisma Client
npm run db:push      # Применить схему БД
npm run db:seed      # Заполнить тестовыми данными
```

6. **Запустите проект**
```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) 🎉

## 📦 Тестовые аккаунты

- **Админ:** `admin@gulyaly.com` / `password123`
- **Пользователь:** `user@example.com` / `password123`

## 🏗️ Структура проекта

```
├── app/
│   ├── (client)/          # Клиентские страницы
│   │   ├── page.tsx       # Главная
│   │   ├── product/       # Страница продукта
│   │   └── profile/       # Профиль
│   ├── admin/             # Админ-панель
│   │   ├── page.tsx       # Продукты
│   │   ├── orders/        # Заказы
│   │   ├── users/         # Пользователи
│   │   └── support/       # Поддержка
│   └── api/               # API routes
├── components/            # React компоненты
│   ├── Header.tsx
│   └── ProductCard.tsx
├── lib/                   # Утилиты
│   └── prisma.ts         # Prisma client
├── types/                 # TypeScript типы
│   └── index.ts
└── prisma/               # База данных
    ├── schema.prisma     # Схема БД
    └── seed.ts           # Тестовые данные
```

## 🎨 Технологии

- **Frontend:** Next.js 14+, React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (планируется)
- **Payments:** Stripe (планируется)

## 📝 Scripts

```bash
npm run dev          # Запуск dev сервера
npm run build        # Production build
npm run start        # Запуск production
npm run lint         # ESLint
npm run db:generate  # Генерация Prisma Client
npm run db:push      # Применить схему БД
npm run db:seed      # Заполнить тестовыми данными
```

## 🔜 Roadmap

- [x] ✅ Next.js 14+ setup
- [x] ✅ Современный Apple-style дизайн
- [x] ✅ PostgreSQL + Prisma ORM
- [x] ✅ NextAuth.js авторизация
- [x] ✅ API routes (Products, Orders)
- [x] ✅ Admin panel
- [x] ✅ Product variants system
- [x] ✅ Stripe Checkout integration
- [x] ✅ Stripe Webhooks
- [x] ✅ Rate limiting
- [ ] Загрузка изображений (через Cloudinary/S3)
- [ ] Email уведомления (через Resend/SendGrid)
- [ ] Unit тесты (Jest + Testing Library)
- [ ] Docker контейнеризация

## 📄 Лицензия

MIT

## 🤝 Контакты

Сайт: [gulyaly.com](https://gulyaly.com)

---

**Сделано с ❤️ используя Next.js и Tailwind CSS**
