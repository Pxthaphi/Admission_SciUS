import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eligibilities = await prisma.examEligibility.findMany({
    include: {
      student: {
        include: { documentReview: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Only show students whose documents have been APPROVED
  const filtered = eligibilities.filter(
    (e) => e.student.documentReview?.status === "APPROVED"
  );

  return NextResponse.json(
    filtered.map((e) => ({
      id: e.id,
      studentId: e.studentId,
      examId: e.student.examId || "-",
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      school: e.student.school || "-",
      province: e.student.province || "-",
      status: e.status,
      remark: e.remark,
    }))
  );
}
