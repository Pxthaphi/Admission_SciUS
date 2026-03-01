import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Auto-waive expired students
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["enrollment_primary_end", "enrollment_reserve_end"] } },
  });
  const settingsMap: Record<string, string> = {};
  settings.forEach((s) => { settingsMap[s.key] = s.value; });
  const now = new Date();
  const primaryEnd = settingsMap.enrollment_primary_end ? new Date(settingsMap.enrollment_primary_end) : null;
  const reserveEnd = settingsMap.enrollment_reserve_end ? new Date(settingsMap.enrollment_reserve_end) : null;

  if (primaryEnd && now > primaryEnd) {
    await prisma.enrollment.updateMany({
      where: {
        confirmationStatus: "PENDING",
        student: { examResult: { result: "PASSED_PRIMARY" } },
      },
      data: { confirmationStatus: "WAIVED", confirmedAt: primaryEnd },
    });
  }
  if (reserveEnd && now > reserveEnd) {
    await prisma.enrollment.updateMany({
      where: {
        confirmationStatus: "PENDING",
        student: { examResult: { result: "PASSED_RESERVE" } },
      },
      data: { confirmationStatus: "WAIVED", confirmedAt: reserveEnd },
    });
  }

  // Auto-create enrollment for students who passed but don't have enrollment yet
  const passedWithoutEnrollment = await prisma.examResult.findMany({
    where: {
      result: { in: ["PASSED_PRIMARY", "PASSED_RESERVE"] },
      student: { enrollment: null },
    },
    select: { studentId: true },
  });

  if (passedWithoutEnrollment.length > 0) {
    await prisma.enrollment.createMany({
      data: passedWithoutEnrollment.map((r) => ({ studentId: r.studentId })),
      skipDuplicates: true,
    });
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
    orderBy: { student: { examId: "asc" } },
  });

  const resultOrder: Record<string, number> = {
    PASSED_PRIMARY: 0,
    PASSED_RESERVE: 1,
    PENDING: 2,
    FAILED: 3,
  };

  const mapped = enrollments.map((e: any) => ({
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
    documentRemark: e.documentRemark || null,
    revisionDocTypes: e.revisionDocTypes || [],
    documents: e.student.documents,
  }));

  mapped.sort((a, b) => {
    const oa = resultOrder[a.result] ?? 9;
    const ob = resultOrder[b.result] ?? 9;
    if (oa !== ob) return oa - ob;
    return (a.rank ?? 9999) - (b.rank ?? 9999);
  });

  return NextResponse.json(mapped);
}
