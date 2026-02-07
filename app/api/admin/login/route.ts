// ============================================================
// ADMIN LOGIN API
// Endpoint: POST /api/admin/login
// Purpose: Authenticate ADMIN with email + password
// STRICT: Only ADMIN role, NO OTP, database stored
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent, checkRateLimit } from "@/lib/security";
import { verifyPassword } from "@/lib/auth";
import { encode } from "next-auth/jwt";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log("[ADMIN LOGIN] Attempt:", { email });
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    
    // Rate limiting: Max 5 login attempts per 15 minutes per email
    if (!checkRateLimit(`admin_login:${email}`, 5, 15 * 60 * 1000)) {
      logSecurityEvent("rate_limit", {
        action: "admin_login",
        email
      });
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }
    
    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email }
    });
    
    if (!admin) {
      logSecurityEvent("login", {
        action: "admin_login_failed",
        reason: "admin_not_found",
        email
      });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }
    
    // STRICT: Verify admin role
    if (admin.role !== "ADMIN") {
      logSecurityEvent("access_denied", {
        action: "admin_login",
        reason: "invalid_role",
        adminId: admin.id,
        role: admin.role
      });
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 403 }
      );
    }
    
    // Check if admin is active
    if (!admin.isActive) {
      logSecurityEvent("access_denied", {
        action: "admin_login",
        reason: "account_inactive",
        adminId: admin.id
      });
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }
    
    // Verify password
    const passwordValid = await verifyPassword(password, admin.passwordHash);
    
    if (!passwordValid) {
      logSecurityEvent("login", {
        action: "admin_login_failed",
        reason: "invalid_password",
        adminId: admin.id
      });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }
    
    // Create session token manually
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    const token = await encode({
      secret,
      token: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: "ADMIN",
        isActive: admin.isActive,
      },
      maxAge: 24 * 60 * 60, // 24 hours
      salt: "next-auth.session-token",
    });
    
    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });
    
    logSecurityEvent("login", {
      action: "admin_login_success",
      adminId: admin.id,
      role: "ADMIN"
    });
    
    // Set session cookie
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: "ADMIN"
      }
    });
    
    // Set the session cookie (next-auth.session-token)
    const cookieName = process.env.NODE_ENV === "production" 
      ? "__Secure-next-auth.session-token" 
      : "next-auth.session-token";
    
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });
    
    return response;
    
  } catch (error) {
    console.error("[ADMIN LOGIN] Error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
