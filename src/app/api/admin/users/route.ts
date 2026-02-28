import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") || "student";

  if (type === "student") {
    const students = await prisma.student.findMany({ orderBy: { examId: "asc" } });
    return NextResponse.json(students);
  } else {
    const admins = await prisma.admin.findMany({
      select: { id: true, username: true, fullName: true, role: true, createdAt: true },
      orderBy: { id: "desc" },
    });
    return NextResponse.json(admins);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const type = body.type || "student";

  try {
    if (type === "student") {
      const student = await prisma.student.create({
        data: {
          nationalId: body.nationalId,
          examId: body.examId || null,
          prefix: body.prefix || null,
          firstName: body.firstName,
          lastName: body.lastName,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
          school: body.school || null,
          province: body.province || null,
          phone: body.phone || null,
          email: body.email || null,
        },
      });

      // Create related records
      await Promise.all([
        prisma.documentReview.create({ data: { studentId: student.id } }),
        prisma.examEligibility.create({ data: { studentId: student.id } }),
        prisma.examResult.create({ data: { studentId: student.id } }),
      ]);

      return NextResponse.json(student, { status: 201 });
    } else {
      const hashedPassword = await bcrypt.hash(body.password, 12);
      const admin = await prisma.admin.create({
        data: {
          username: body.username,
          password: hashedPassword,
          fullName: body.fullName,
          role: body.role || "ADMIN",
        },
      });
      return NextResponse.json({ id: admin.id, username: admin.username, fullName: admin.fullName, role: admin.role }, { status: 201 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
