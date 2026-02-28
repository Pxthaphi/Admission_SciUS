"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Upload, Trophy, Clock, AlertTriangle, CalendarClock, Ban } from "lucide-react";
import { toast } from "sonner";
import { getFileUrl } from "@/lib/utils";
import Swal from "sweetalert2";

type EnrollmentData = {
  allowed: boolean;
  result: string;
  rank: number | null;
  confirmationStatus: string;
  documentReviewStatus: string;
  documents: { type: string; fileUrl: string }[];
  periodStatus: "not_set" | "before" | "open" | "closed";
  enrollmentStart: string | null;
  enrollmentEnd: string | null;
};

const enrollDocLabels: Record<string, string> = {
  ENROLLMENT_CONFIRM: "หนังสือยืนยันสิทธิ์เข้าเป็นนักเรียน ม.4",
  ENROLLMENT_CONTRACT: "หนังสือสัญญามอบตัว โครงการ วมว.",
  SCHOOL_TRANSFER: "หนังสือมอบตัว ร.ร.ป่าพะยอมพิทยาคม",
};

export default function StudentEnrollmentPage() {
  const [data, setData] = useState<EnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const fetchData = () => {
    fetch("/api/student/enrollment")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleConfirm = async (action: "CONFIRMED" | "WAIVED") => {
    const label = action === "CONFIRMED" ? "ยืนยันสิทธิ์" : "สละสิทธิ์";
    const result = await Swal.fire({
      title: `${label}?`,
      text: action === "WAIVED" ? "เมื่อสละสิทธิ์แล้วจะไม่สามารถเปลี่ยนแปลงได้" : "ยืนยันการรับสิทธิ์เข้าเป็นนักเรียน",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: action === "CONFIRMED" ? "var(--primary)" : "var(--danger)",
      cancelButtonText: "ยกเลิก",
      confirmButtonText: label,
    });
    if (result.isConfirmed) {
      const res = await fetch("/api/student/enrollment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationStatus: action }),
      });
      if (res.ok) { toast.success(`${label}สำเร็จ`); fetchData(); }
      else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "ดำเนินการไม่สำเร็จ");
      }
    }
  };

  const handleUpload = async (type: string) => {
    const url = urls[type];
    if (!url) { toast.error("กรุณากรอก URL"); return; }
    const res = await fetch("/api/student/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, fileUrl: url }),
    });
    if (res.ok) { toast.success("อัปโหลดสำเร็จ"); setUrls((p) => ({ ...p, [type]: "" })); fetchData(); }
    else toast.error("อัปโหลดไม่สำเร็จ");
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!data || !data.allowed) return (
    <div className="text-center py-12">
      <Trophy className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3" />
      <p className="text-[var(--text-secondary)]">ยังไม่สามารถเข้าถึงหน้านี้ได้</p>
      <p className="text-xs text-[var(--text-secondary)] mt-1">เฉพาะผู้ผ่านการคัดเลือกเท่านั้น</p>
    </div>
  );

  const docsToShow = data.confirmationStatus === "WAIVED"
    ? { ENROLLMENT_CONFIRM: enrollDocLabels.ENROLLMENT_CONFIRM }
    : enrollDocLabels;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const canConfirm = data.periodStatus === "open" && data.confirmationStatus === "PENDING";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">รายงานตัวและมอบตัว</h1>

      {/* Period Info Banner */}
      {data.periodStatus === "not_set" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">ยังไม่ได้กำหนดช่วงเวลายืนยันสิทธิ์</p>
            <p className="text-xs text-amber-600 mt-0.5">กรุณารอประกาศจากทางโครงการ</p>
          </div>
        </div>
      )}

      {data.periodStatus === "before" && data.enrollmentStart && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <CalendarClock className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">ยังไม่ถึงช่วงเวลายืนยันสิทธิ์</p>
            <p className="text-xs text-blue-600 mt-0.5">เปิดให้ยืนยันสิทธิ์ตั้งแต่ {formatDate(data.enrollmentStart)}</p>
          </div>
        </div>
      )}

      {data.periodStatus === "open" && data.enrollmentEnd && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <Clock className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">อยู่ในช่วงเวลายืนยันสิทธิ์</p>
            <p className="text-xs text-green-600 mt-0.5">สิ้นสุดวันที่ {formatDate(data.enrollmentEnd)}</p>
          </div>
        </div>
      )}

      {data.periodStatus === "closed" && data.confirmationStatus === "PENDING" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <Ban className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">หมดเวลายืนยันสิทธิ์แล้ว</p>
            <p className="text-xs text-red-600 mt-0.5">ไม่ได้ยืนยันสิทธิ์ภายในเวลาที่กำหนด ถูกตัดสิทธิ์อัตโนมัติ</p>
          </div>
        </div>
      )}

      {/* Result Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">ผลการสอบคัดเลือก</p>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={data.result} />
              {data.rank && <span className="text-sm font-inter font-medium">ลำดับที่ {data.rank}</span>}
            </div>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">สถานะยืนยันสิทธิ์</p>
            <div className="mt-1"><StatusBadge status={data.confirmationStatus} /></div>
          </div>
        </div>
      </div>

      {/* Confirmation Buttons */}
      {canConfirm && (
        <div className="flex gap-3">
          <button onClick={() => handleConfirm("CONFIRMED")} className="flex-1 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors">
            ยืนยันสิทธิ์
          </button>
          <button onClick={() => handleConfirm("WAIVED")} className="flex-1 py-3 bg-white text-[var(--danger)] border border-[var(--danger)] rounded-lg font-medium hover:bg-[var(--danger-light)] transition-colors">
            สละสิทธิ์
          </button>
        </div>
      )}

      {/* Waiting message when period not open and still pending */}
      {data.confirmationStatus === "PENDING" && data.periodStatus !== "open" && data.periodStatus !== "closed" && (
        <div className="text-center py-4">
          <p className="text-sm text-[var(--text-secondary)]">กรุณารอจนกว่าจะถึงช่วงเวลายืนยันสิทธิ์</p>
        </div>
      )}

      {/* Document Upload */}
      {data.confirmationStatus !== "PENDING" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">อัปโหลดเอกสาร</h2>
          <div className="space-y-4">
            {Object.entries(docsToShow).map(([type, label]) => {
              const existing = data.documents.find((d) => d.type === type);
              return (
                <div key={type} className="border border-[var(--border)] rounded-lg p-4">
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{label}</p>
                  {existing ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--primary)]">อัปโหลดแล้ว</span>
                      <a href={getFileUrl(existing.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--secondary)] underline">ดูเอกสาร</a>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="url" placeholder="วาง URL เอกสาร" value={urls[type] || ""} onChange={(e) => setUrls((p) => ({ ...p, [type]: e.target.value }))} className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                      <button onClick={() => handleUpload(type)} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-1">
                        <Upload className="w-4 h-4" /> อัปโหลด
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {data.confirmationStatus !== "PENDING" && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">สถานะตรวจเอกสาร:</span>
              <StatusBadge status={data.documentReviewStatus} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
