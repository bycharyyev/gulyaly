import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

interface User {
  id: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  role: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.password) {
          return null;
        }

        // Try email first
        if (credentials.email) {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (user) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }
        }

        // Try phone with password
        if (credentials.phone && credentials.password !== "otp-login") {
          const user = await prisma.user.findUnique({
            where: { phone: credentials.phone as string },
          });

          if (user && user.password && await bcrypt.compare(credentials.password as string, user.password)) {
            return {
              id: user.id,
              phone: user.phone,
              name: user.name,
              role: user.role,
              email: user.email,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.email = (user as any).email;
        token.phone = (user as any).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).email = token.email;
        (session.user as any).phone = token.phone;
      }
      return session;
    },
  },
});
