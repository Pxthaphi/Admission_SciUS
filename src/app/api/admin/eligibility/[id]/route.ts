import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status, remark } = await req.json();

  // Get the eligibility record to find studentId
  const existing = await prisma.examEligibility.findUnique({
    where: { id: parseInt(id) },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Step validation: documentReview must be APPROVED before setting eligibility
  if (status === "ELIGIBLE") {
    const docReview = await prisma.documentReview.findUnique({
      where: { studentId: existing.studentId },
    });
    if (!docReview || docReview.status !== "APPROVED") {
      return NextResponse.json(
        { error: "ต้องอนุมัติเอกสารก่อนจึงจะให้สิทธิ์สอบได้" },
        { status: 400 }
      );
    }
  }

  const eligibility = await prisma.examEligibility.update({
    where: { id: parseInt(id) },
    data: { status, remark: remark || null, updatedBy: parseInt(session.user.id) },
  });

  return NextResponse.json(eligibility);
}
