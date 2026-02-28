import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const students = await prisma.student.findMany({
    include: { examRoom: true },
    where: { examEligibility: { status: "ELIGIBLE" } },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(
    students.map((s) => ({
      id: s.examRoom?.id || s.id,
      studentId: s.id,
      examId: s.examId || "-",
      firstName: s.firstName,
      lastName: s.lastName,
      school: s.school || "-",
      province: s.province || "-",
      roomNumber: s.examRoom?.roomNumber || "",
      seatNumber: s.examRoom?.seatNumber || "",
    }))
  );
}
