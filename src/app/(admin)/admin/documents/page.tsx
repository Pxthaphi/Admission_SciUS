"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatusChangeModal } from "@/components/shared/status-change-modal";
import { CheckCircle, FileText, Eye, X, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { getFileUrl } from "@/lib/utils";
import { ExportButtons } from "@/components/shared/export-buttons";
import { useIsViewer } from "@/hooks/use-is-viewer";

type DocRow = {
  id: number;
  studentId: number;
  examId: string;
  firstName: string;
  lastName: string;
  school: string;
  province: string;
  status: string;
  remark: string | null;
  revisionDocTypes: string[];
  documents: { type: string; fileUrl: string }[];
};

const docTypeLabel: Record<string, string> = {
  INTENT_CONFIRM: "แจ้งความจำนง",
  FEE_PAYMENT: "ชำระค่าธรรมเนียม",
};

const allDocTypes = ["INTENT_CONFIRM", "FEE_PAYMENT"] as const;

const docStatusOptions = [
  { value: "PENDING", label: "รอตรวจสอบ", color: "bg-amber-500" },
  { value: "REVISION", label: "แก้ไข", color: "bg-orange-500" },
  { value: "APPROVED", label: "ผ่าน", color: "bg-emerald-500" },
];

export default function DocumentsPage() {
  const isViewer = useIsViewer();
  const [data, setData] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalRow, setModalRow] = useState<DocRow | null>(null);
  const [statusModalRow, setStatusModalRow] = useState<DocRow | null>(null);
  const [revisionDocs, setRevisionDocs] = useState<string[]>([]);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin/documents").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusSave = async (status: string, remark: string) => {
    if (!statusModalRow) return;
    const res = await fetch(`/api/admin/documents/${statusModalRow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, remark, revisionDocTypes: status === "REVISION" ? revisionDocs : [] }),
    });
    if (res.ok) {
      toast.success("บันทึกสำเร็จ");
      setData((prev) => prev.map((r) => (r.id === statusModalRow.id ? { ...r, status, remark, revisionDocTypes: status === "REVISION" ? revisionDocs : [] } : r)));
      setStatusModalRow(null);
      setRevisionDocs([]);
    } else toast.error("บันทึกไม่สำเร็จ");
  };

  const handleBatchApprove = async () => {
    const pendingRows = data.filter((r) => r.status === "PENDING" && r.documents.length > 0);
    if (pendingRows.length === 0) { toast.info("ไม่มีรายการที่รอตรวจสอบ (ที่มีเอกสาร)"); return; }
    const result = await Swal.fire({
      title: "อนุมัติเอกสารทั้งหมด?",
      text: `จะอนุมัติ ${pendingRows.length} รายการที่รอตรวจสอบและมีเอกสารแล้ว`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "var(--primary)",
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "อนุมัติทั้งหมด",
    });
    if (!result.isConfirmed) return;
    let success = 0;
    for (const row of pendingRows) {
      const res = await fetch(`/api/admin/documents/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (res.ok) success++;
    }
    toast.success(`อนุมัติสำเร็จ ${success}/${pendingRows.length} รายการ`);
    fetchData();
  };

  const columns: ColumnDef<DocRow>[] = [
    { accessorKey: "examId", header: "เลขผู้สอบ" },
    { header: "ชื่อ-สกุล", cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}` },
    { accessorKey: "school", header: "โรงเรียน" },
    {
      header: "เอกสาร",
      cell: ({ row }) => {
        const docCount = row.original.documents.length;
        return (
          <button
            onClick={() => setModalRow(row.original)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
          >
            <FileText className="w-3.5 h-3.5" />
            ดูเอกสาร ({docCount}/{allDocTypes.length})
          </button>
        );
      },
    },
    {
      header: "สถานะ",
      cell: ({ row }) => {
        const allUploaded = allDocTypes.every((t) => row.original.documents.some((d) => d.type === t));
        if (!allUploaded && row.original.status === "PENDING") {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
              รอนักเรียนอัปโหลดเอกสาร
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={row.original.status} />
            {row.original.remark && (
              <span className="text-[10px] text-orange-500 max-w-[120px] truncate" title={row.original.remark}>
                ({row.original.remark})
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions", header: "",
      cell: ({ row }) => {
        const allUploaded = allDocTypes.every((t) => row.original.documents.some((d) => d.type === t));
        if (isViewer) return null;
        return (
          <button
            onClick={() => setStatusModalRow(row.original)}
            disabled={!allUploaded && row.original.status === "PENDING"}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">ตรวจสอบเอกสาร</h1>
        <div className="flex items-center gap-2">
          <ExportButtons page="documents" />
          {!isViewer && (
            <button onClick={handleBatchApprove} className="flex items-center gap-1.5 px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors">
              <CheckCircle className="w-3.5 h-3.5" />อนุมัติทั้งหมดที่รอ
            </button>
          )}
        </div>
      </div>
      <DataTable columns={columns} data={data} searchPlaceholder="ค้นหาเลขผู้สอบ, ชื่อ, โรงเรียน..." />

      {/* Document View Modal */}
      {modalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalRow(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">เอกสารของนักเรียน</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{modalRow.firstName} {modalRow.lastName} ({modalRow.examId})</p>
              </div>
              <button onClick={() => setModalRow(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--text-secondary)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {allDocTypes.map((type) => {
                const doc = modalRow.documents.find((d) => d.type === type);
                const hasDoc = !!doc;
                return (
                  <div key={type} className={`flex items-center justify-between p-3 rounded-xl border ${hasDoc ? "border-gray-100 bg-white" : "border-dashed border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasDoc ? "bg-[var(--primary-light)] text-[var(--primary)]" : "bg-gray-100 text-gray-300"}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${hasDoc ? "text-[var(--text-primary)]" : "text-gray-400"}`}>{docTypeLabel[type]}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{hasDoc ? "อัปโหลดแล้ว" : "ยังไม่ได้อัปโหลด"}</p>
                      </div>
                    </div>
                    {hasDoc ? (
                      <a href={getFileUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors">
                        <Eye className="w-3.5 h-3.5" /> ดู
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-300 cursor-not-allowed">
                        <Eye className="w-3.5 h-3.5" /> ดู
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {statusModalRow && (
        <StatusChangeModal
          title="เปลี่ยนสถานะเอกสาร"
          subtitle={`${statusModalRow.firstName} ${statusModalRow.lastName} (${statusModalRow.examId})`}
          currentStatus={statusModalRow.status}
          options={docStatusOptions}
          requireRemark={["REVISION"]}
          onSave={handleStatusSave}
          onClose={() => { setStatusModalRow(null); setRevisionDocs([]); }}
          revisionDocTypes={revisionDocs}
          onRevisionDocTypesChange={setRevisionDocs}
          docTypeOptions={allDocTypes.map((t) => ({ value: t, label: docTypeLabel[t] }))}
        />
      )}
    </div>
  );
}
