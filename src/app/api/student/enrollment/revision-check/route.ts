import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST: After student re-uploads all enrollment revision docs, reset status to PENDING
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = parseInt(session.user.id);

  const [enrollment, documents] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { studentId },
    }) as any,
    prisma.document.findMany({
      where: {
        studentId,
        type: { in: ["ENROLLMENT_CONFIRM", "ENROLLMENT_CONTRACT", "SCHOOL_TRANSFER"] },
      },
      select: { type: true },
    }),
  ]);

  if (!enrollment || enrollment.documentReviewStatus !== "REVISION") {
    return NextResponse.json({ error: "Not in revision status" }, { status: 400 });
  }

  const uploadedTypes = documents.map((d: any) => d.type);
  const revTypes = (enrollment.revisionDocTypes || []) as string[];
  const allDone = revTypes.every((t: string) => uploadedTypes.includes(t));

  if (!allDone) {
    return NextResponse.json({ error: "Not all revision documents uploaded" }, { status: 400 });
  }

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      documentReviewStatus: "PENDING",
      revisionDocTypes: [],
    } as any,
  });

  return NextResponse.json({ success: true });
}
