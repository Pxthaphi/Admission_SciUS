import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reviews = await prisma.documentReview.findMany({
    include: {
      student: {
        include: { documents: { select: { type: true, fileUrl: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = reviews.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    examId: r.student.examId || "-",
    firstName: r.student.firstName,
    lastName: r.student.lastName,
    school: r.student.school || "-",
    province: r.student.province || "-",
    status: r.status,
    remark: r.remark,
    documents: r.student.documents,
  }));

  return NextResponse.json(data);
}
