import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = parseInt(session.user.id);

  const [docReview, eligibility, examResult, documents] = await Promise.all([
    prisma.documentReview.findUnique({ where: { studentId } }),
    prisma.examEligibility.findUnique({ where: { studentId } }),
    prisma.examResult.findUnique({ where: { studentId } }),
    prisma.document.findMany({ where: { studentId }, select: { type: true } }),
  ]);

  const uploadedTypes = documents.map((d) => d.type);

  return NextResponse.json({
    documentReview: docReview?.status || "PENDING",
    documentReviewRemark: docReview?.remark || null,
    eligibility: eligibility?.status || "PENDING",
    eligibilityRemark: eligibility?.remark || null,
    examResult: examResult?.result || "PENDING",
    examResultRemark: examResult?.remark || null,
    uploadedDocuments: uploadedTypes,
  });
}
