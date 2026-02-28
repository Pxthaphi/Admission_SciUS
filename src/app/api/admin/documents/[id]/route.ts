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
  const { status, remark, revisionDocTypes } = await req.json();

  const old = await prisma.documentReview.findUnique({ where: { id: parseInt(id) } });

  const review = await prisma.documentReview.update({
    where: { id: parseInt(id) },
    data: {
      status,
      remark: remark || null,
      revisionDocTypes: status === "REVISION" ? (revisionDocTypes || []) : [],
      reviewedBy: parseInt(session.user.id),
      reviewedAt: new Date(),
    } as any,
  });

  await writeAuditLog({
    userId: parseInt(session.user.id),
    userRole: session.user.role,
    action: "UPDATE_DOCUMENT_REVIEW",
    targetTable: "DocumentReview",
    targetId: review.id,
    oldValue: { status: old?.status, remark: old?.remark },
    newValue: { status, remark, revisionDocTypes: status === "REVISION" ? revisionDocTypes : [] },
  });

  return NextResponse.json(review);
}
