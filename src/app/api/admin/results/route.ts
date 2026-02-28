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

  // Sort: PASSED_PRIMARY (by rank) > PASSED_RESERVE (by rank) > FAILED (by examId)
  const resultOrder: Record<string, number> = {
    PASSED_PRIMARY: 0,
    PASSED_RESERVE: 1,
    PENDING: 2,
    FAILED: 3,
  };

  filtered.sort((a, b) => {
    const orderA = resultOrder[a.result] ?? 99;
    const orderB = resultOrder[b.result] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    // Same result group — sort by rank if available, then examId
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return (a.student.examId || "").localeCompare(b.student.examId || "");
  });

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
