import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Edge-compatible auth config (no Prisma / Node.js modules).
 * Used by middleware. Full server-side config is in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    // Credentials provider needs to be declared here so NextAuth
    // recognises the provider in middleware, but authorize() runs
    // only on the server side (auth.ts).
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        identifier: { label: "Username / National ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // authorize is not called in middleware — it runs server-side only
      authorize: () => null,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as Record<string, unknown>).role as string;
        token.nationalId = (user as Record<string, unknown>).nationalId as string | undefined;
        token.adminRole = (user as Record<string, unknown>).adminRole as string | undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).nationalId = token.nationalId;
        (session.user as unknown as Record<string, unknown>).adminRole = token.adminRole;
      }
      return session;
    },
  },
};
