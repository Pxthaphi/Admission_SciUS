import { prisma } from "@/lib/prisma";

type AuditParams = {
  userId: number;
  userRole: string;
  action: string;
  targetTable: string;
  targetId: number;
  oldValue?: unknown;
  newValue?: unknown;
};

export async function writeAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userRole: params.userRole,
        action: params.action,
        targetTable: params.targetTable,
        targetId: params.targetId,
        oldValue: params.oldValue ? JSON.parse(JSON.stringify(params.oldValue)) : undefined,
        newValue: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : undefined,
      },
    });
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}
