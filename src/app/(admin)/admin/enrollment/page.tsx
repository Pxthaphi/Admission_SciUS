"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Settings, Save, Calendar, FileText, Eye, X, Pencil, CheckCircle, XCircle, Clock, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { ExportButtons } from "@/components/shared/export-buttons";
import { getFileUrl } from "@/lib/utils";
import { StatusChangeModal } from "@/components/shared/status-change-modal";
import DatePicker, { registerLocale } from "react-datepicker";
import { th } from "date-fns/locale";
import { useIsViewer } from "@/hooks/use-is-viewer";
import Swal from "sweetalert2";

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
  SCHOOL_TRANSFER: "ใบมอบตัว",
};

const allEnrollDocTypes = ["ENROLLMENT_CONFIRM", "ENROLLMENT_CONTRACT", "SCHOOL_TRANSFER"] as const;

export default function EnrollmentPage() {
  const isViewer = useIsViewer();
  const [data, setData] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [enrollStart, setEnrollStart] = useState<Date | null>(null);
  const [enrollPrimaryEnd, setEnrollPrimaryEnd] = useState<Date | null>(null);
  const [enrollReserveEnd, setEnrollReserveEnd] = useState<Date | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [modalRow, setModalRow] = useState<EnrollmentRow | null>(null);
  const [statusRow, setStatusRow] = useState<EnrollmentRow | null>(null);
  const [revisionDocs, setRevisionDocs] = useState<string[]>([]);

  // Reserve rounds
  type ReserveRound = { id: number; roundNo: number; rankFrom: number; rankTo: number; deadline: string; };
  const [reserveRounds, setReserveRounds] = useState<ReserveRound[]>([]);
  const [showReserveRounds, setShowReserveRounds] = useState(false);
  const [newRankFrom, setNewRankFrom] = useState("");
  const [newRankTo, setNewRankTo] = useState("");
  const [newDeadline, setNewDeadline] = useState<Date | null>(null);
  const [creatingRound, setCreatingRound] = useState(false);
  const [totalSeats, setTotalSeats] = useState("");
  const [savingTotalSeats, setSavingTotalSeats] = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin/enrollment").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  };

  const fetchSettings = () => {
    fetch("/api/admin/settings").then((r) => r.json()).then((s) => {
      setEnrollStart(s.enrollment_start ? new Date(s.enrollment_start) : null);
      setEnrollPrimaryEnd(s.enrollment_primary_end ? new Date(s.enrollment_primary_end) : null);
      setEnrollReserveEnd(s.enrollment_reserve_end ? new Date(s.enrollment_reserve_end) : null);
      setTotalSeats(s.total_seats || "");
    });
  };

  const fetchReserveRounds = () => {
    fetch("/api/admin/enrollment/reserve-rounds").then((r) => r.json()).then(setReserveRounds);
  };

  useEffect(() => { fetchData(); fetchSettings(); fetchReserveRounds(); }, []);

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
    if (!enrollStart || !enrollPrimaryEnd || !enrollReserveEnd) { toast.error("กรุณากรอกวันที่ให้ครบทั้ง 3 ช่อง"); return; }
    if (enrollStart >= enrollPrimaryEnd) { toast.error("วันเริ่มต้นต้องก่อนวันสิ้นสุดตัวจริง"); return; }
    if (enrollPrimaryEnd >= enrollReserveEnd) { toast.error("วันสิ้นสุดตัวจริงต้องก่อนวันสิ้นสุดตัวสำรอง"); return; }
    setSavingSettings(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollment_start: enrollStart.toISOString(),
        enrollment_primary_end: enrollPrimaryEnd.toISOString(),
        enrollment_reserve_end: enrollReserveEnd.toISOString(),
      }),
    });
    if (res.ok) { toast.success("บันทึกช่วงเวลาสำเร็จ"); setShowSettings(false); }
    else toast.error("บันทึกไม่สำเร็จ");
    setSavingSettings(false);
  };

  const handleSaveTotalSeats = async () => {
    if (!totalSeats || parseInt(totalSeats) <= 0) { toast.error("กรุณากรอกจำนวนที่นั่งที่ถูกต้อง"); return; }
    setSavingTotalSeats(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total_seats: totalSeats }),
    });
    if (res.ok) toast.success("บันทึกจำนวนที่นั่งสำเร็จ");
    else toast.error("บันทึกไม่สำเร็จ");
    setSavingTotalSeats(false);
  };

  const handleCreateRound = async () => {
    if (!newRankFrom || !newRankTo || !newDeadline) { toast.error("กรุณากรอกข้อมูลให้ครบ"); return; }
    if (parseInt(newRankFrom) > parseInt(newRankTo)) { toast.error("ลำดับเริ่มต้นต้องน้อยกว่าหรือเท่ากับลำดับสิ้นสุด"); return; }
    setCreatingRound(true);
    const res = await fetch("/api/admin/enrollment/reserve-rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rankFrom: parseInt(newRankFrom), rankTo: parseInt(newRankTo), deadline: newDeadline.toISOString() }),
    });
    if (res.ok) {
      toast.success("สร้างรอบเรียกสำรองสำเร็จ");
      setNewRankFrom(""); setNewRankTo(""); setNewDeadline(null);
      fetchReserveRounds(); fetchData();
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error || "สร้างไม่สำเร็จ");
    }
    setCreatingRound(false);
  };

  const handleDeleteRound = async (id: number) => {
    const result = await Swal.fire({
      title: "ลบรอบเรียกสำรอง?",
      text: "การลบจะไม่กระทบสถานะที่ยืนยัน/สละสิทธิ์ไปแล้ว",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--danger)",
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "ลบ",
    });
    if (result.isConfirmed) {
      const res = await fetch(`/api/admin/enrollment/reserve-rounds/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("ลบสำเร็จ"); fetchReserveRounds(); }
      else toast.error("ลบไม่สำเร็จ");
    }
  };

  const getPeriodLabel = () => {
    const fmt = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const now = new Date();
    const parts: string[] = [];
    if (enrollStart) parts.push(`เริ่ม: ${fmt(enrollStart)}`);
    if (enrollPrimaryEnd) {
      const isPrimaryOpen = enrollStart && now >= enrollStart && now <= enrollPrimaryEnd;
      const isPrimaryClosed = now > enrollPrimaryEnd;
      parts.push(`ตัวจริง: ${fmt(enrollPrimaryEnd)} ${isPrimaryOpen ? "(เปิดอยู่)" : isPrimaryClosed ? "(ปิดแล้ว)" : ""}`);
    }
    if (enrollReserveEnd) {
      const isReserveOpen = enrollPrimaryEnd && now > enrollPrimaryEnd && now <= enrollReserveEnd;
      const isReserveClosed = now > enrollReserveEnd;
      parts.push(`ตัวสำรอง: ${fmt(enrollReserveEnd)} ${isReserveOpen ? "(เปิดอยู่)" : isReserveClosed ? "(ปิดแล้ว)" : ""}`);
    }
    return parts.length > 0 ? parts.join(" | ") : "ยังไม่ได้กำหนด";
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
      cell: ({ row }) => {
        const r = row.original;
        const isConfirmed = r.confirmationStatus === "CONFIRMED" || r.confirmationStatus === "WAIVED";
        const requiredDocs = r.confirmationStatus === "WAIVED" ? 1 : allEnrollDocTypes.length;
        const docsComplete = r.documents.length >= requiredDocs;

        if (!isConfirmed) {
          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">รอยืนยันสิทธิ์</span>;
        }
        if (!docsComplete) {
          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">รอยื่นเอกสาร ({r.documents.length}/{requiredDocs})</span>;
        }

        return (
          <button
            onClick={() => {
              setStatusRow(r);
              setRevisionDocs(r.revisionDocTypes || []);
            }}
            className="cursor-pointer"
            disabled={isViewer}
          >
            <div className="flex items-center gap-1.5">
              <StatusBadge status={r.documentReviewStatus} />
              {!isViewer && <Pencil className="w-3 h-3 text-[var(--text-secondary)]" />}
            </div>
          </button>
        );
      },
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
        <div className="flex items-center gap-2">
          <ExportButtons page="enrollment" />
          {!isViewer && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              ตั้งค่าช่วงเวลา
            </button>
          )}
        </div>
      </div>

      {/* Period info */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        <Calendar className="w-4 h-4 text-blue-500" />
        <span className="text-xs text-blue-700">ช่วงเวลายืนยันสิทธิ์: {getPeriodLabel()}</span>
      </div>

      {/* Enrollment Summary Cards */}
      {(() => {
        const primary = data.filter((d) => d.result === "PASSED_PRIMARY");
        const reserve = data.filter((d) => d.result === "PASSED_RESERVE");
        const count = (rows: EnrollmentRow[], status: string) => rows.filter((r) => r.confirmationStatus === status).length;

        const sections = [
          { label: "ตัวจริง", rows: primary, color: "blue" },
          { label: "ตัวสำรอง", rows: reserve, color: "purple" },
        ];

        return (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {sections.map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">{s.label} ({s.rows.length} คน)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--primary)]" />
                    <div>
                      <p className="text-lg font-semibold font-inter text-[var(--primary)]">{count(s.rows, "CONFIRMED")}</p>
                      <p className="text-xs text-[var(--text-secondary)]">ยืนยันสิทธิ์</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-[var(--danger)]" />
                    <div>
                      <p className="text-lg font-semibold font-inter text-[var(--danger)]">{count(s.rows, "WAIVED")}</p>
                      <p className="text-xs text-[var(--text-secondary)]">สละสิทธิ์</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--warning)]" />
                    <div>
                      <p className="text-lg font-semibold font-inter text-[var(--warning)]">{count(s.rows, "PENDING")}</p>
                      <p className="text-xs text-[var(--text-secondary)]">รอยืนยัน</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white border border-[var(--border)] rounded-xl p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">กำหนดช่วงเวลายืนยันสิทธิ์</h3>
          <p className="text-xs text-[var(--text-secondary)]">ตัวจริงยืนยันได้ตั้งแต่วันเริ่มต้นถึง deadline ตัวจริง ตัวสำรองยืนยันได้หลัง deadline ตัวจริงถึง deadline ตัวสำรอง หากไม่ยืนยันภายในกำหนดจะถูกสละสิทธิ์อัตโนมัติ</p>
          <div className="grid grid-cols-3 gap-4">
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
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">สิ้นสุดตัวจริง</label>
              <DatePicker
                selected={enrollPrimaryEnd}
                onChange={(date: Date | null) => setEnrollPrimaryEnd(date)}
                locale="th"
                dateFormat="dd/MM/yyyy HH:mm"
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="เวลา"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                placeholderText="เลือก deadline ตัวจริง"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                wrapperClassName="w-full"
                minDate={enrollStart || undefined}
                isClearable
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">สิ้นสุดตัวสำรอง</label>
              <DatePicker
                selected={enrollReserveEnd}
                onChange={(date: Date | null) => setEnrollReserveEnd(date)}
                locale="th"
                dateFormat="dd/MM/yyyy HH:mm"
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="เวลา"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                placeholderText="เลือก deadline ตัวสำรอง"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                wrapperClassName="w-full"
                minDate={enrollPrimaryEnd || undefined}
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

      {/* Total Seats & Reserve Rounds */}
      {!isViewer && (
        <div className="bg-white border border-[var(--border)] rounded-xl p-4 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--primary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">จัดการเรียกตัวสำรอง</h3>
            </div>
            <button onClick={() => setShowReserveRounds(!showReserveRounds)} className="text-xs text-[var(--secondary)] hover:underline">
              {showReserveRounds ? "ซ่อน" : "แสดง"}
            </button>
          </div>

          {/* Total seats summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[var(--text-primary)]">จำนวนที่นั่งทั้งหมด:</label>
              <input
                type="number"
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value)}
                className="w-20 px-2 py-1.5 rounded-lg border border-[var(--border)] text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="30"
                min={1}
              />
              <button
                onClick={handleSaveTotalSeats}
                disabled={savingTotalSeats}
                className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
              >
                {savingTotalSeats ? "..." : "บันทึก"}
              </button>
            </div>
            {totalSeats && (
              <span className="text-xs text-[var(--text-secondary)]">
                ยืนยันแล้ว {data.filter((d) => d.confirmationStatus === "CONFIRMED").length}/{totalSeats} คน
              </span>
            )}
          </div>

          {showReserveRounds && (
            <>
              {/* Existing rounds */}
              {reserveRounds.length > 0 && (
                <div className="space-y-2">
                  {reserveRounds.map((round) => {
                    const isExpired = new Date() > new Date(round.deadline);
                    const reserveInRange = data.filter((d) => d.result === "PASSED_RESERVE" && d.rank !== null && d.rank >= round.rankFrom && d.rank <= round.rankTo);
                    const confirmed = reserveInRange.filter((d) => d.confirmationStatus === "CONFIRMED").length;
                    const waived = reserveInRange.filter((d) => d.confirmationStatus === "WAIVED").length;
                    const pending = reserveInRange.filter((d) => d.confirmationStatus === "PENDING").length;

                    return (
                      <div key={round.id} className={`flex items-center justify-between p-3 rounded-lg border ${isExpired ? "border-gray-200 bg-gray-50" : "border-green-200 bg-green-50"}`}>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              รอบที่ {round.roundNo}: ลำดับ {round.rankFrom}-{round.rankTo}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              ยืนยันภายใน {new Date(round.deadline).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              {isExpired && <span className="ml-1 text-[var(--danger)]">(หมดเวลา)</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-[var(--primary)]">ยืนยัน {confirmed}</span>
                            <span className="text-[var(--danger)]">สละสิทธิ์ {waived}</span>
                            <span className="text-[var(--warning)]">รอ {pending}</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteRound(round.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-[var(--danger)] transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Create new round */}
              <div className="border border-dashed border-[var(--border)] rounded-lg p-3 space-y-3">
                <p className="text-xs font-medium text-[var(--text-primary)]">เรียกตัวสำรองรอบใหม่</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">ลำดับเริ่มต้น</label>
                    <input
                      type="number"
                      value={newRankFrom}
                      onChange={(e) => setNewRankFrom(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      placeholder="1"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">ลำดับสิ้นสุด</label>
                    <input
                      type="number"
                      value={newRankTo}
                      onChange={(e) => setNewRankTo(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      placeholder="5"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">ยืนยันภายใน</label>
                    <DatePicker
                      selected={newDeadline}
                      onChange={(date: Date | null) => setNewDeadline(date)}
                      locale="th"
                      dateFormat="dd/MM/yyyy HH:mm"
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      timeCaption="เวลา"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      placeholderText="เลือก deadline"
                      className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      wrapperClassName="w-full"
                      isClearable
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleCreateRound}
                    disabled={creatingRound}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {creatingRound ? "กำลังสร้าง..." : "เรียกตัวสำรอง"}
                  </button>
                </div>
              </div>
            </>
          )}
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
