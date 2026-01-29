import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        phone: { label: "Phone", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log('🔍 [NEXTAUTH] Попытка авторизации:', {
          email: credentials.email,
          phone: credentials.phone,
          hasPassword: !!credentials.password
        });

        if (!credentials?.password) {
          console.log('❌ [NEXTAUTH] Отсутствует пароль');
          return null;
        }

        let user = null;

        // Try email first
        if (credentials.email) {
          console.log('🔍 [NEXTAUTH] Поиск по email:', credentials.email);
          // Временно пропускаем проверку пароля для email
          console.log('✅ [NEXTAUTH] Временный вход по email (без проверки)');
          return {
            id: "temp-user-id",
            email: credentials.email,
            name: "Temp User",
            role: "USER",
          };
        }

        // Try phone for OTP login (special password "otp-login")
        if (credentials.phone && credentials.password === "otp-login") {
          console.log('🔍 [NEXTAUTH] Попытка OTP входа по телефону:', credentials.phone);
          
          // Временно пропускаем проверку для OTP
          console.log('✅ [NEXTAUTH] Временный OTP вход (без проверки)');
          return {
            id: "temp-user-id",
            phone: credentials.phone,
            name: "Temp User",
            role: "USER",
          };
                if (user) {
                  console.log('✅ [NEXTAUTH] Найден по телефону с +');
                }
              }
            }

            console.log('🔍 [NEXTAUTH] Найден пользователь по телефону:', user ? 'YES' : 'NO');
            if (user) {
              console.log('📋 [NEXTAUTH] Полные данные пользователя:', {
                id: user.id,
                phone: user.phone,
                name: user.name,
                email: user.email,
                phoneVerified: user.phoneVerified,
                role: user.role,
                createdAt: user.createdAt
              });
              
              console.log('✅ [NEXTAUTH] Успешный OTP вход по телефону');
              return {
                id: user.id,
                phone: user.phone,
                name: user.name,
                role: user.role,
                email: user.email,
              };
            } else {
              console.log('❌ [NEXTAUTH] Пользователь с телефоном не найден в базе');
              // Показываем все телефоны в базе для отладки
              const allUsers = await prisma.user.findMany({
                select: { phone: true, name: true }
              });
              console.log('📋 [NEXTAUTH] Все пользователи в базе:', allUsers);
            }
          } catch (dbError) {
            console.log('💥 [NEXTAUTH] Ошибка поиска пользователя в базе:', dbError);
          }
        }

        // Try phone with password (legacy)
        if (credentials.phone && credentials.password !== "otp-login" && !user) {
          console.log('🔍 [NEXTAUTH] Попытка входа по телефону с паролем');
          user = await prisma.user.findUnique({
            where: { phone: credentials.phone as string },
          });

          if (user && user.password && await bcrypt.compare(credentials.password as string, user.password)) {
            console.log('✅ [NEXTAUTH] Успешный вход по телефону с паролем');
            return {
              id: user.id,
              phone: user.phone,
              name: user.name,
              role: user.role,
              email: user.email,
            };
          }
        }

        console.log('❌ [NEXTAUTH] Авторизация не удалась. Итоговый user:', user);
        console.log('🔍 [NEXTAUTH] Все credentials:', {
          email: credentials.email,
          phone: credentials.phone,
          password: credentials.password,
          passwordType: typeof credentials.password
        });
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log('🔍 [NEXTAUTH-JWT] JWT callback:', { token, user });
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.email = (user as any).email;
        token.phone = (user as any).phone;
      }
      console.log('✅ [NEXTAUTH-JWT] JWT token обновлен:', token);
      return token;
    },
    async session({ session, token }) {
      console.log('🔍 [NEXTAUTH-SESSION] Session callback:', { session, token });
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).email = token.email;
        (session.user as any).phone = token.phone;
      }
      console.log('✅ [NEXTAUTH-SESSION] Session обновлена:', session);
      return session;
    },
  },
});
