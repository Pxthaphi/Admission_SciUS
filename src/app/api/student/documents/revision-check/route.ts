import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = parseInt(session.user.id);

  const docReview = await prisma.documentReview.findUnique({
    where: { studentId },
    select: { status: true, revisionDocTypes: true, remark: true } as any,
  });

  return NextResponse.json({
    status: docReview?.status || "PENDING",
    revisionDocTypes: docReview?.revisionDocTypes || [],
    remark: docReview?.remark || null,
  });
}

// POST: After student re-uploads all revision docs, reset status to PENDING
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = parseInt(session.user.id);

  const [docReview, documents] = await Promise.all([
    prisma.documentReview.findUnique({
      where: { studentId },
      select: { id: true, status: true, revisionDocTypes: true } as any,
    }),
    prisma.document.findMany({
      where: { studentId },
      select: { type: true },
    }),
  ]);

  if (!docReview || docReview.status !== "REVISION") {
    return NextResponse.json({ error: "Not in revision status" }, { status: 400 });
  }

  const uploadedTypes = documents.map((d) => d.type);
  const revTypes = (docReview.revisionDocTypes || []) as string[];
  const allRevisionDocsUploaded = revTypes.every((t) =>
    uploadedTypes.includes(t as any)
  );

  if (!allRevisionDocsUploaded) {
    return NextResponse.json({ error: "Not all revision documents uploaded" }, { status: 400 });
  }

  // Reset to PENDING
  await prisma.documentReview.update({
    where: { id: docReview.id },
    data: {
      status: "PENDING",
      revisionDocTypes: [],
    } as any,
  });

  return NextResponse.json({ success: true, message: "Status reset to PENDING" });
}
