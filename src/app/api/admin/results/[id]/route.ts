import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { isViewer } from "@/lib/utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isViewer(session)) {
    return NextResponse.json({ error: "Viewer ไม่มีสิทธิ์แก้ไขข้อมูล" }, { status: 403 });
  }

  const { id } = await params;
  const { result, rank, remark } = await req.json();

  const existing = await prisma.examResult.findUnique({
    where: { id: parseInt(id) },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

  await writeAuditLog({
    userId: parseInt(session.user.id),
    userRole: session.user.role,
    action: "UPDATE_EXAM_RESULT",
    targetTable: "ExamResult",
    targetId: examResult.id,
    oldValue: { result: existing.result, rank: existing.rank, remark: existing.remark },
    newValue: { result, rank, remark },
  });

  if (result === "PASSED_PRIMARY" || result === "PASSED_RESERVE") {
    await prisma.enrollment.upsert({
      where: { studentId: examResult.studentId },
      create: { studentId: examResult.studentId },
      update: {},
    });
  }

  return NextResponse.json(examResult);
}
