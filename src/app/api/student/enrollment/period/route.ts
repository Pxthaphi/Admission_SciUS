import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["enrollment_start", "enrollment_primary_end", "enrollment_reserve_end"] } },
  });

  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });

  const now = new Date();
  const start = map.enrollment_start ? new Date(map.enrollment_start) : null;
  const primaryEnd = map.enrollment_primary_end ? new Date(map.enrollment_primary_end) : null;
  const reserveEnd = map.enrollment_reserve_end ? new Date(map.enrollment_reserve_end) : null;

  // General status based on the full window
  let status: "not_set" | "before" | "open" | "closed" = "not_set";
  if (start && reserveEnd) {
    if (now < start) status = "before";
    else if (now > reserveEnd) status = "closed";
    else status = "open";
  }

  return NextResponse.json({
    enrollmentStart: map.enrollment_start || null,
    enrollmentPrimaryEnd: map.enrollment_primary_end || null,
    enrollmentReserveEnd: map.enrollment_reserve_end || null,
    status,
  });
}
