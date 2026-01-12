// Типы продуктов
export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image?: string;
  images?: string[];
  variants: ProductVariant[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Типы пользователей
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

// Типы заказов
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  productId: string;
  variantId: string;
  amount: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Типы сообщений поддержки
export interface SupportMessage {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  createdAt: Date;
}
