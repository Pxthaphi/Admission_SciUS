import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    nationalId?: string;
  }
  interface Session {
    user: User & {
      id: string;
      role: string;
      nationalId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    nationalId?: string;
  }
}
