# Gulyaly - Digital Products E-commerce Store

A modern full-stack e-commerce application for selling digital products, built with Next.js 16, Prisma, and NextAuth.

## Project Overview

**Gulyaly** is a digital products store that enables users to:
- Browse products with multiple variants (different options/pricing)
- Register and authenticate via phone (OTP SMS) or email
- Place orders with Stripe payment integration
- Manage their profile and order history
- Contact support via real-time chat

## Tech Stack

- **Framework:** Next.js 16.1.1 (App Router)
- **Database:** SQLite with Prisma ORM
- **Authentication:** NextAuth v5 (Credentials + OTP via SMS)
- **Payments:** Stripe Checkout
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod validation
- **SMS Gateway:** Custom SMS integration ( ibnux.net )

## Project Structure

```
codeakgus/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard routes
│   │   ├── orders/        # Order management
│   │   ├── support/       # Support chat admin panel
│   │   ├── users/         # User management
│   │   ├── status/        # System status
│   │   └── page.tsx       # Product management
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── checkout/      # Stripe checkout
│   │   ├── orders/        # Order management
│   │   ├── products/      # Product CRUD
│   │   ├── support/       # Support chat system
│   │   └── webhooks/      # Stripe webhooks
│   ├── login/             # Login pages
│   ├── profile/           # User profile & orders
│   └── support/           # Customer support
├── components/            # React components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ProductCard.tsx
│   ├── SupportChat.tsx
│   ├── AddressManager.tsx
│   └── admin/             # Admin components
├── lib/                   # Utilities & configurations
│   ├── auth.ts            # NextAuth configuration
│   ├── prisma.ts          # Prisma client
│   ├── stripe.ts          # Stripe client
│   ├── sms.ts             # SMS gateway
│   └── security.ts        # Rate limiting, security
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding
├── types/                 # TypeScript definitions
└── scripts/               # Utility scripts
```

---

## ✅ What's Implemented (Complete)

### Core Features

| Feature | Status | Description |
|---------|--------|-------------|
| **User Authentication** | ✅ Done | NextAuth v5 with credentials and phone OTP |
| **Phone OTP Verification** | ✅ Done | SMS-based 2FA with 6-digit codes |
| **Product Catalog** | ✅ Done | Products with variants (options & pricing) |
| **Product Management** | ✅ Done | Full CRUD for admins |
| **Order System** | ✅ Done | Order creation, history, status tracking |
| **Stripe Integration** | ✅ Done | Checkout sessions, webhook processing |
| **User Profile** | ✅ Done | Name, phone, address management |
| **Address Management** | ✅ Done | Multiple addresses per user |
| **Support Chat** | ✅ Done | Real-time messaging with admin |
| **Admin Dashboard** | ✅ Done | Products, users, support management |
| **Dark Mode** | ✅ Done | Full theme support |
| **Mobile Responsive** | ✅ Done | Mobile-first design |
| **Rate Limiting** | ✅ Done | Security against brute force |
| **Security Headers** | ✅ Done | XSS, CORS, clickjacking protection |

### Database Models

- **User** - Authentication, profile, roles (USER/ADMIN)
- **Product** - Product information with images
- **ProductVariant** - Price variants (size, options, etc.)
- **Order** - Order tracking with status
- **SupportMessage** - Chat messages with attachments
- **Address** - User delivery addresses
- **FooterSettings** - Configurable footer content
- **SMSSettings** - SMS gateway configuration
- **SMSLog** - SMS sending logs

### API Endpoints

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/auth/[...nextauth]` | GET/POST | ✅ Auth handlers |
| `/api/auth/register` | POST | ✅ User registration |
| `/api/auth/otp/send` | POST | ✅ Send OTP |
| `/api/auth/otp/verify` | POST | ✅ Verify OTP |
| `/api/products` | GET/POST | ✅ Product list/create |
| `/api/products/[id]` | GET/PUT/DELETE | ✅ Product operations |
| `/api/products/all` | GET | ✅ All products (admin) |
| `/api/products/[id]/status` | PATCH | ✅ Toggle status |
| `/api/orders` | GET/POST | ✅ Order management |
| `/api/checkout` | POST | ✅ Stripe checkout |
| `/api/webhooks/stripe` | POST | ✅ Payment webhook |
| `/api/support` | GET/POST | ✅ Send messages |
| `/api/support/reply` | POST | ✅ Admin replies |
| `/api/support/user` | GET | ✅ User messages |
| `/api/support/admin-status` | GET | ✅ Admin online status |
| `/api/user/profile` | GET/PUT | ✅ Profile management |
| `/api/addresses` | GET/POST/PUT/DELETE | ✅ Address CRUD |
| `/api/footer` | GET | ✅ Footer settings |
| `/api/sms/login-otp` | POST | ✅ Login via SMS |
| `/api/sms-settings` | GET/POST | ✅ SMS config |

### Admin Features

- Product CRUD (create, edit, delete, toggle status)
- User management (view, edit, delete, promote/demote)
- Support chat with all users
- Real-time message polling
- Order status management
- Unread message counter

---

## 🔧 What's Missing / Needs Work

### Critical (High Priority)

| Issue | Description | Impact |
|-------|-------------|--------|
| **Hardcoded Password** | Admin login uses hardcoded password `password123` in `lib/auth.ts:43` | Security vulnerability |
| **Missing Stripe Keys** | `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` not configured | Payments won't work |
| **SQLite in Production** | Using SQLite database (designed for dev only) | Scalability/可靠性 issues |
| **Missing SMS Gateway Config** | SMS gateway not fully configured | OTP won't work in production |
| **No Email Verification** | Email registration exists but no verification flow | Limited trust |

### Important (Medium Priority)

| Feature | Status | Notes |
|---------|--------|-------|
| **File Upload** | ⚠️ Partial | Upload endpoint exists, no proper file storage (uses base64 or external) |
| **Order Fulfillment** | ❌ Missing | No way to deliver digital products after payment |
| **Order Cancellation** | ❌ Missing | No user-facing cancel order functionality |
| **Admin Order View** | ❌ Missing | No admin page to view/manage orders |
| **Product Categories** | ❌ Missing | No product organization system |
| **Search/Filter Products** | ❌ Missing | Basic listing only |
| **Product Reviews** | ❌ Missing | No rating/review system |
| **Wishlist** | ❌ Missing | No favorites feature |
| **Password Reset** | ❌ Missing | No "forgot password" flow |
| **Email Notifications** | ⚠️ Partial | Telegram notifications exist, email not implemented |
| **Analytics Dashboard** | ❌ Missing | No sales/stats for admin |
| **Audit Logs** | ⚠️ Partial | Security events logged, no admin UI |
| **Two-Factor Auth** | ⚠️ Partial | OTP works, but no TOTP option |

### Minor (Low Priority)

| Feature | Description |
|---------|-------------|
| **SEO Optimization** | Missing meta tags, sitemap, OpenGraph |
| **Loading States** | Some pages lack loading skeletons |
| **Error Boundaries** | No React error boundaries |
| **Internationalization** | Single language (Russian) only |
| **Accessibility** | Partial WCAG compliance |
| **Unit Tests** | No test coverage |
| **API Documentation** | No Swagger/OpenAPI docs |
| **Docker Support** | No Dockerfile for containerization |

---

## Security Concerns

1. **Hardcoded Credentials**
   - Admin password in source code
   - No environment variable for admin credentials

2. **Missing Security Features**
   - No CAPTCHA on auth forms
   - Rate limiting is basic (in-memory only)
   - No account lockout after failed attempts

3. **File Upload Risks**
   - Limited file type validation
   - No virus scanning
   - No size limit enforcement

---

## Recommended Improvements

### Phase 1: Critical Fixes

1. Move admin credentials to environment variables
2. Configure PostgreSQL for production
3. Set up Stripe API keys in `.env`
4. Implement proper file storage (S3, Cloudinary, etc.)

### Phase 2: Core Features

1. Add order delivery system (email with digital product)
2. Build admin order management page
3. Implement password reset via email
4. Add product categories and search

### Phase 3: Polish

1. Add comprehensive tests
2. Implement accessibility improvements
3. Add analytics and reporting
4. Set up CI/CD pipeline

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone the repository
cd codeakgus

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed initial data
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Auth
NEXTAUTH_SECRET="your-secret-key"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="secure-password"

# Stripe (optional)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# SMS Gateway (optional)
SMS_GATEWAY_URL="https://sms.ibnux.net/"
SMS_DEVICE_ID=""
SMS_SECRET=""
```

---

## Database Schema

Key tables:
- `users` - User accounts with role support
- `products` - Product listings
- `product_variants` - Product options/pricing
- `orders` - Customer orders
- `support_messages` - Support chat
- `addresses` - Delivery addresses

---

## License

This project is for educational purposes.
