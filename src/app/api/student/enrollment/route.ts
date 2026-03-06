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

function getPrimaryPeriodStatus(
  now: Date,
  settings: PeriodSettings,
): "not_set" | "before" | "open" | "closed" {
  const start = settings.enrollment_start ? new Date(settings.enrollment_start) : null;
  const primaryEnd = settings.enrollment_primary_end ? new Date(settings.enrollment_primary_end) : null;
  if (!start || !primaryEnd) return "not_set";
  if (now < start) return "before";
  if (now > primaryEnd) return "closed";
  return "open";
}

// Auto-waive primary students who missed their deadline
async function autoWaivePrimary(settings: PeriodSettings) {
  const now = new Date();
  const primaryEnd = settings.enrollment_primary_end ? new Date(settings.enrollment_primary_end) : null;
  if (primaryEnd && now > primaryEnd) {
    await prisma.enrollment.updateMany({
      where: {
        confirmationStatus: "PENDING",
        student: { examResult: { result: "PASSED_PRIMARY" } },
      },
      data: { confirmationStatus: "WAIVED", confirmedAt: primaryEnd },
    });
  }
}

// Auto-waive reserve students whose round deadline has passed
async function autoWaiveExpiredRounds() {
  const now = new Date();
  const rounds = await prisma.reserveCallRound.findMany();
  for (const round of rounds) {
    if (now > round.deadline) {
      const pendingInRound = await prisma.enrollment.findMany({
        where: {
          confirmationStatus: "PENDING",
          student: {
            examResult: {
              result: "PASSED_RESERVE",
              rank: { gte: round.rankFrom, lte: round.rankTo },
            },
          },
        },
        select: { id: true },
      });
      if (pendingInRound.length > 0) {
        await prisma.enrollment.updateMany({
          where: { id: { in: pendingInRound.map((e) => e.id) } },
          data: { confirmationStatus: "WAIVED", confirmedAt: round.deadline },
        });
      }
    }
  }
}

// Find the active round for a given reserve rank
async function findActiveRound(rank: number) {
  const now = new Date();
  return prisma.reserveCallRound.findFirst({
    where: {
      rankFrom: { lte: rank },
      rankTo: { gte: rank },
      deadline: { gte: now },
    },
    orderBy: { roundNo: "desc" },
  });
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

  // Auto-waive expired
  await autoWaivePrimary(settings);
  await autoWaiveExpiredRounds();

  const enrollment = await prisma.enrollment.findUnique({ where: { studentId } }) as any;
  const documents = await prisma.document.findMany({
    where: {
      studentId,
      type: { in: ["ENROLLMENT_CONFIRM", "ENROLLMENT_CONTRACT", "SCHOOL_TRANSFER"] },
    },
    select: { type: true, fileUrl: true },
  });

  const now = new Date();

  if (examResult.result === "PASSED_PRIMARY") {
    const periodStatus = getPrimaryPeriodStatus(now, settings);
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
      canConfirmReserve: true,
      reserveRound: null,
      reserveQueueMessage: null,
    });
  }

  // PASSED_RESERVE — check if called in any active round
  const rank = examResult.rank;
  const activeRound = rank ? await findActiveRound(rank) : null;

  let periodStatus: "not_set" | "before" | "open" | "closed" = "not_set";
  let canConfirmReserve = false;
  let reserveQueueMessage: string | null = null;

  if (!activeRound) {
    // Check if there's a past round that included this rank (already expired)
    const pastRound = rank ? await prisma.reserveCallRound.findFirst({
      where: { rankFrom: { lte: rank }, rankTo: { gte: rank } },
      orderBy: { roundNo: "desc" },
    }) : null;

    if (pastRound && now > pastRound.deadline) {
      periodStatus = "closed";
      reserveQueueMessage = `รอบเรียกที่ ${pastRound.roundNo} หมดเวลาแล้ว`;
    } else {
      periodStatus = "before";
      reserveQueueMessage = "ยังไม่ถูกเรียกยืนยันสิทธิ์ กรุณารอประกาศจากทางโครงการ";
    }
  } else {
    periodStatus = "open";
    canConfirmReserve = true;
    reserveQueueMessage = `รอบเรียกที่ ${activeRound.roundNo} (ลำดับ ${activeRound.rankFrom}-${activeRound.rankTo}) ยืนยันภายใน ${new Date(activeRound.deadline).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
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
    reserveRound: activeRound ? {
      roundNo: activeRound.roundNo,
      rankFrom: activeRound.rankFrom,
      rankTo: activeRound.rankTo,
      deadline: activeRound.deadline.toISOString(),
    } : null,
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

  // Auto-waive expired
  await autoWaivePrimary(settings);
  await autoWaiveExpiredRounds();

  // Re-check this student's enrollment (might have been auto-waived)
  const currentEnrollment = await prisma.enrollment.findUnique({ where: { studentId } });
  if (currentEnrollment?.confirmationStatus !== "PENDING") {
    return NextResponse.json({ error: "สถานะยืนยันสิทธิ์ถูกเปลี่ยนแล้ว" }, { status: 400 });
  }

  const examResult = await prisma.examResult.findUnique({ where: { studentId } });
  if (!examResult) {
    return NextResponse.json({ error: "ไม่พบข้อมูลผลสอบ" }, { status: 400 });
  }

  if (examResult.result === "PASSED_PRIMARY") {
    const periodStatus = getPrimaryPeriodStatus(now, settings);
    if (periodStatus === "not_set") {
      return NextResponse.json({ error: "ยังไม่ได้กำหนดช่วงเวลายืนยันสิทธิ์" }, { status: 400 });
    }
    if (periodStatus === "before") {
      return NextResponse.json({ error: "ยังไม่ถึงช่วงเวลายืนยันสิทธิ์" }, { status: 400 });
    }
    if (periodStatus === "closed") {
      return NextResponse.json({ error: "หมดเวลายืนยันสิทธิ์แล้ว" }, { status: 400 });
    }
  } else {
    // PASSED_RESERVE — must be in an active round
    const rank = examResult.rank;
    if (!rank) {
      return NextResponse.json({ error: "ไม่พบข้อมูลลำดับ" }, { status: 400 });
    }
    const activeRound = await findActiveRound(rank);
    if (!activeRound) {
      return NextResponse.json({ error: "ยังไม่ถูกเรียกยืนยันสิทธิ์ หรือหมดเวลาของรอบเรียกแล้ว" }, { status: 400 });
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
