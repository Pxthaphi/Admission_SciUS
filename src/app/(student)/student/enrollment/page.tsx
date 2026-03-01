"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Upload, Trophy, Clock, AlertTriangle, CalendarClock, Ban, CheckCircle, Loader2, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { getFileUrl } from "@/lib/utils";
import Swal from "sweetalert2";

type EnrollmentData = {
  allowed: boolean;
  result: string;
  rank: number | null;
  confirmationStatus: string;
  documentReviewStatus: string;
  documentRemark: string | null;
  revisionDocTypes: string[];
  documents: { type: string; fileUrl: string }[];
  periodStatus: "not_set" | "before" | "open" | "closed";
  enrollmentStart: string | null;
  enrollmentPrimaryEnd: string | null;
  enrollmentReserveEnd: string | null;
  canConfirmReserve: boolean;
  reserveQueueMessage: string | null;
};

const enrollDocLabels: Record<string, string> = {
  ENROLLMENT_CONFIRM: "หนังสือยืนยันสิทธิ์เข้าเป็นนักเรียน ม.4",
  ENROLLMENT_CONTRACT: "หนังสือสัญญามอบตัว โครงการ วมว.",
  SCHOOL_TRANSFER: "หนังสือมอบตัว ร.ร.ป่าพะยอมพิทยาคม",
};

export default function StudentEnrollmentPage() {
  const [data, setData] = useState<EnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

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

  const handleUpload = async (type: string, file: File) => {
    setUploading((p) => ({ ...p, [type]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch("/api/student/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        toast.success("อัปโหลดสำเร็จ");
        fetchData();

        // If in REVISION status, check if all revision docs are now uploaded
        if (data?.documentReviewStatus === "REVISION" && data.revisionDocTypes.length > 0) {
          const uploadedAfter = [...(data.documents.map((d) => d.type) || []), type];
          const allDone = data.revisionDocTypes.every((t) => uploadedAfter.includes(t));
          if (allDone) {
            const resetRes = await fetch("/api/student/enrollment/revision-check", { method: "POST" });
            if (resetRes.ok) {
              toast.success("ส่งเอกสารแก้ไขครบแล้ว รอเจ้าหน้าที่ตรวจสอบอีกครั้ง");
              fetchData();
            }
          }
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "อัปโหลดไม่สำเร็จ");
      }
    } catch { toast.error("อัปโหลดไม่สำเร็จ"); }
    finally { setUploading((p) => ({ ...p, [type]: false })); }
  };

  const handleDelete = async (type: string) => {
    const res = await fetch("/api/student/documents/delete", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }),
    });
    if (res.ok) {
      toast.success("ลบเอกสารสำเร็จ");
      fetchData();
    } else { toast.error("ลบไม่สำเร็จ"); }
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

  const canConfirm = data.periodStatus === "open" && data.confirmationStatus === "PENDING" && data.canConfirmReserve;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">รายงานตัวและมอบตัว</h1>

      {/* Period Info Banners */}
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
            <p className="text-xs text-blue-600 mt-0.5">
              {data.result === "PASSED_PRIMARY"
                ? `เปิดให้ยืนยันสิทธิ์ตั้งแต่ ${formatDate(data.enrollmentStart)}`
                : `รอช่วงยืนยันสิทธิ์ตัวจริงสิ้นสุดก่อน${data.enrollmentPrimaryEnd ? ` (${formatDate(data.enrollmentPrimaryEnd)})` : ""}`
              }
            </p>
          </div>
        </div>
      )}
      {data.periodStatus === "open" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <Clock className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">อยู่ในช่วงเวลายืนยันสิทธิ์</p>
            <p className="text-xs text-green-600 mt-0.5">
              สิ้นสุดวันที่ {formatDate(data.result === "PASSED_PRIMARY" ? data.enrollmentPrimaryEnd! : data.enrollmentReserveEnd!)}
            </p>
          </div>
        </div>
      )}
      {data.periodStatus === "closed" && data.confirmationStatus === "PENDING" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <Ban className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">หมดเวลายืนยันสิทธิ์แล้ว</p>
            <p className="text-xs text-red-600 mt-0.5">ไม่ได้ยืนยันสิทธิ์ภายในเวลาที่กำหนด ถูกสละสิทธิ์อัตโนมัติ</p>
          </div>
        </div>
      )}

      {/* Reserve queue banner */}
      {data.result === "PASSED_RESERVE" && data.confirmationStatus === "PENDING" && !data.canConfirmReserve && data.reserveQueueMessage && (
        <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl">
          <Clock className="w-5 h-5 text-purple-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-purple-800">ยังไม่ถึงลำดับยืนยันสิทธิ์ของคุณ</p>
            <p className="text-xs text-purple-600 mt-0.5">{data.reserveQueueMessage}</p>
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

      {data.confirmationStatus === "PENDING" && data.periodStatus !== "open" && data.periodStatus !== "closed" && data.canConfirmReserve && (
        <div className="text-center py-4">
          <p className="text-sm text-[var(--text-secondary)]">กรุณารอจนกว่าจะถึงช่วงเวลายืนยันสิทธิ์</p>
        </div>
      )}

      {/* Document Upload */}
      {data.confirmationStatus !== "PENDING" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">อัปโหลดเอกสาร</h2>

          {/* Revision banner */}
          {data.documentReviewStatus === "REVISION" && data.revisionDocTypes.length > 0 && (
            <div className="mb-4 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">เอกสารต้องแก้ไข</p>
                <p className="text-xs text-orange-600 mt-0.5">กรุณาอัปโหลดเอกสารที่มีเครื่องหมายสีส้มใหม่อีกครั้ง</p>
                {data.documentRemark && (
                  <p className="text-xs text-orange-700 mt-1"><span className="font-medium">หมายเหตุ:</span> {data.documentRemark}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {Object.entries(docsToShow).map(([type, label]) => {
              const existing = data.documents.find((d) => d.type === type);
              const isUploading = uploading[type];
              const needsRevision = data.documentReviewStatus === "REVISION" && data.revisionDocTypes.includes(type);

              return (
                <div key={type} className={`border rounded-lg p-4 ${needsRevision ? "border-orange-300 bg-orange-50/50" : "border-[var(--border)]"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                    {needsRevision && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" />ต้องแก้ไข
                      </span>
                    )}
                  </div>

                  {existing && !needsRevision ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[var(--primary)]" />
                        <span className="text-xs text-[var(--primary)]">อัปโหลดแล้ว</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={getFileUrl(existing.fileUrl)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-[var(--text-secondary)] rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                          <Eye className="w-3.5 h-3.5" />ดูเอกสาร
                        </a>
                        <button onClick={() => handleDelete(type)}
                          className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-red-50 text-[var(--danger)] rounded-lg text-xs font-medium hover:bg-red-100 transition-colors cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : existing && needsRevision ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span className="text-xs text-orange-600">กรุณาอัปโหลดใหม่</span>
                        </div>
                        <a href={getFileUrl(existing.fileUrl)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-[var(--text-secondary)] rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                          <Eye className="w-3.5 h-3.5" />ดูเอกสารเดิม
                        </a>
                      </div>
                      <label className={`flex flex-col items-center gap-2 py-4 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors ${isUploading ? "pointer-events-none opacity-60" : ""}`}>
                        {isUploading ? <Loader2 className="w-6 h-6 text-orange-500 animate-spin" /> : <Upload className="w-6 h-6 text-orange-400" />}
                        <span className="text-sm text-orange-600">{isUploading ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลดไฟล์ใหม่"}</span>
                        <span className="text-xs text-orange-400">รองรับ PDF, JPG, PNG</span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" disabled={isUploading}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(type, f); e.target.value = ""; }} />
                      </label>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary-light)]/30 transition-colors ${isUploading ? "pointer-events-none opacity-60" : ""}`}>
                      {isUploading ? <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" /> : <Upload className="w-8 h-8 text-gray-400" />}
                      <span className="text-sm text-[var(--text-secondary)]">{isUploading ? "กำลังอัปโหลด..." : "คลิกเพื่อเลือกไฟล์"}</span>
                      <span className="text-xs text-gray-400">รองรับ PDF, JPG, PNG</span>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" disabled={isUploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(type, f); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {/* Document review status */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">สถานะตรวจเอกสาร:</span>
            {(() => {
              const requiredCount = data.confirmationStatus === "WAIVED" ? 1 : Object.keys(docsToShow).length;
              const uploadedCount = data.documents.filter((d) => Object.keys(docsToShow).includes(d.type)).length;
              if (uploadedCount < requiredCount) {
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">รอยื่นเอกสาร ({uploadedCount}/{requiredCount})</span>;
              }
              return <StatusBadge status={data.documentReviewStatus} />;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
