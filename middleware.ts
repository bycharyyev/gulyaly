import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const rateLimitRules: Record<string, RateLimitConfig> = {
  '/api/auth/': { limit: 5, windowMs: 60000 }, // 5 requests per minute for auth
  '/api/checkout': { limit: 3, windowMs: 60000 }, // 3 checkouts per minute
  '/api/': { limit: 100, windowMs: 60000 }, // 100 requests per minute for general API
};

function getRateLimit(identifier: string, config: RateLimitConfig) {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { success: true, remaining: config.limit - 1 };
  }

  if (record.count >= config.limit) {
    return { success: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { success: true, remaining: config.limit - record.count };
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ============================================
// SECURITY HEADERS
// ============================================

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  return response;
}

// ============================================
// MIDDLEWARE FUNCTION
// ============================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // ============================================
  // RATE LIMITING
  // ============================================

  // Find matching rate limit rule
  let rateLimitConfig: RateLimitConfig | null = null;
  let rateLimitKey = '';

  for (const [path, config] of Object.entries(rateLimitRules)) {
    if (pathname.startsWith(path)) {
      rateLimitConfig = config;
      rateLimitKey = `${ip}:${path}`;
      break;
    }
  }

  // Apply rate limiting if rule found
  if (rateLimitConfig) {
    const rateLimitResult = getRateLimit(rateLimitKey, rateLimitConfig);
    
    if (!rateLimitResult.success) {
      const retryAfter = rateLimitResult.resetTime 
        ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        : 60;

      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': rateLimitConfig.limit.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', rateLimitConfig.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  }

  // ============================================
  // ADMIN ROUTE PROTECTION
  // ============================================

  if (pathname.startsWith('/admin')) {
    // Allow admin login page
    if (pathname === '/admin/login' || pathname === '/admin-signin') {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    // Check authentication for all other admin routes
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      // Redirect to admin login
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Check if user is admin
    if (token.role !== 'ADMIN' && token.email !== process.env.ADMIN_EMAIL) {
      // Redirect to home page if not admin
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ============================================
  // API ROUTE PROTECTION
  // ============================================

  if (pathname.startsWith('/api/admin')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || (token.role !== 'ADMIN' && token.email !== process.env.ADMIN_EMAIL)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // ============================================
  // PRISMA STUDIO PROTECTION
  // ============================================

  if (pathname.startsWith('/prisma') || pathname.includes('prisma-studio')) {
    // Block access to Prisma Studio in production
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  // ============================================
  // SECURITY HEADERS FOR ALL RESPONSES
  // ============================================

  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

// ============================================
// MIDDLEWARE CONFIG
// ============================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
