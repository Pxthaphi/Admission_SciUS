import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = parseInt(session.user.id);

  const examResult = await prisma.examResult.findUnique({ where: { studentId } });
  const isPassed = examResult?.result === "PASSED_PRIMARY" || examResult?.result === "PASSED_RESERVE";

  if (!isPassed) {
    return NextResponse.json({ allowed: false });
  }

  const enrollment = await prisma.enrollment.findUnique({ where: { studentId } }) as any;
  const documents = await prisma.document.findMany({
    where: {
      studentId,
      type: { in: ["ENROLLMENT_CONFIRM", "ENROLLMENT_CONTRACT", "SCHOOL_TRANSFER"] },
    },
    select: { type: true, fileUrl: true },
  });

  // Get enrollment period settings
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["enrollment_start", "enrollment_end"] } },
  });
  const settingsMap: Record<string, string> = {};
  settings.forEach((s) => { settingsMap[s.key] = s.value; });

  const now = new Date();
  const start = settingsMap.enrollment_start ? new Date(settingsMap.enrollment_start) : null;
  const end = settingsMap.enrollment_end ? new Date(settingsMap.enrollment_end) : null;

  let periodStatus: "not_set" | "before" | "open" | "closed" = "not_set";
  if (start && end) {
    if (now < start) periodStatus = "before";
    else if (now > end) periodStatus = "closed";
    else periodStatus = "open";
  }

  return NextResponse.json({
    allowed: true,
    result: examResult.result,
    rank: examResult.rank,
    confirmationStatus: enrollment?.confirmationStatus || "PENDING",
    documentReviewStatus: enrollment?.documentReviewStatus || "PENDING",
    documentRemark: enrollment?.documentRemark || null,
    revisionDocTypes: enrollment?.revisionDocTypes || [],
    documents,
    enrollmentStart: settingsMap.enrollment_start || null,
    enrollmentEnd: settingsMap.enrollment_end || null,
    periodStatus,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = parseInt(session.user.id);
  const { confirmationStatus } = await req.json();

  // Check enrollment period
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["enrollment_start", "enrollment_end"] } },
  });
  const settingsMap: Record<string, string> = {};
  settings.forEach((s) => { settingsMap[s.key] = s.value; });

  const now = new Date();
  const start = settingsMap.enrollment_start ? new Date(settingsMap.enrollment_start) : null;
  const end = settingsMap.enrollment_end ? new Date(settingsMap.enrollment_end) : null;

  if (!start || !end) {
    return NextResponse.json({ error: "ยังไม่ได้กำหนดช่วงเวลายืนยันสิทธิ์" }, { status: 400 });
  }
  if (now < start) {
    return NextResponse.json({ error: `ยังไม่ถึงช่วงเวลายืนยันสิทธิ์ (เปิดวันที่ ${start.toLocaleDateString("th-TH")})` }, { status: 400 });
  }
  if (now > end) {
    return NextResponse.json({ error: "หมดเวลายืนยันสิทธิ์แล้ว ระบบตัดสิทธิ์อัตโนมัติ" }, { status: 400 });
  }

  const enrollment = await prisma.enrollment.update({
    where: { studentId },
    data: {
      confirmationStatus,
      confirmedAt: new Date(),
    },
  });

  return NextResponse.json(enrollment);
}
