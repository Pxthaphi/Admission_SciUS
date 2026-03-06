import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { isViewer } from "@/lib/utils";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isViewer(session)) {
    return NextResponse.json({ error: "Viewer ไม่มีสิทธิ์แก้ไขข้อมูล" }, { status: 403 });
  }

  const { id } = await params;
  const roundId = parseInt(id);

  const round = await prisma.reserveCallRound.findUnique({ where: { id: roundId } });
  if (!round) {
    return NextResponse.json({ error: "ไม่พบข้อมูลรอบเรียก" }, { status: 404 });
  }

  await prisma.reserveCallRound.delete({ where: { id: roundId } });

  await writeAuditLog({
    userId: parseInt(session.user.id),
    userRole: session.user.role,
    action: "DELETE_RESERVE_ROUND",
    targetTable: "ReserveCallRound",
    targetId: roundId,
    oldValue: round,
  });

  return NextResponse.json({ success: true });
}
