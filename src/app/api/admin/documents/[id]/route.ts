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

  const review = await prisma.documentReview.update({
    where: { id: parseInt(id) },
    data: {
      status,
      remark: remark || null,
      reviewedBy: parseInt(session.user.id),
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json(review);
}
