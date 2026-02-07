// ============================================================
// ENTERPRISE-GRADE AUTHENTICATION SYSTEM
// THREE SEPARATE FLOWS: USER (OTP) | SELLER (Password) | ADMIN (Password)
// ============================================================

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import { logSecurityEvent } from "@/lib/security";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type UserRole = "USER" | "SELLER" | "ADMIN";
export type SellerStatus = "PENDING" | "APPROVED" | "REJECTED";

interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  role: UserRole;
  sellerStatus?: SellerStatus | null;
  isActive: boolean;
}

// ============================================================
// PASSWORD VALIDATION (SELLER & ADMIN)
// ============================================================

const MIN_PASSWORD_LENGTH = 10;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { 
      valid: false, 
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` 
    };
  }
  
  if (!PASSWORD_REGEX.test(password)) {
    return { 
      valid: false, 
      error: "Password must contain uppercase, lowercase, number, and special character" 
    };
  }
  
  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12); // 12 rounds for bcrypt
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

// ============================================================
// USER AUTHENTICATION (OTP ONLY)
// ============================================================
// RULES:
// - NO password allowed
// - OTP verification required
// - role is ALWAYS "USER"
// ============================================================

async function authenticateUser(credentials: Record<string, unknown>): Promise<AuthUser | null> {
  const { email, phone, otp } = credentials;
  
  console.log("[AUTH] USER OTP authentication attempt", { email, phone });
  
  // Find user by email or phone
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email: email as string } : {},
        phone ? { phone: phone as string } : {}
      ].filter(Boolean)
    }
  });
  
  if (!user) {
    logSecurityEvent("auth_failure", {
      type: "USER_OTP",
      reason: "user_not_found",
      email,
      phone
    });
    return null;
  }
  
  // STRICT: Verify user role is USER
  if (user.role !== "USER") {
    logSecurityEvent("auth_failure", {
      type: "USER_OTP",
      reason: "invalid_role",
      userId: user.id,
      role: user.role
    });
    return null;
  }
  
  // Check if user is active
  if (!user.isActive || user.banned) {
    logSecurityEvent("auth_failure", {
      type: "USER_OTP",
      reason: "account_inactive_or_banned",
      userId: user.id
    });
    return null;
  }
  
  // Verify OTP
  if (user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    logSecurityEvent("auth_failure", {
      type: "USER_OTP",
      reason: "invalid_or_expired_otp",
      userId: user.id
    });
    return null;
  }
  
  // Clear OTP after successful verification
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      otp: null, 
      otpExpiresAt: null,
      lastLoginAt: new Date()
    }
  });
  
  logSecurityEvent("auth_success", {
    type: "USER_OTP",
    userId: user.id,
    role: "USER"
  });
  
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: "USER",
    isActive: user.isActive
  };
}

// ============================================================
// SELLER AUTHENTICATION (PASSWORD ONLY)
// ============================================================
// RULES:
// - Email + Password ONLY
// - NO OTP allowed
// - Must be APPROVED to access dashboard
// - Password min 10 chars, bcrypt hashed
// ============================================================

async function authenticateSeller(credentials: Record<string, unknown>): Promise<AuthUser | null> {
  const { email, password } = credentials;
  
  console.log("[AUTH] SELLER password authentication attempt", { email });
  
  if (!email || !password) {
    logSecurityEvent("auth_failure", {
      type: "SELLER_PASSWORD",
      reason: "missing_credentials"
    });
    return null;
  }
  
  // Find seller by email
  const seller = await prisma.seller.findUnique({
    where: { email: email as string }
  });
  
  if (!seller) {
    logSecurityEvent("auth_failure", {
      type: "SELLER_PASSWORD",
      reason: "seller_not_found",
      email
    });
    return null;
  }
  
  // STRICT: Verify seller role
  if (seller.role !== "SELLER") {
    logSecurityEvent("auth_failure", {
      type: "SELLER_PASSWORD",
      reason: "invalid_role",
      sellerId: seller.id,
      role: seller.role
    });
    return null;
  }
  
  // Check if seller is active and not banned
  if (!seller.isActive || seller.banned) {
    logSecurityEvent("auth_failure", {
      type: "SELLER_PASSWORD",
      reason: "account_inactive_or_banned",
      sellerId: seller.id
    });
    return null;
  }
  
  // Verify password
  const passwordValid = await verifyPassword(password as string, seller.passwordHash);
  
  if (!passwordValid) {
    logSecurityEvent("auth_failure", {
      type: "SELLER_PASSWORD",
      reason: "invalid_password",
      sellerId: seller.id
    });
    return null;
  }
  
  // Update last login
  await prisma.seller.update({
    where: { id: seller.id },
    data: { lastLoginAt: new Date() }
  });
  
  logSecurityEvent("auth_success", {
    type: "SELLER_PASSWORD",
    sellerId: seller.id,
    role: "SELLER",
    sellerStatus: seller.sellerStatus
  });
  
  return {
    id: seller.id,
    email: seller.email,
    name: seller.name,
    role: "SELLER",
    sellerStatus: seller.sellerStatus as SellerStatus,
    isActive: seller.isActive
  };
}

// ============================================================
// ADMIN AUTHENTICATION (PASSWORD ONLY)
// ============================================================
// RULES:
// - Email + Password ONLY
// - NO OTP allowed
// - Stored in database (not env variables)
// - Full system access
// ============================================================

async function authenticateAdmin(credentials: Record<string, unknown>): Promise<AuthUser | null> {
  const { email, password } = credentials;
  
  console.log("[AUTH] ADMIN password authentication attempt", { email });
  
  if (!email || !password) {
    logSecurityEvent("auth_failure", {
      type: "ADMIN_PASSWORD",
      reason: "missing_credentials"
    });
    return null;
  }
  
  // Find admin by email
  const admin = await prisma.admin.findUnique({
    where: { email: email as string }
  });
  
  if (!admin) {
    logSecurityEvent("auth_failure", {
      type: "ADMIN_PASSWORD",
      reason: "admin_not_found",
      email
    });
    return null;
  }
  
  // STRICT: Verify admin role
  if (admin.role !== "ADMIN") {
    logSecurityEvent("auth_failure", {
      type: "ADMIN_PASSWORD",
      reason: "invalid_role",
      adminId: admin.id,
      role: admin.role
    });
    return null;
  }
  
  // Check if admin is active
  if (!admin.isActive) {
    logSecurityEvent("auth_failure", {
      type: "ADMIN_PASSWORD",
      reason: "account_inactive",
      adminId: admin.id
    });
    return null;
  }
  
  // Verify password
  const passwordValid = await verifyPassword(password as string, admin.passwordHash);
  
  if (!passwordValid) {
    logSecurityEvent("auth_failure", {
      type: "ADMIN_PASSWORD",
      reason: "invalid_password",
      adminId: admin.id
    });
    return null;
  }
  
  // Update last login
  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() }
  });
  
  logSecurityEvent("auth_success", {
    type: "ADMIN_PASSWORD",
    adminId: admin.id,
    role: "ADMIN"
  });
  
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: "ADMIN",
    isActive: admin.isActive
  };
}

// ============================================================
// NEXTAUTH CONFIGURATION
// ============================================================

export const {
  handlers,
  auth,
  signIn,
  signOut
} = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  
  debug: process.env.NODE_ENV === "development",
  
  pages: {
    signIn: "/login",
    error: "/login",
  },
  
  // Allow different login pages for different roles
  // This is handled via middleware redirects
  
  providers: [
    // ============================================================
    // USER: OTP Authentication
    // ============================================================
    CredentialsProvider({
      id: "user-otp",
      name: "User OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        phone: { label: "Phone", type: "tel" },
        otp: { label: "OTP Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.otp) return null;
        return authenticateUser(credentials);
      }
    }),
    
    // ============================================================
    // SELLER: Password Authentication
    // ============================================================
    CredentialsProvider({
      id: "seller-password",
      name: "Seller Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        return authenticateSeller(credentials);
      }
    }),
    
    // ============================================================
    // ADMIN: Password Authentication
    // ============================================================
    CredentialsProvider({
      id: "admin-password",
      name: "Admin Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        return authenticateAdmin(credentials);
      }
    })
  ],
  
  callbacks: {
    // ============================================================
    // JWT CALLBACK - Add user data to token
    // ============================================================
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser;
        token.id = authUser.id;
        token.email = authUser.email;
        token.phone = authUser.phone;
        token.name = authUser.name;
        token.role = authUser.role;
        token.sellerStatus = authUser.sellerStatus;
        token.isActive = authUser.isActive;
      }
      return token;
    },
    
    // ============================================================
    // SESSION CALLBACK - Add token data to session
    // ============================================================
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).email = token.email;
        (session.user as any).phone = token.phone;
        (session.user as any).name = token.name;
        (session.user as any).role = token.role;
        (session.user as any).sellerStatus = token.sellerStatus;
        (session.user as any).isActive = token.isActive;
      }
      return session;
    }
  },
  
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log("[AUTH] Sign in event:", {
        userId: user?.id,
        role: (user as any)?.role,
        provider: account?.provider
      });
    },
    
    async signOut(params) {
      // Type narrowing: JWT strategy uses token, database strategy uses session
      const token = (params as { token: any }).token || null;
      console.log("[AUTH] Sign out event:", {
        userId: token?.id,
        role: token?.role
      });
    }
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export async function getCurrentUser() {
  const session = await auth();
  return session?.user as AuthUser | undefined;
}

export async function requireAuth(role?: UserRole) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  if (role && user.role !== role) {
    throw new Error(`Forbidden: Required role ${role}`);
  }
  
  return user;
}

export async function requireSellerApproved() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== "SELLER") {
    throw new Error("Unauthorized: Seller access required");
  }
  
  if (user.sellerStatus !== "APPROVED") {
    throw new Error(`Forbidden: Seller status is ${user.sellerStatus}, APPROVED required`);
  }
  
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  
  return user;
}
