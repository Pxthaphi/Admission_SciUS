import { cn } from "@/lib/utils";

type BadgeVariant = "pending" | "success" | "danger" | "info" | "warning";

const variantStyles: Record<BadgeVariant, string> = {
  pending: "bg-[var(--warning-light)] text-amber-700",
  success: "bg-[var(--primary-light)] text-green-700",
  danger: "bg-[var(--danger-light)] text-red-700",
  info: "bg-[var(--secondary-light)] text-blue-700",
  warning: "bg-[var(--warning-light)] text-amber-700",
};

const statusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "รอตรวจสอบ", variant: "pending" },
  REVISION: { label: "แก้ไข", variant: "warning" },
  APPROVED: { label: "ผ่าน", variant: "success" },
  ELIGIBLE: { label: "มีสิทธิ์สอบ", variant: "success" },
  INELIGIBLE: { label: "ไม่มีสิทธิ์สอบ", variant: "danger" },
  FAILED: { label: "ไม่ผ่าน", variant: "danger" },
  PASSED_PRIMARY: { label: "ผ่าน (ตัวจริง)", variant: "success" },
  PASSED_RESERVE: { label: "ผ่าน (สำรอง)", variant: "info" },
  CONFIRMED: { label: "ยืนยันสิทธิ์", variant: "success" },
  WAIVED: { label: "สละสิทธิ์", variant: "danger" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusMap[status] || { label: status, variant: "pending" as BadgeVariant };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", variantStyles[config.variant])}>
      {config.label}
    </span>
  );
}
