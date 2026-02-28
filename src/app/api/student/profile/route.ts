import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const student = await prisma.student.findFirst({
    where: { id: parseInt(session.user.id) },
    include: {
      documents: {
        select: { type: true, fileUrl: true, uploadedAt: true },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(student);
}
