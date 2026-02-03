import { z } from 'zod';

// ============================================
// USER VALIDATION SCHEMAS
// ============================================

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const otpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only digits'),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().optional(),
});

// ============================================
// PRODUCT VALIDATION SCHEMAS
// ============================================

export const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  price: z.number().positive('Price must be positive'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  categoryId: z.string().uuid('Invalid category ID'),
  images: z.array(z.string().url('Invalid image URL')).min(1, 'At least one image is required'),
  isActive: z.boolean().default(true),
});

export const productUpdateSchema = productSchema.partial();

export const productIdSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

// ============================================
// ORDER VALIDATION SCHEMAS
// ============================================

export const orderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
});

export const checkoutSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  addressId: z.string().uuid('Invalid address ID'),
  paymentMethod: z.enum(['card', 'cash'], {
    errorMap: () => ({ message: 'Invalid payment method' }),
  }),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Invalid order status' }),
  }),
});

// ============================================
// ADDRESS VALIDATION SCHEMAS
// ============================================

export const addressSchema = z.object({
  street: z.string().min(5, 'Street address must be at least 5 characters').max(200),
  city: z.string().min(2, 'City must be at least 2 characters').max(100),
  state: z.string().min(2, 'State must be at least 2 characters').max(100),
  zipCode: z.string().min(4, 'Zip code must be at least 4 characters').max(20),
  country: z.string().min(2, 'Country must be at least 2 characters').max(100),
  isDefault: z.boolean().default(false),
});

export const addressIdSchema = z.object({
  id: z.string().uuid('Invalid address ID'),
});

// ============================================
// SUPPORT VALIDATION SCHEMAS
// ============================================

export const supportTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  category: z.enum(['GENERAL', 'ORDER', 'PRODUCT', 'PAYMENT', 'TECHNICAL'], {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
});

export const supportReplySchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
  ticketId: z.string().uuid('Invalid ticket ID'),
});

// ============================================
// ADMIN VALIDATION SCHEMAS
// ============================================

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const storeSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters').max(100),
  slug: z.string().min(2, 'Slug must be at least 2 characters').max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  isActive: z.boolean().default(true),
});

export const smsSettingsSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  secret: z.string().min(1, 'Secret is required'),
  gatewayUrl: z.string().url('Invalid gateway URL'),
  simNumber: z.string().regex(/^[0-9]$/, 'SIM number must be 0-3'),
});

export const footerSchema = z.object({
  content: z.string().min(10, 'Footer content must be at least 10 characters').max(10000),
  links: z.array(z.object({
    text: z.string().min(1).max(100),
    url: z.string().url('Invalid URL'),
  })).optional(),
});

// ============================================
// PAGINATION & FILTER SCHEMAS
// ============================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200),
  category: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

export function sanitizeHtml(html: string): string {
  // Basic XSS prevention - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

export function validateEmail(email: string): boolean {
  return z.string().email().safeParse(email).success;
}

export function validateUUID(id: string): boolean {
  return z.string().uuid().safeParse(id).success;
}

// ============================================
// TYPE EXPORTS
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OTPInput = z.infer<typeof otpSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type OrderStatusInput = z.infer<typeof orderStatusSchema>;

export type AddressInput = z.infer<typeof addressSchema>;
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
export type SupportReplyInput = z.infer<typeof supportReplySchema>;

export type StoreInput = z.infer<typeof storeSchema>;
export type SMSSettingsInput = z.infer<typeof smsSettingsSchema>;
export type FooterInput = z.infer<typeof footerSchema>;

export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
