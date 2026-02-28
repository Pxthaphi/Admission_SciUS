import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { roomNumber, seatNumber } = await req.json();
  const studentId = parseInt(id);

  const room = await prisma.examRoom.upsert({
    where: { studentId },
    create: {
      studentId,
      roomNumber,
      seatNumber,
      updatedBy: parseInt(session.user.id),
    },
    update: {
      roomNumber,
      seatNumber,
      updatedBy: parseInt(session.user.id),
    },
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
    await prisma.examRoom.delete({ where: { studentId } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
