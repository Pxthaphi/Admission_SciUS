"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatusChangeModal } from "@/components/shared/status-change-modal";
import { CheckCircle, XCircle, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";

type EligibilityRow = {
  id: number;
  studentId: number;
  examId: string;
  firstName: string;
  lastName: string;
  school: string;
  province: string;
  status: string;
  remark: string | null;
};

const eligibilityStatusOptions = [
  { value: "PENDING", label: "รอตรวจสอบ", color: "bg-amber-500" },
  { value: "ELIGIBLE", label: "มีสิทธิ์สอบ", color: "bg-emerald-500" },
  { value: "INELIGIBLE", label: "ไม่มีสิทธิ์สอบ", color: "bg-red-500" },
];

export default function EligibilityPage() {
  const [data, setData] = useState<EligibilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusModalRow, setStatusModalRow] = useState<EligibilityRow | null>(null);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin/eligibility").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusSave = async (status: string, remark: string) => {
    if (!statusModalRow) return;
    const res = await fetch(`/api/admin/eligibility/${statusModalRow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, remark }),
    });
    if (res.ok) {
      toast.success("บันทึกสำเร็จ");
      setData((prev) => prev.map((r) => (r.id === statusModalRow.id ? { ...r, status, remark } : r)));
      setStatusModalRow(null);
    } else {
      const err = await res.json();
      toast.error(err.error || "บันทึกไม่สำเร็จ");
    }
  };

  const handleBatchUpdate = async (newStatus: string) => {
    const pendingRows = data.filter((r) => r.status === "PENDING");
    if (pendingRows.length === 0) { toast.info("ไม่มีรายการที่รอตรวจสอบ"); return; }
    const label = newStatus === "ELIGIBLE" ? "มีสิทธิ์สอบ" : "ไม่มีสิทธิ์สอบ";
    const result = await Swal.fire({
      title: `อัปเดตทั้งหมด?`,
      text: `จะเปลี่ยนสถานะ ${pendingRows.length} รายการที่รอตรวจสอบเป็น "${label}"`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: newStatus === "ELIGIBLE" ? "var(--primary)" : "var(--danger)",
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "ยืนยัน",
    });
    if (!result.isConfirmed) return;
    let success = 0, failed = 0;
    for (const row of pendingRows) {
      const res = await fetch(`/api/admin/eligibility/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) success++; else failed++;
    }
    if (failed > 0) toast.error(`ไม่สำเร็จ ${failed} รายการ (เอกสารยังไม่ผ่าน)`);
    if (success > 0) toast.success(`อัปเดตสำเร็จ ${success}/${pendingRows.length} รายการ`);
    fetchData();
  };

  const columns: ColumnDef<EligibilityRow>[] = [
    { accessorKey: "examId", header: "เลขผู้สอบ" },
    { header: "ชื่อ-สกุล", cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}` },
    { accessorKey: "school", header: "โรงเรียน" },
    { accessorKey: "province", header: "จังหวัด" },
    {
      header: "สถานะ",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.original.status} />
          {row.original.remark && (
            <span className="text-[10px] text-orange-500 max-w-[120px] truncate" title={row.original.remark}>
              ({row.original.remark})
            </span>
          )}
        </div>
      ),
    },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <button
          onClick={() => setStatusModalRow(row.original)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          เปลี่ยนสถานะ
        </button>
      ),
    },
  ];

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">จัดการสิทธิ์สอบ</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">แสดงเฉพาะนักเรียนที่เอกสารผ่านการตรวจสอบแล้ว</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleBatchUpdate("ELIGIBLE")} className="flex items-center gap-1.5 px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors">
            <CheckCircle className="w-3.5 h-3.5" />อนุมัติทั้งหมดที่รอ
          </button>
          <button onClick={() => handleBatchUpdate("INELIGIBLE")} className="flex items-center gap-1.5 px-3 py-2 bg-[var(--danger)] text-white rounded-lg text-xs font-medium hover:opacity-90 transition-colors">
            <XCircle className="w-3.5 h-3.5" />ไม่อนุมัติทั้งหมดที่รอ
          </button>
        </div>
      </div>
      <DataTable columns={columns} data={data} searchPlaceholder="ค้นหาเลขผู้สอบ, ชื่อ, โรงเรียน..." />

      {statusModalRow && (
        <StatusChangeModal
          title="เปลี่ยนสถานะสิทธิ์สอบ"
          subtitle={`${statusModalRow.firstName} ${statusModalRow.lastName} (${statusModalRow.examId})`}
          currentStatus={statusModalRow.status}
          options={eligibilityStatusOptions}
          requireRemark={["INELIGIBLE"]}
          onSave={handleStatusSave}
          onClose={() => setStatusModalRow(null)}
        />
      )}
    </div>
  );
}
