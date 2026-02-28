import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = parseInt(session.user.id);
  const { type } = await req.json();

  const doc = await prisma.document.findFirst({
    where: { studentId, type },
  });

  if (!doc) {
    return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });
  }

  // Delete from Supabase Storage
  if (doc.fileUrl) {
    const pathToDelete = doc.fileUrl.startsWith("http") ? null : doc.fileUrl;
    if (pathToDelete) {
      const { error } = await supabaseAdmin.storage.from("admission").remove([pathToDelete]);
      if (error) {
        console.error("Supabase storage delete error:", error, "path:", pathToDelete);
      }
    }
  }

  await prisma.document.delete({ where: { id: doc.id } });

  return NextResponse.json({ success: true });
}
