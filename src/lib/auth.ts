import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma as any),
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        identifier: { label: "Username / National ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier as string;
        const password = credentials?.password as string;

        if (!identifier) return null;

        const isNationalId = /^\d{13}$/.test(identifier);

        if (isNationalId) {
          // Student login - no password needed
          const student = await prisma.student.findUnique({
            where: { nationalId: identifier },
          });
          if (!student) return null;
          return {
            id: String(student.id),
            name: `${student.firstName} ${student.lastName}`,
            role: "student",
            nationalId: student.nationalId,
          };
        } else {
          // Admin login - requires password
          if (!password) return null;
          const admin = await prisma.admin.findUnique({
            where: { username: identifier },
          });
          if (!admin) return null;
          const isValid = await bcrypt.compare(password, admin.password);
          if (!isValid) return null;
          return {
            id: String(admin.id),
            name: admin.fullName,
            role: admin.role.toLowerCase(),
            adminRole: admin.role,
          };
        }
      },
    }),
  ],
});
