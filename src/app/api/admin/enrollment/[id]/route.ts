import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {
    reviewedBy: parseInt(session.user.id),
  };

  if (body.documentReviewStatus) {
    data.documentReviewStatus = body.documentReviewStatus;
  }
  if (body.confirmationStatus) {
    data.confirmationStatus = body.confirmationStatus;
    if (body.confirmationStatus === "CONFIRMED" || body.confirmationStatus === "WAIVED") {
      data.confirmedAt = new Date();
    }
  }

  const enrollment = await prisma.enrollment.update({
    where: { id: parseInt(id) },
    data,
  });

  return NextResponse.json(enrollment);
}
