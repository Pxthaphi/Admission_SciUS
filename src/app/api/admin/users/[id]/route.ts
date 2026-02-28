import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase";
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
      const old = await prisma.student.findUnique({ where: { id: parseInt(id) } });
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
      await writeAuditLog({
        userId: parseInt(session.user.id),
        userRole: session.user.role,
        action: "UPDATE_STUDENT",
        targetTable: "Student",
        targetId: student.id,
        oldValue: old ? { firstName: old.firstName, lastName: old.lastName, examId: old.examId } : null,
        newValue: { firstName: body.firstName, lastName: body.lastName, examId: body.examId },
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
      const old = await prisma.admin.findUnique({ where: { id: parseInt(id) } });
      const admin = await prisma.admin.update({ where: { id: parseInt(id) }, data });
      await writeAuditLog({
        userId: parseInt(session.user.id),
        userRole: session.user.role,
        action: "UPDATE_ADMIN",
        targetTable: "Admin",
        targetId: admin.id,
        oldValue: old ? { username: old.username, fullName: old.fullName, role: old.role } : null,
        newValue: { username: body.username, fullName: body.fullName, role: body.role },
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
      const old = await prisma.student.findUnique({ where: { id: parseInt(id) } });

      // Delete uploaded files from Supabase Storage
      const docs = await prisma.document.findMany({
        where: { studentId: parseInt(id) },
        select: { fileUrl: true },
      });
      const filePaths = docs.map((d) => d.fileUrl).filter(Boolean);
      if (filePaths.length > 0) {
        await supabaseAdmin.storage.from("admission").remove(filePaths);
      }

      await prisma.student.delete({ where: { id: parseInt(id) } });
      if (old) {
        await writeAuditLog({
          userId: parseInt(session.user.id),
          userRole: session.user.role,
          action: "DELETE_STUDENT",
          targetTable: "Student",
          targetId: parseInt(id),
          oldValue: { firstName: old.firstName, lastName: old.lastName, examId: old.examId },
        });
      }
    } else {
      const old = await prisma.admin.findUnique({ where: { id: parseInt(id) } });
      await prisma.admin.delete({ where: { id: parseInt(id) } });
      if (old) {
        await writeAuditLog({
          userId: parseInt(session.user.id),
          userRole: session.user.role,
          action: "DELETE_ADMIN",
          targetTable: "Admin",
          targetId: parseInt(id),
          oldValue: { username: old.username, fullName: old.fullName },
        });
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
