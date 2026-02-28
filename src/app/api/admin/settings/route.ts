import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.systemSetting.findMany();
  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });

  return NextResponse.json(map);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  try {
    for (const [key, value] of Object.entries(body)) {
      await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }
  } catch (e) {
    console.error("Settings PUT error:", e);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
