import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, fileUrl } = await req.json();
  const studentId = parseInt(session.user.id);

  // Upsert: replace existing document of same type
  const existing = await prisma.document.findFirst({
    where: { studentId, type },
  });

  if (existing) {
    const doc = await prisma.document.update({
      where: { id: existing.id },
      data: { fileUrl },
    });
    return NextResponse.json(doc);
  }

  const doc = await prisma.document.create({
    data: { studentId, type, fileUrl },
  });

  return NextResponse.json(doc, { status: 201 });
}
