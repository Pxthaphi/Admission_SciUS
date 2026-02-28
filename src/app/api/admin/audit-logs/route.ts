import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user as any).adminRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "เฉพาะ Super Admin เท่านั้นที่สามารถดูประวัติการใช้งานได้" }, { status: 403 });
  }

  const url = req.nextUrl;
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const action = url.searchParams.get("action") || undefined;
  const table = url.searchParams.get("table") || undefined;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (table) where.targetTable = table;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Resolve user names
  const adminIds = [...new Set(logs.filter((l) => l.userRole !== "student").map((l) => l.userId))];
  const admins = adminIds.length > 0
    ? await prisma.admin.findMany({ where: { id: { in: adminIds } }, select: { id: true, fullName: true } })
    : [];
  const adminMap = Object.fromEntries(admins.map((a) => [a.id, a.fullName]));

  const data = logs.map((l) => ({
    ...l,
    userName: adminMap[l.userId] || `User #${l.userId}`,
  }));

  return NextResponse.json({ data, total, page, limit });
}
