"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Settings, Save, Calendar, FileText, Eye, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getFileUrl } from "@/lib/utils";
import { StatusChangeModal } from "@/components/shared/status-change-modal";
import DatePicker, { registerLocale } from "react-datepicker";
import { th } from "date-fns/locale";

registerLocale("th", th);

type EnrollmentRow = {
  id: number;
  studentId: number;
  examId: string;
  firstName: string;
  lastName: string;
  school: string;
  province: string;
  result: string;
  rank: number | null;
  confirmationStatus: string;
  documentReviewStatus: string;
  documentRemark: string | null;
  revisionDocTypes: string[];
  documents: { type: string; fileUrl: string }[];
};

const docTypeLabel: Record<string, string> = {
  ENROLLMENT_CONFIRM: "ยืนยันรายงานตัว",
  ENROLLMENT_CONTRACT: "สัญญามอบตัว",
  SCHOOL_TRANSFER: "ย้ายโรงเรียน",
};

const allEnrollDocTypes = ["ENROLLMENT_CONFIRM", "ENROLLMENT_CONTRACT", "SCHOOL_TRANSFER"] as const;

export default function EnrollmentPage() {
  const [data, setData] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [enrollStart, setEnrollStart] = useState<Date | null>(null);
  const [enrollEnd, setEnrollEnd] = useState<Date | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [modalRow, setModalRow] = useState<EnrollmentRow | null>(null);
  const [statusRow, setStatusRow] = useState<EnrollmentRow | null>(null);
  const [revisionDocs, setRevisionDocs] = useState<string[]>([]);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin/enrollment").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  };

  const fetchSettings = () => {
    fetch("/api/admin/settings").then((r) => r.json()).then((s) => {
      setEnrollStart(s.enrollment_start ? new Date(s.enrollment_start) : null);
      setEnrollEnd(s.enrollment_end ? new Date(s.enrollment_end) : null);
    });
  };

  useEffect(() => { fetchData(); fetchSettings(); }, []);

  const handleStatusSave = async (status: string, remark: string) => {
    if (!statusRow) return;
    const res = await fetch(`/api/admin/enrollment/${statusRow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentReviewStatus: status,
        remark,
        revisionDocTypes: status === "REVISION" ? revisionDocs : [],
      }),
    });
    if (res.ok) {
      toast.success("บันทึกสถานะเอกสารสำเร็จ");
      setStatusRow(null);
      setRevisionDocs([]);
      fetchData();
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error || "บันทึกไม่สำเร็จ");
    }
  };

  const handleSaveSettings = async () => {
    if (!enrollStart || !enrollEnd) { toast.error("กรุณากรอกวันเริ่มต้นและสิ้นสุด"); return; }
    if (enrollStart >= enrollEnd) { toast.error("วันเริ่มต้นต้องก่อนวันสิ้นสุด"); return; }
    setSavingSettings(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollment_start: enrollStart.toISOString(), enrollment_end: enrollEnd.toISOString() }),
    });
    if (res.ok) { toast.success("บันทึกช่วงเวลาสำเร็จ"); setShowSettings(false); }
    else toast.error("บันทึกไม่สำเร็จ");
    setSavingSettings(false);
  };

  const getPeriodLabel = () => {
    if (!enrollStart || !enrollEnd) return "ยังไม่ได้กำหนด";
    const fmt = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const now = new Date();
    const isOpen = now >= enrollStart && now <= enrollEnd;
    const isClosed = now > enrollEnd;
    return `${fmt(enrollStart)} - ${fmt(enrollEnd)} ${isOpen ? "(เปิดอยู่)" : isClosed ? "(ปิดแล้ว)" : "(ยังไม่เปิด)"}`;
  };

  const columns: ColumnDef<EnrollmentRow>[] = [
    { accessorKey: "examId", header: "เลขผู้สอบ" },
    { header: "ชื่อ-สกุล", cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}` },
    { accessorKey: "school", header: "โรงเรียน" },
    { header: "ผลสอบ", cell: ({ row }) => <StatusBadge status={row.original.result} /> },
    { accessorKey: "rank", header: "ลำดับ", cell: ({ row }) => row.original.rank ?? "-" },
    {
      header: "ยืนยันสิทธิ์",
      cell: ({ row }) => <StatusBadge status={row.original.confirmationStatus} />,
    },
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
            ดูเอกสาร ({docCount}/{allEnrollDocTypes.length})
          </button>
        );
      },
    },
    {
      header: "สถานะเอกสาร",
      cell: ({ row }) => (
        <button
          onClick={() => {
            setStatusRow(row.original);
            setRevisionDocs(row.original.revisionDocTypes || []);
          }}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <StatusBadge status={row.original.documentReviewStatus} />
            <Pencil className="w-3 h-3 text-[var(--text-secondary)]" />
          </div>
        </button>
      ),
    },
  ];

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">รายงานตัวและมอบตัว</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">แสดงเฉพาะนักเรียนที่ผ่านการสอบคัดเลือกแล้ว</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          ตั้งค่าช่วงเวลา
        </button>
      </div>

      {/* Period info */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        <Calendar className="w-4 h-4 text-blue-500" />
        <span className="text-xs text-blue-700">ช่วงเวลายืนยันสิทธิ์: {getPeriodLabel()}</span>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white border border-[var(--border)] rounded-xl p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">กำหนดช่วงเวลายืนยันสิทธิ์</h3>
          <p className="text-xs text-[var(--text-secondary)]">นักเรียนจะยืนยันสิทธิ์ได้เฉพาะในช่วงเวลาที่กำหนด หากเกินกำหนดจะถูกตัดสิทธิ์อัตโนมัติ</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">วันเริ่มต้น</label>
              <DatePicker
                selected={enrollStart}
                onChange={(date: Date | null) => setEnrollStart(date)}
                locale="th"
                dateFormat="dd/MM/yyyy HH:mm"
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="เวลา"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                placeholderText="เลือกวันเริ่มต้น"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                wrapperClassName="w-full"
                isClearable
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">วันสิ้นสุด</label>
              <DatePicker
                selected={enrollEnd}
                onChange={(date: Date | null) => setEnrollEnd(date)}
                locale="th"
                dateFormat="dd/MM/yyyy HH:mm"
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="เวลา"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                placeholderText="เลือกวันสิ้นสุด"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                wrapperClassName="w-full"
                minDate={enrollStart || undefined}
                isClearable
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {savingSettings ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={data} searchPlaceholder="ค้นหาเลขผู้สอบ, ชื่อ, โรงเรียน..." />

      {/* Document Modal */}
      {modalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalRow(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">เอกสารรายงานตัว</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{modalRow.firstName} {modalRow.lastName} ({modalRow.examId})</p>
              </div>
              <button onClick={() => setModalRow(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--text-secondary)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {allEnrollDocTypes.map((type) => {
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
                      <a
                        href={getFileUrl(doc.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        ดู
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-300 cursor-not-allowed">
                        <Eye className="w-3.5 h-3.5" />
                        ดู
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal for Document Review */}
      {statusRow && (
        <StatusChangeModal
          title="เปลี่ยนสถานะเอกสารรายงานตัว"
          subtitle={`${statusRow.firstName} ${statusRow.lastName} (${statusRow.examId})`}
          currentStatus={statusRow.documentReviewStatus}
          options={[
            { value: "PENDING", label: "รอตรวจสอบ", color: "bg-[var(--warning)]" },
            { value: "REVISION", label: "ต้องแก้ไข", color: "bg-orange-500" },
            { value: "APPROVED", label: "อนุมัติ", color: "bg-[var(--primary)]" },
          ]}
          requireRemark={["REVISION"]}
          revisionDocTypes={revisionDocs}
          onRevisionDocTypesChange={setRevisionDocs}
          docTypeOptions={allEnrollDocTypes.map((t) => ({ value: t, label: docTypeLabel[t] }))}
          onSave={handleStatusSave}
          onClose={() => { setStatusRow(null); setRevisionDocs([]); }}
        />
      )}
    </div>
  );
}
