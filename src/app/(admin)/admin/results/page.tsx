"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { ExportButtons } from "@/components/shared/export-buttons";
import { useIsViewer } from "@/hooks/use-is-viewer";

type ResultRow = {
  id: number;
  studentId: number;
  examId: string;
  firstName: string;
  lastName: string;
  school: string;
  province: string;
  result: string;
  rank: number | null;
  remark: string | null;
};

const resultStatusOptions = [
  { value: "PENDING", label: "รอประกาศผล", color: "bg-amber-500" },
  { value: "FAILED", label: "ไม่ผ่าน", color: "bg-red-500" },
  { value: "PASSED_PRIMARY", label: "ผ่าน (ตัวจริง)", color: "bg-emerald-500" },
  { value: "PASSED_RESERVE", label: "ผ่าน (สำรอง)", color: "bg-blue-500" },
];

type ResultModalProps = {
  row: ResultRow;
  onSave: (result: string, rank: number | null, remark: string) => void;
  onClose: () => void;
};

function ResultChangeModal({ row, onSave, onClose }: ResultModalProps) {
  const [selected, setSelected] = useState(row.result);
  const [rank, setRank] = useState<number | null>(row.rank);
  const [remark, setRemark] = useState("");
  const isPassed = selected === "PASSED_PRIMARY" || selected === "PASSED_RESERVE";
  const needsRemark = selected === "FAILED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">เปลี่ยนผลสอบ</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{row.firstName} {row.lastName} ({row.examId})</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--text-secondary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[var(--text-primary)]">เลือกผลสอบ</label>
            <div className="grid gap-2">
              {resultStatusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelected(opt.value)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    selected === opt.value
                      ? `${opt.color} border-transparent text-white shadow-sm`
                      : "border-gray-200 bg-white text-[var(--text-primary)] hover:border-gray-300"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${selected === opt.value ? "bg-white" : "bg-gray-300"}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {isPassed && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">ลำดับที่</label>
              <input
                type="number"
                min={1}
                max={999}
                value={rank ?? ""}
                onChange={(e) => setRank(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="ระบุลำดับ"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          )}

          {needsRemark && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">หมายเหตุ / เหตุผล <span className="text-red-400">*</span></label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="ระบุเหตุผล..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
              />
            </div>
          )}

          {!needsRemark && selected !== row.result && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">หมายเหตุ (ไม่บังคับ)</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="ระบุหมายเหตุเพิ่มเติม..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
              />
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-[var(--text-secondary)] rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
            ยกเลิก
          </button>
          <button
            onClick={() => onSave(selected, isPassed ? rank : null, remark)}
            disabled={selected === row.result || (needsRemark && !remark.trim())}
            className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const isViewer = useIsViewer();
  const [data, setData] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusModalRow, setStatusModalRow] = useState<ResultRow | null>(null);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin/results").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (result: string, rank: number | null, remark: string) => {
    if (!statusModalRow) return;
    const res = await fetch(`/api/admin/results/${statusModalRow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result, rank, remark }),
    });
    if (res.ok) {
      toast.success("บันทึกสำเร็จ");
      setData((prev) => prev.map((r) => (r.id === statusModalRow.id ? { ...r, result, rank, remark } : r)));
      setStatusModalRow(null);
    } else {
      const err = await res.json();
      toast.error(err.error || "บันทึกไม่สำเร็จ");
    }
  };

  const columns: ColumnDef<ResultRow>[] = [
    { accessorKey: "examId", header: "เลขผู้สอบ" },
    { header: "ชื่อ-สกุล", cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}` },
    { accessorKey: "school", header: "โรงเรียน" },
    { accessorKey: "province", header: "จังหวัด" },
    {
      header: "ผลสอบ",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.original.result} />
          {row.original.remark && (
            <span className="text-[10px] text-orange-500 max-w-[120px] truncate" title={row.original.remark}>
              ({row.original.remark})
            </span>
          )}
        </div>
      ),
    },
    { accessorKey: "rank", header: "ลำดับ", cell: ({ row }) => row.original.rank ?? "-" },
    {
      id: "actions", header: "",
      cell: ({ row }) => {
        if (isViewer) return null;
        return (
          <button
            onClick={() => setStatusModalRow(row.original)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            เปลี่ยนสถานะ
          </button>
        );
      },
    },
  ];

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">ผลการสอบคัดเลือก</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">แสดงเฉพาะนักเรียนที่มีสิทธิ์สอบแล้ว</p>
        </div>
        <ExportButtons page="results" />
      </div>
      <DataTable columns={columns} data={data} searchPlaceholder="ค้นหาเลขผู้สอบ, ชื่อ, โรงเรียน..." />

      {statusModalRow && (
        <ResultChangeModal
          row={statusModalRow}
          onSave={handleSave}
          onClose={() => setStatusModalRow(null)}
        />
      )}
    </div>
  );
}
