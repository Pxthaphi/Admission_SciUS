import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // Public routes
  if (pathname === "/" || pathname === "/login") {
    if (isLoggedIn && pathname === "/login") {
      const redirectUrl = role === "student" ? "/student/profile" : "/admin/dashboard";
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin routes
  if (pathname.startsWith("/admin") && role === "student") {
    return NextResponse.redirect(new URL("/student/profile", req.url));
  }

  // Student routes
  if (pathname.startsWith("/student") && role !== "student") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
