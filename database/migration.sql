-- PostgreSQL Migration Script
-- Migration from SQLite to PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS "orders" CASCADE;
DROP TABLE IF EXISTS "support_messages" CASCADE;
DROP TABLE IF EXISTS "addresses" CASCADE;
DROP TABLE IF EXISTS "product_variants" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Create Roles Enum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- Create Order Status Enum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- Users Table
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE,
    "password" VARCHAR(255),
    "name" VARCHAR(255),
    "avatar" VARCHAR(500),
    "phone" VARCHAR(20) UNIQUE,
    "phoneVerified" BOOLEAN DEFAULT false,
    "otp" VARCHAR(10),
    "otpExpiresAt" TIMESTAMP,
    "role" "Role" DEFAULT 'USER',
    "isOnline" BOOLEAN DEFAULT false,
    "lastSeenAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE "products" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(500),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "images" JSONB
);

-- Product Variants Table
CREATE TABLE "product_variants" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "productId" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "price" INTEGER NOT NULL,
    "originalPrice" INTEGER,
    "image" VARCHAR(500),
    "inStock" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses Table
CREATE TABLE "addresses" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "address" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "postalCode" VARCHAR(20),
    "isDefault" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE "orders" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "productId" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "variantId" UUID NOT NULL REFERENCES "product_variants"("id") ON DELETE CASCADE,
    "amount" INTEGER NOT NULL,
    "status" "OrderStatus" DEFAULT 'PENDING',
    "stripeSessionId" VARCHAR(255) UNIQUE,
    "customerEmail" VARCHAR(255),
    "customerPhone" VARCHAR(20),
    "customerName" VARCHAR(255),
    "deliveryAddress" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support Messages Table
CREATE TABLE "support_messages" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "senderId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "message" TEXT NOT NULL,
    "isAdmin" BOOLEAN DEFAULT false,
    "isRead" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_phone_idx" ON "users"("phone");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "products_isActive_idx" ON "products"("isActive");
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");
CREATE INDEX "addresses_userId_idx" ON "addresses"("userId");
CREATE INDEX "orders_userId_idx" ON "orders"("userId");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");
CREATE INDEX "support_messages_userId_idx" ON "support_messages"("userId");
CREATE INDEX "support_messages_isAdmin_idx" ON "support_messages"("isAdmin");
CREATE INDEX "support_messages_isRead_idx" ON "support_messages"("isRead");

-- Create Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create Triggers for Updated At
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON "products" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON "product_variants" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON "addresses" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON "orders" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_messages_updated_at BEFORE UPDATE ON "support_messages" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Default Admin User
INSERT INTO "users" ("id", "email", "password", "name", "role", "phoneVerified")
VALUES (
    uuid_generate_v4(),
    'admin@gulyaly.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', -- password: admin123
    'Administrator',
    'ADMIN',
    true
) ON CONFLICT (email) DO NOTHING;

-- Create Admin Activity Log Table
CREATE TABLE "admin_logs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "adminId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(100),
    "resourceId" UUID,
    "details" JSONB,
    "ipAddress" INET,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "admin_logs_adminId_idx" ON "admin_logs"("adminId");
CREATE INDEX "admin_logs_action_idx" ON "admin_logs"("action");
CREATE INDEX "admin_logs_createdAt_idx" ON "admin_logs"("createdAt");

-- Create System Settings Table
CREATE TABLE "system_settings" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "key" VARCHAR(100) UNIQUE NOT NULL,
    "value" JSONB,
    "description" TEXT,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON "system_settings" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Default System Settings
INSERT INTO "system_settings" ("key", "value", "description") VALUES
('site_name', '"Gulyaly"', 'Название сайта'),
('site_description', '"Современный интернет-магазин"', 'Описание сайта'),
('contact_email', '"info@gulyaly.com"', 'Контактный email'),
('contact_phone', '"+99312345678"', 'Контактный телефон'),
('maintenance_mode', 'false', 'Режим обслуживания')
ON CONFLICT (key) DO NOTHING;
