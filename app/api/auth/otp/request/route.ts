// ============================================================
// USER OTP REQUEST API
// Endpoint: POST /api/auth/otp/request
// Purpose: Send OTP to user's email or phone
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent, checkRateLimit } from "@/lib/security";

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json();
    
    console.log("[OTP REQUEST] Received:", { email, phone });
    
    // Validate input
    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone is required" },
        { status: 400 }
      );
    }
    
    // Rate limiting: Max 3 OTP requests per 10 minutes per identifier
    const identifier = email || phone;
    if (!checkRateLimit(`otp_request:${identifier}`, 3, 10 * 60 * 1000)) {
      logSecurityEvent("rate_limit", {
        action: "otp_request",
        identifier
      });
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again later." },
        { status: 429 }
      );
    }
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Find or create user
    let user;
    
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });
      
      if (!user) {
        // Create new user with email
        user = await prisma.user.create({
          data: {
            email,
            otp,
            otpExpiresAt,
            otpType: "EMAIL",
            role: "USER" // STRICT: Always USER
          }
        });
        console.log("[OTP REQUEST] Created new user with email:", user.id);
      } else {
        // STRICT: Verify user role is USER
        if (user.role !== "USER") {
          logSecurityEvent("access_denied", {
            action: "otp_request",
            reason: "invalid_role",
            userId: user.id,
            role: user.role
          });
          return NextResponse.json(
            { error: "Invalid user type" },
            { status: 403 }
          );
        }
        
        // Update existing user with new OTP
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            otp,
            otpExpiresAt,
            otpType: "EMAIL"
          }
        });
        console.log("[OTP REQUEST] Updated existing user:", user.id);
      }
    } else if (phone) {
      user = await prisma.user.findUnique({ where: { phone } });
      
      if (!user) {
        // Create new user with phone
        user = await prisma.user.create({
          data: {
            phone,
            otp,
            otpExpiresAt,
            otpType: "PHONE",
            role: "USER" // STRICT: Always USER
          }
        });
        console.log("[OTP REQUEST] Created new user with phone:", user.id);
      } else {
        // STRICT: Verify user role is USER
        if (user.role !== "USER") {
          logSecurityEvent("access_denied", {
            action: "otp_request",
            reason: "invalid_role",
            userId: user.id,
            role: user.role
          });
          return NextResponse.json(
            { error: "Invalid user type" },
            { status: 403 }
          );
        }
        
        // Update existing user with new OTP
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            otp,
            otpExpiresAt,
            otpType: "PHONE"
          }
        });
        console.log("[OTP REQUEST] Updated existing user:", user.id);
      }
    }
    
    // Log security event
    logSecurityEvent("otp", {
      action: "otp_sent",
      userId: user!.id,
      type: email ? "EMAIL" : "PHONE"
    });
    
    // TODO: Send actual OTP via email or SMS
    // For development, we return the OTP in the response
    console.log(`[OTP REQUEST] OTP for ${identifier}: ${otp}`);
    
    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      // WARNING: Remove otp field in production!
      ...(process.env.NODE_ENV === "development" && { otp })
    });
    
  } catch (error) {
    console.error("[OTP REQUEST] Error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
