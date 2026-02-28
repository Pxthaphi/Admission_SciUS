import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const old = await prisma.enrollment.findUnique({ where: { id: parseInt(id) } });

  const data: Record<string, unknown> = {
    reviewedBy: parseInt(session.user.id),
  };

  if (body.documentReviewStatus) {
    data.documentReviewStatus = body.documentReviewStatus;
    if (body.documentReviewStatus === "REVISION") {
      data.revisionDocTypes = body.revisionDocTypes || [];
      data.documentRemark = body.remark || null;
    } else {
      data.revisionDocTypes = [];
      if (body.documentReviewStatus === "APPROVED") {
        data.documentRemark = null;
      }
    }
  }
  if (body.remark !== undefined && !body.documentReviewStatus) {
    data.documentRemark = body.remark || null;
  }

  if (body.confirmationStatus) {
    data.confirmationStatus = body.confirmationStatus;
    if (body.confirmationStatus === "CONFIRMED" || body.confirmationStatus === "WAIVED") {
      data.confirmedAt = new Date();
    }
  }

  const enrollment = await prisma.enrollment.update({
    where: { id: parseInt(id) },
    data: data as any,
  });

  await writeAuditLog({
    userId: parseInt(session.user.id),
    userRole: session.user.role,
    action: "UPDATE_ENROLLMENT",
    targetTable: "Enrollment",
    targetId: enrollment.id,
    oldValue: { documentReviewStatus: old?.documentReviewStatus, confirmationStatus: old?.confirmationStatus },
    newValue: { documentReviewStatus: body.documentReviewStatus, confirmationStatus: body.confirmationStatus, revisionDocTypes: body.revisionDocTypes, remark: body.remark },
  });

  return NextResponse.json(enrollment);
}
