import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await prisma.examResult.findMany({
    include: {
      student: {
        include: { examEligibility: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Only show students who are ELIGIBLE
  const filtered = results.filter(
    (r) => r.student.examEligibility?.status === "ELIGIBLE"
  );

  return NextResponse.json(
    filtered.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      examId: r.student.examId || "-",
      firstName: r.student.firstName,
      lastName: r.student.lastName,
      school: r.student.school || "-",
      province: r.student.province || "-",
      result: r.result,
      rank: r.rank,
      remark: r.remark,
    }))
  );
}
