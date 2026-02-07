// ============================================================
// USER OTP VERIFY API
// Endpoint: POST /api/auth/otp/verify
// Purpose: Verify OTP and create session for USER
// STRICT: Only USER role, NO password
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent, checkRateLimit } from "@/lib/security";
import { signIn } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, phone, otp } = await request.json();
    
    console.log("[OTP VERIFY] Received:", { email, phone });
    
    // Validate input
    if ((!email && !phone) || !otp) {
      return NextResponse.json(
        { error: "Email/phone and OTP are required" },
        { status: 400 }
      );
    }
    
    // Rate limiting: Max 5 verify attempts per 5 minutes
    const identifier = email || phone;
    if (!checkRateLimit(`otp_verify:${identifier}`, 5, 5 * 60 * 1000)) {
      logSecurityEvent("rate_limit", {
        action: "otp_verify",
        identifier
      });
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }
    
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {}
        ].filter(Boolean)
      }
    });
    
    if (!user) {
      logSecurityEvent("login", {
        action: "otp_verify_failed",
        reason: "user_not_found",
        identifier
      });
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }
    
    // STRICT: Verify user role is USER
    if (user.role !== "USER") {
      logSecurityEvent("access_denied", {
        action: "otp_verify",
        reason: "invalid_role",
        userId: user.id,
        role: user.role
      });
      return NextResponse.json(
        { error: "Invalid user type" },
        { status: 403 }
      );
    }
    
    // Check if user is active
    if (!user.isActive) {
      logSecurityEvent("access_denied", {
        action: "otp_verify",
        reason: "account_inactive",
        userId: user.id
      });
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }
    
    // Verify OTP
    if (user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      logSecurityEvent("login", {
        action: "otp_verify_failed",
        reason: "invalid_or_expired_otp",
        userId: user.id
      });
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }
    
    // Check if first login (for welcome animation)
    const isFirstLogin = !user.emailVerified && !user.phoneVerified;
    
    // Clear OTP and mark as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        otpExpiresAt: null,
        emailVerified: email ? true : user.emailVerified,
        phoneVerified: phone ? true : user.phoneVerified
      }
    });
    
    // Create NextAuth session via credentials provider
    const result = await signIn("user-otp", {
      email: user.email,
      phone: user.phone,
      otp: "verified", // Internal marker
      redirect: false
    });
    
    if (result?.error) {
      console.error("[OTP VERIFY] SignIn error:", result.error);
      return NextResponse.json(
        { error: "Session creation failed" },
        { status: 500 }
      );
    }
    
    logSecurityEvent("login", {
      action: "otp_verify_success",
      userId: user.id,
      role: "USER"
    });
    
    return NextResponse.json({
      success: true,
      message: "Login successful",
      isFirstLogin,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: "USER"
      }
    });
    
  } catch (error) {
    console.error("[OTP VERIFY] Error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
