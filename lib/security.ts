// Security utilities

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Check if running in production
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Get client IP address
 */
export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * Check authorization and return session or null
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return session;
}

/**
 * Check admin rights - returns error response or null if admin
 */
export async function requireAdmin() {
  const session = await requireAuth();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Authorization required' },
      { status: 401 }
    );
  }
  
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Admin privileges required' },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate phone number (E.164 format)
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL slug (alphanumeric, hyphens, underscores)
 */
export function validateSlug(slug: string): boolean {
  if (!slug) return false;
  const slugRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-_]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  return slugRegex.test(slug) && slug.length >= 2 && slug.length <= 50;
}

/**
 * Sanitize slug for URL use
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  
  return token;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ==================== IN-MEMORY RATE LIMITING ====================

// In-memory rate limiting (Note: For production, use Redis or database-backed solution)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Check rate limit for specific action
 */
export function checkActionRateLimit(
  action: string,
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  return checkRateLimit(`${action}:${identifier}`, maxRequests, windowMs);
}

/**
 * Clean up expired rate limits (call periodically)
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetAt) {
      requestCounts.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

// ==================== ACCOUNT LOCKOUT ====================

const FAILED_ATTEMPTS = new Map<string, { count: number; resetAt: number }>();
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

export function isLockedOut(identifier: string): boolean {
  const now = Date.now();
  const record = FAILED_ATTEMPTS.get(identifier);
  
  if (!record) return false;
  if (now > record.resetAt) {
    FAILED_ATTEMPTS.delete(identifier);
    return false;
  }
  
  return record.count >= MAX_FAILED_ATTEMPTS;
}

export function recordFailedAttempt(identifier: string) {
  const now = Date.now();
  const record = FAILED_ATTEMPTS.get(identifier);
  
  if (!record || now > record.resetAt) {
    FAILED_ATTEMPTS.set(identifier, {
      count: 1,
      resetAt: now + LOCKOUT_DURATION_MS,
    });
  } else {
    record.count++;
  }
}

export function clearFailedAttempts(identifier: string) {
  FAILED_ATTEMPTS.delete(identifier);
}

/**
 * Clean up expired lockouts (call periodically)
 */
export function cleanupLockouts() {
  const now = Date.now();
  for (const [key, record] of FAILED_ATTEMPTS.entries()) {
    if (now > record.resetAt) {
      FAILED_ATTEMPTS.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupLockouts, 5 * 60 * 1000);
}

// ==================== SECURITY EVENT LOGGING ====================

export function logSecurityEvent(
  event: 'login' | 'logout' | 'access_denied' | 'rate_limit' | 'invalid_input' | 'otp' | 'payment' | 'api_error',
  details: Record<string, any>
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };
  
  console.log('[SECURITY]', JSON.stringify(logEntry));
}
