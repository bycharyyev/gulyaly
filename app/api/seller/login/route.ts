// ============================================================
// SELLER LOGIN API
// Endpoint: POST /api/seller/login
// Purpose: Authenticate SELLER with email + password
// STRICT: Only SELLER role, NO OTP, password required
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent, checkRateLimit } from "@/lib/security";
import { signIn, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log("[SELLER LOGIN] Attempt:", { email });
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    
    // Rate limiting: Max 5 login attempts per 15 minutes per email
    if (!checkRateLimit(`seller_login:${email}`, 5, 15 * 60 * 1000)) {
      logSecurityEvent("rate_limit", {
        action: "seller_login",
        email
      });
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }
    
    // Find seller
    const seller = await prisma.seller.findUnique({
      where: { email }
    });
    
    if (!seller) {
      logSecurityEvent("login", {
        action: "seller_login_failed",
        reason: "seller_not_found",
        email
      });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }
    
    // STRICT: Verify seller role
    if (seller.role !== "SELLER") {
      logSecurityEvent("access_denied", {
        action: "seller_login",
        reason: "invalid_role",
        sellerId: seller.id,
        role: seller.role
      });
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 403 }
      );
    }
    
    // Check if seller is active
    if (!seller.isActive) {
      logSecurityEvent("access_denied", {
        action: "seller_login",
        reason: "account_inactive",
        sellerId: seller.id
      });
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }
    
    // Verify password
    const passwordValid = await verifyPassword(password, seller.passwordHash);
    
    if (!passwordValid) {
      logSecurityEvent("login", {
        action: "seller_login_failed",
        reason: "invalid_password",
        sellerId: seller.id
      });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }
    
    // STRICT: Check sellerStatus
    if (seller.sellerStatus !== "APPROVED") {
      logSecurityEvent("access_denied", {
        action: "seller_login",
        reason: "not_approved",
        sellerId: seller.id,
        sellerStatus: seller.sellerStatus
      });
      return NextResponse.json({
        error: "Account not approved",
        sellerStatus: seller.sellerStatus,
        message: seller.sellerStatus === "PENDING" 
          ? "Your account is pending approval. Please wait for admin verification."
          : "Your application was rejected. Please contact support."
      }, { status: 403 });
    }
    
    // Create NextAuth session
    const result = await signIn("seller-password", {
      email,
      password,
      redirect: false
    });
    
    if (result?.error) {
      console.error("[SELLER LOGIN] SignIn error:", result.error);
      return NextResponse.json(
        { error: "Session creation failed" },
        { status: 500 }
      );
    }
    
    // Update last login
    await prisma.seller.update({
      where: { id: seller.id },
      data: { lastLoginAt: new Date() }
    });
    
    logSecurityEvent("login", {
      action: "seller_login_success",
      sellerId: seller.id,
      role: "SELLER"
    });
    
    return NextResponse.json({
      success: true,
      message: "Login successful",
      seller: {
        id: seller.id,
        email: seller.email,
        name: seller.name,
        role: "SELLER",
        sellerStatus: seller.sellerStatus
      }
    });
    
  } catch (error) {
    console.error("[SELLER LOGIN] Error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
