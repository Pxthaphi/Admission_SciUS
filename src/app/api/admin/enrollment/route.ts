import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enrollments = await prisma.enrollment.findMany({
    include: {
      student: {
        include: {
          examResult: true,
          documents: {
            where: { type: { in: ["ENROLLMENT_CONFIRM", "ENROLLMENT_CONTRACT", "SCHOOL_TRANSFER"] } },
            select: { type: true, fileUrl: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    enrollments.map((e) => ({
      id: e.id,
      studentId: e.studentId,
      examId: e.student.examId || "-",
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      school: e.student.school || "-",
      province: e.student.province || "-",
      result: e.student.examResult?.result || "PENDING",
      rank: e.student.examResult?.rank || null,
      confirmationStatus: e.confirmationStatus,
      documentReviewStatus: e.documentReviewStatus,
      documents: e.student.documents,
    }))
  );
}
