import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;

  if (!file || !type) {
    return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
  }

  const studentId = parseInt(session.user.id);
  const ext = file.name.split(".").pop() || "pdf";

  // Get student's national ID for filename
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { nationalId: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Map document type to folder name (English for storage compatibility)
  const folderMap: Record<string, string> = {
    INTENT_CONFIRM: "intent-confirm",
    FEE_PAYMENT: "fee-payment",
  };
  const folder = folderMap[type] || type.toLowerCase();
  const filePath = `documents/${folder}/${student.nationalId}.${ext}`;

  // Ensure bucket exists
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === "admission")) {
    await supabaseAdmin.storage.createBucket("admission", { public: true });
  }

  // Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from("admission")
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Store relative path instead of full Supabase URL
  const fileUrl = filePath;

  // Upsert document record
  const existing = await prisma.document.findFirst({
    where: { studentId, type: type as any },
  });

  if (existing) {
    // Delete old file from storage
    if (existing.fileUrl) {
      await supabaseAdmin.storage.from("admission").remove([existing.fileUrl]);
    }

    const doc = await prisma.document.update({
      where: { id: existing.id },
      data: { fileUrl },
    });
    return NextResponse.json(doc);
  }

  const doc = await prisma.document.create({
    data: { studentId, type: type as any, fileUrl },
  });

  return NextResponse.json(doc, { status: 201 });
}
