import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { logSecurityEvent } from "@/lib/security";

// Admin credentials from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  debug: process.env.NODE_ENV === 'development',
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const loginMethod = credentials?.phone ? 'phone_otp' :
                           (credentials as any)?.email ? 'email_password' : 'unknown';

        try {
          // 1. Проверяем email/password вход для админа (env-based, bcrypt)
          if ((credentials as any)?.email && credentials?.password) {
            // Check if admin credentials are configured
            if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
              logSecurityEvent('login', {
                action: 'admin_login_attempt',
                result: 'failed',
                reason: 'admin_not_configured',
                email: (credentials as any).email
              });
              return null;
            }

            // Verify admin email matches configured admin email
            if ((credentials as any).email !== ADMIN_EMAIL) {
              logSecurityEvent('login', {
                action: 'admin_login_attempt',
                result: 'failed',
                reason: 'email_mismatch',
                email: (credentials as any).email
              });
              return null;
            }

            // Verify password using bcrypt
            const passwordValid = await compare(
              credentials.password as string,
              ADMIN_PASSWORD_HASH
            );

            if (!passwordValid) {
              logSecurityEvent('login', {
                action: 'admin_login_attempt',
                result: 'failed',
                reason: 'invalid_password',
                email: ADMIN_EMAIL
              });
              return null;
            }

            logSecurityEvent('login', {
              action: 'admin_login_success',
              email: ADMIN_EMAIL
            });

            // Return admin session with admin user data from database
            const adminUser = await prisma.user.findFirst({
              where: { role: 'ADMIN' },
              take: 1
            });

            if (!adminUser) {
              logSecurityEvent('login', {
                action: 'admin_login_attempt',
                result: 'failed',
                reason: 'no_admin_user_in_db',
                email: ADMIN_EMAIL
              });
              return null;
            }

            return {
              id: adminUser.id,
              phone: adminUser.phone,
              name: adminUser.name,
              email: adminUser.email,
              role: 'ADMIN',
            } as any;
          }

          // 2. Проверяем OTP вход по телефону
          if (credentials?.phone && credentials.password === "otp-login") {
            const user = await prisma.user.findUnique({
              where: { phone: credentials.phone as string }
            });

            if (!user) {
              logSecurityEvent('login', {
                action: 'otp_login_attempt',
                result: 'failed',
                reason: 'user_not_found',
                phone: credentials.phone
              });
              return null;
            }

            if (!user.phoneVerified) {
              logSecurityEvent('login', {
                action: 'otp_login_attempt',
                result: 'failed',
                reason: 'phone_not_verified',
                userId: user.id
              });
              return null;
            }

            logSecurityEvent('login', {
              action: 'otp_login_success',
              userId: user.id
            });

            return {
              id: user.id,
              phone: user.phone,
              name: user.name,
              email: user.email,
              role: user.role,
            } as any;
          }

          logSecurityEvent('login', {
            action: 'login_attempt',
            result: 'failed',
            reason: 'invalid_credentials',
            loginMethod
          });
          return null;
        } catch (error) {
          logSecurityEvent('login', {
            action: 'login_attempt',
            result: 'error',
            loginMethod,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phone = (user as any).phone;
        token.email = (user as any).email;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).phone = token.phone;
        (session.user as any).email = token.email;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
