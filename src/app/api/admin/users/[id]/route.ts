import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const type = body.type || "student";

  try {
    if (type === "student") {
      const student = await prisma.student.update({
        where: { id: parseInt(id) },
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
      return NextResponse.json(student);
    } else {
      const data: Record<string, unknown> = {
        username: body.username,
        fullName: body.fullName,
        role: body.role,
      };
      if (body.password) {
        data.password = await bcrypt.hash(body.password, 12);
      }
      const admin = await prisma.admin.update({
        where: { id: parseInt(id) },
        data,
      });
      return NextResponse.json({ id: admin.id, username: admin.username, fullName: admin.fullName, role: admin.role });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const type = req.nextUrl.searchParams.get("type") || "student";

  try {
    if (type === "student") {
      await prisma.student.delete({ where: { id: parseInt(id) } });
    } else {
      await prisma.admin.delete({ where: { id: parseInt(id) } });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
