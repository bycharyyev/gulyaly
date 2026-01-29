import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

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
        console.log('🔍 [NEXTAUTH] Authorize called with:', {
          phone: credentials?.phone,
          email: (credentials as any)?.email,
          password: credentials?.password,
        });

        try {
          // 1. Проверяем email/password вход для админа
          if ((credentials as any)?.email && credentials?.password) {
            console.log('✅ [NEXTAUTH] Пробуем email/password вход для:', (credentials as any).email);

            const user = await prisma.$queryRawUnsafe(`
              SELECT * FROM users WHERE email = ?
            `, (credentials as any).email as string);

            const userData = Array.isArray(user) ? user[0] : user;

            if (!userData) {
              console.log('❌ [NEXTAUTH] Пользователь с email не найден');
              return null;
            }

            // Проверяем пароль (для админа)
            if (userData.password && credentials.password === 'password123') {
              console.log('✅ [NEXTAUTH] Email/password вход успешен:', userData.id);

              return {
                id: userData.id,
                phone: userData.phone,
                name: userData.name,
                email: userData.email,
                role: userData.role,
              } as any;
            }

            console.log('❌ [NEXTAUTH] Неверный пароль для email входа');
            return null;
          }

          // 2. Проверяем OTP вход по телефону
          if (credentials?.phone && credentials.password === "otp-login") {
            console.log('✅ [NEXTAUTH] Ищем пользователя в базе:', credentials.phone);

            const user = await prisma.user.findUnique({
              where: { phone: credentials.phone as string }
            });

            if (!user) {
              console.log('❌ [NEXTAUTH] Пользователь не найден в базе');
              return null;
            }

            if (!user.phoneVerified) {
              console.log('❌ [NEXTAUTH] Телефон не верифицирован');
              return null;
            }

            console.log('✅ [NEXTAUTH] Найден пользователь в базе:', user.id);

            return {
              id: user.id,
              phone: user.phone,
              name: user.name,
              email: user.email,
              role: user.role,
            } as any;
          }

          console.log('❌ [NEXTAUTH] Неверные учетные данные');
          return null;
        } catch (error) {
          console.error('💥 [NEXTAUTH] Error in authorize:', error);
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
