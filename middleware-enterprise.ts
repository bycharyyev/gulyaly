import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ============================================
// ENTERPRISE MIDDLEWARE - STRICT ROLE CHECKS
// ============================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // ADMIN ROUTE PROTECTION
  // STRICT: role === "ADMIN" ONLY
  // ============================================

  if (pathname.startsWith('/admin')) {
    // Allow admin login page
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // STRICT: role MUST be "ADMIN"
    if (token.role !== 'ADMIN') {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Forbidden: Admin access required',
          code: 'ADMIN_REQUIRED'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' }}
      );
    }
  }

  // ============================================
  // SELLER ROUTE PROTECTION
  // STRICT: role === "SELLER" AND sellerStatus === "APPROVED"
  // ============================================

  if (pathname.startsWith('/seller')) {
    // Allow seller login page
    if (pathname === '/seller/login') {
      return NextResponse.next();
    }

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(new URL('/seller/login', request.url));
    }

    // STRICT: role MUST be "SELLER"
    if (token.role !== 'SELLER') {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Forbidden: Seller access required',
          code: 'SELLER_REQUIRED'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // STRICT: sellerStatus MUST be "APPROVED"
    if (token.sellerStatus !== 'APPROVED') {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Forbidden: Seller not approved',
          code: 'SELLER_NOT_APPROVED',
          sellerStatus: token.sellerStatus
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' }}
      );
    }
  }

  // ============================================
  // API ADMIN PROTECTION
  // ============================================

  if (pathname.startsWith('/api/admin')) {
    if (pathname === '/api/admin/login') {
      return NextResponse.next();
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== 'ADMIN') {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' }}
      );
    }
  }

  // ============================================
  // API SELLER PROTECTION
  // ============================================

  if (pathname.startsWith('/api/seller')) {
    if (pathname === '/api/seller/login') {
      return NextResponse.next();
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== 'SELLER') {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: Seller access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' }}
      );
    }

    if (token.sellerStatus !== 'APPROVED') {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: Seller not approved' }),
        { status: 403, headers: { 'Content-Type': 'application/json' }}
      );
    }
  }

  return NextResponse.next();
}

// ============================================
// MATCHER CONFIGURATION
// ============================================

export const config = {
  matcher: [
    '/admin/:path*',
    '/seller/:path*',
    '/api/admin/:path*',
    '/api/seller/:path*',
  ],
};
