import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["enrollment_start", "enrollment_end"] } },
  });

  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });

  const now = new Date();
  const start = map.enrollment_start ? new Date(map.enrollment_start) : null;
  const end = map.enrollment_end ? new Date(map.enrollment_end) : null;

  let status: "not_set" | "before" | "open" | "closed" = "not_set";
  if (start && end) {
    if (now < start) status = "before";
    else if (now > end) status = "closed";
    else status = "open";
  }

  return NextResponse.json({
    enrollmentStart: map.enrollment_start || null,
    enrollmentEnd: map.enrollment_end || null,
    status,
  });
}
