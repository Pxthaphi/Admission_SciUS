import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type PeriodSettings = {
  enrollment_start: string | null;
  enrollment_primary_end: string | null;
  enrollment_reserve_end: string | null;
};

async function getEnrollmentSettings(): Promise<PeriodSettings> {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["enrollment_start", "enrollment_primary_end", "enrollment_reserve_end"] } },
  });
  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });
  return {
    enrollment_start: map.enrollment_start || null,
    enrollment_primary_end: map.enrollment_primary_end || null,
    enrollment_reserve_end: map.enrollment_reserve_end || null,
  };
}

function getPeriodStatus(
  now: Date,
  result: string,
  settings: PeriodSettings,
  allPrimaryDone: boolean = false,
): "not_set" | "before" | "open" | "closed" {
  const start = settings.enrollment_start ? new Date(settings.enrollment_start) : null;
  const primaryEnd = settings.enrollment_primary_end ? new Date(settings.enrollment_primary_end) : null;
  const reserveEnd = settings.enrollment_reserve_end ? new Date(settings.enrollment_reserve_end) : null;

  if (result === "PASSED_PRIMARY") {
    if (!start || !primaryEnd) return "not_set";
    if (now < start) return "before";
    if (now > primaryEnd) return "closed";
    return "open";
  } else {
    // PASSED_RESERVE: opens after primary deadline OR when all primaries are done
    if (!start || !reserveEnd) return "not_set";
    if (now < start) return "before";
    if (now > reserveEnd) return "closed";
    // Open if past primary deadline OR all primaries have confirmed/waived
    if (primaryEnd && now > primaryEnd) return "open";
    if (allPrimaryDone) return "open";
    return "before";
  }
}

// Auto-waive students who missed their deadline
async function autoWaiveExpired(settings: PeriodSettings) {
  const now = new Date();
  const primaryEnd = settings.enrollment_primary_end ? new Date(settings.enrollment_primary_end) : null;
  const reserveEnd = settings.enrollment_reserve_end ? new Date(settings.enrollment_reserve_end) : null;

  // Auto-waive primary students past their deadline
  if (primaryEnd && now > primaryEnd) {
    await prisma.enrollment.updateMany({
      where: {
        confirmationStatus: "PENDING",
        student: { examResult: { result: "PASSED_PRIMARY" } },
      },
      data: { confirmationStatus: "WAIVED", confirmedAt: primaryEnd },
    });
  }

  // Auto-waive reserve students past their deadline
  if (reserveEnd && now > reserveEnd) {
    await prisma.enrollment.updateMany({
      where: {
        confirmationStatus: "PENDING",
        student: { examResult: { result: "PASSED_RESERVE" } },
      },
      data: { confirmationStatus: "WAIVED", confirmedAt: reserveEnd },
    });
  }
}

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

  const settings = await getEnrollmentSettings();

  // Auto-waive expired students before returning data
  await autoWaiveExpired(settings);

  const enrollment = await prisma.enrollment.findUnique({ where: { studentId } }) as any;
  const documents = await prisma.document.findMany({
    where: {
      studentId,
      type: { in: ["ENROLLMENT_CONFIRM", "ENROLLMENT_CONTRACT", "SCHOOL_TRANSFER"] },
    },
    select: { type: true, fileUrl: true },
  });

  const now = new Date();

  // Check if all primary students are done (confirmed or waived)
  const pendingPrimaryCount = await prisma.enrollment.count({
    where: {
      confirmationStatus: "PENDING",
      student: { examResult: { result: "PASSED_PRIMARY" } },
    },
  });
  const allPrimaryDone = pendingPrimaryCount === 0;

  const periodStatus = getPeriodStatus(now, examResult.result, settings, allPrimaryDone);

  // Reserve queue logic
  let canConfirmReserve = true;
  let reserveQueueMessage: string | null = null;

  if (examResult.result === "PASSED_RESERVE") {
    if (!allPrimaryDone) {
      // Primary students still pending
      canConfirmReserve = false;
      reserveQueueMessage = "รอตัวจริงยืนยัน/สละสิทธิ์ให้ครบก่อน";
    } else {
      // All primaries done, check reserve queue order
      const nextReserve = await prisma.enrollment.findFirst({
        where: {
          confirmationStatus: "PENDING",
          student: { examResult: { result: "PASSED_RESERVE" } },
        },
        include: { student: { include: { examResult: true } } },
        orderBy: { student: { examResult: { rank: "asc" } } },
      });

      if (nextReserve && nextReserve.studentId !== studentId) {
        canConfirmReserve = false;
        const nextRank = nextReserve.student.examResult?.rank;
        reserveQueueMessage = `รอตัวสำรองลำดับที่ ${nextRank} ยืนยัน/สละสิทธิ์ก่อน`;
      }
    }
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
    enrollmentStart: settings.enrollment_start || null,
    enrollmentPrimaryEnd: settings.enrollment_primary_end || null,
    enrollmentReserveEnd: settings.enrollment_reserve_end || null,
    periodStatus,
    canConfirmReserve,
    reserveQueueMessage,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = parseInt(session.user.id);
  const { confirmationStatus } = await req.json();

  const settings = await getEnrollmentSettings();
  const now = new Date();

  // Auto-waive expired first
  await autoWaiveExpired(settings);

  // Re-check this student's enrollment (might have been auto-waived)
  const currentEnrollment = await prisma.enrollment.findUnique({ where: { studentId } });
  if (currentEnrollment?.confirmationStatus !== "PENDING") {
    return NextResponse.json({ error: "สถานะยืนยันสิทธิ์ถูกเปลี่ยนแล้ว" }, { status: 400 });
  }

  const examResult = await prisma.examResult.findUnique({ where: { studentId } });
  if (!examResult) {
    return NextResponse.json({ error: "ไม่พบข้อมูลผลสอบ" }, { status: 400 });
  }

  // Check period based on result type
  const pendingPrimaryCount = await prisma.enrollment.count({
    where: {
      confirmationStatus: "PENDING",
      student: { examResult: { result: "PASSED_PRIMARY" } },
    },
  });
  const allPrimaryDone = pendingPrimaryCount === 0;
  const periodStatus = getPeriodStatus(now, examResult.result, settings, allPrimaryDone);

  if (periodStatus === "not_set") {
    return NextResponse.json({ error: "ยังไม่ได้กำหนดช่วงเวลายืนยันสิทธิ์" }, { status: 400 });
  }
  if (periodStatus === "before") {
    return NextResponse.json({ error: "ยังไม่ถึงช่วงเวลายืนยันสิทธิ์" }, { status: 400 });
  }
  if (periodStatus === "closed") {
    return NextResponse.json({ error: "หมดเวลายืนยันสิทธิ์แล้ว" }, { status: 400 });
  }

  // Reserve queue validation
  if (examResult.result === "PASSED_RESERVE") {
    if (!allPrimaryDone) {
      return NextResponse.json({ error: "ยังไม่สามารถยืนยันสิทธิ์ได้ รอตัวจริงยืนยัน/สละสิทธิ์ให้ครบก่อน" }, { status: 400 });
    }

    const nextReserve = await prisma.enrollment.findFirst({
      where: {
        confirmationStatus: "PENDING",
        student: { examResult: { result: "PASSED_RESERVE" } },
      },
      include: { student: { include: { examResult: true } } },
      orderBy: { student: { examResult: { rank: "asc" } } },
    });

    if (nextReserve && nextReserve.studentId !== studentId) {
      return NextResponse.json({ error: "ยังไม่ถึงลำดับของคุณ กรุณารอตัวสำรองลำดับก่อนหน้ายืนยัน/สละสิทธิ์ก่อน" }, { status: 400 });
    }
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
