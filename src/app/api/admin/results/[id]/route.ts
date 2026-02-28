import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { result, rank, remark } = await req.json();

  // Get the exam result record to find studentId
  const existing = await prisma.examResult.findUnique({
    where: { id: parseInt(id) },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Step validation: eligibility must be ELIGIBLE before setting exam result
  if (result === "PASSED_PRIMARY" || result === "PASSED_RESERVE") {
    const eligibility = await prisma.examEligibility.findUnique({
      where: { studentId: existing.studentId },
    });
    if (!eligibility || eligibility.status !== "ELIGIBLE") {
      return NextResponse.json(
        { error: "ต้องให้สิทธิ์สอบก่อนจึงจะบันทึกผลสอบได้" },
        { status: 400 }
      );
    }
  }

  const examResult = await prisma.examResult.update({
    where: { id: parseInt(id) },
    data: {
      result,
      rank: result === "PASSED_PRIMARY" || result === "PASSED_RESERVE" ? rank : null,
      remark: remark || null,
      updatedBy: parseInt(session.user.id),
    },
  });

  // Auto-create enrollment record for passed students
  if (result === "PASSED_PRIMARY" || result === "PASSED_RESERVE") {
    await prisma.enrollment.upsert({
      where: { studentId: examResult.studentId },
      create: { studentId: examResult.studentId },
      update: {},
    });
  }

  return NextResponse.json(examResult);
}
