import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { roomNumber, seatNumber } = await req.json();
  const studentId = parseInt(id);

  const old = await prisma.examRoom.findUnique({ where: { studentId } });

  const room = await prisma.examRoom.upsert({
    where: { studentId },
    create: { studentId, roomNumber, seatNumber, updatedBy: parseInt(session.user.id) },
    update: { roomNumber, seatNumber, updatedBy: parseInt(session.user.id) },
  });

  await writeAuditLog({
    userId: parseInt(session.user.id),
    userRole: session.user.role,
    action: old ? "UPDATE_EXAM_ROOM" : "CREATE_EXAM_ROOM",
    targetTable: "ExamRoom",
    targetId: room.id,
    oldValue: old ? { roomNumber: old.roomNumber, seatNumber: old.seatNumber } : null,
    newValue: { roomNumber, seatNumber },
  });

  return NextResponse.json(room);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const studentId = parseInt(id);

  try {
    const old = await prisma.examRoom.findUnique({ where: { studentId } });
    await prisma.examRoom.delete({ where: { studentId } });

    if (old) {
      await writeAuditLog({
        userId: parseInt(session.user.id),
        userRole: session.user.role,
        action: "DELETE_EXAM_ROOM",
        targetTable: "ExamRoom",
        targetId: old.id,
        oldValue: { roomNumber: old.roomNumber, seatNumber: old.seatNumber },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
