import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { isViewer } from "@/lib/utils";

// Auto-waive reserve students whose round deadline has passed
async function autoWaiveExpiredRounds() {
  const now = new Date();
  const rounds = await prisma.reserveCallRound.findMany();

  for (const round of rounds) {
    if (now > round.deadline) {
      // Find reserve students in this round's rank range who are still PENDING
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

export async function GET() {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await autoWaiveExpiredRounds();

  const rounds = await prisma.reserveCallRound.findMany({
    orderBy: { roundNo: "asc" },
  });

  return NextResponse.json(rounds);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isViewer(session)) {
    return NextResponse.json({ error: "Viewer ไม่มีสิทธิ์แก้ไขข้อมูล" }, { status: 403 });
  }

  const { rankFrom, rankTo, deadline } = await req.json();

  if (!rankFrom || !rankTo || !deadline) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }
  if (rankFrom > rankTo) {
    return NextResponse.json({ error: "ลำดับเริ่มต้นต้องน้อยกว่าหรือเท่ากับลำดับสิ้นสุด" }, { status: 400 });
  }

  // Get next round number
  const lastRound = await prisma.reserveCallRound.findFirst({
    orderBy: { roundNo: "desc" },
  });
  const roundNo = (lastRound?.roundNo || 0) + 1;

  const round = await prisma.reserveCallRound.create({
    data: {
      roundNo,
      rankFrom,
      rankTo,
      deadline: new Date(deadline),
      createdBy: parseInt(session.user.id),
    },
  });

  await writeAuditLog({
    userId: parseInt(session.user.id),
    userRole: session.user.role,
    action: "CREATE_RESERVE_ROUND",
    targetTable: "ReserveCallRound",
    targetId: round.id,
    newValue: { roundNo, rankFrom, rankTo, deadline },
  });

  return NextResponse.json(round);
}
