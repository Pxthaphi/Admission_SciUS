"use client";

import { useEffect, useState } from "react";
import { ScrollText, ChevronLeft, ChevronRight, Filter, Clock, User, Database } from "lucide-react";
import { DashboardReady } from "@/components/shared/dashboard-ready";

type AuditLog = {
  id: number;
  userId: number;
  userRole: string;
  userName: string;
  action: string;
  targetTable: string;
  targetId: number;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
};

const actionLabels: Record<string, string> = {
  UPDATE_DOCUMENT_REVIEW: "เปลี่ยนสถานะเอกสาร",
  UPDATE_ELIGIBILITY: "เปลี่ยนสิทธิ์สอบ",
  UPDATE_EXAM_RESULT: "เปลี่ยนผลสอบ",
  UPDATE_ENROLLMENT: "เปลี่ยนสถานะรายงานตัว",
  CREATE_EXAM_ROOM: "สร้างห้องสอบ",
  UPDATE_EXAM_ROOM: "แก้ไขห้องสอบ",
  DELETE_EXAM_ROOM: "ลบห้องสอบ",
  UPDATE_STUDENT: "แก้ไขข้อมูลนักเรียน",
  UPDATE_ADMIN: "แก้ไขข้อมูลแอดมิน",
  DELETE_STUDENT: "ลบนักเรียน",
  DELETE_ADMIN: "ลบแอดมิน",
  UPDATE_SETTINGS: "เปลี่ยนการตั้งค่าระบบ",
};

const tableLabels: Record<string, string> = {
  DocumentReview: "ตรวจสอบเอกสาร",
  ExamEligibility: "สิทธิ์สอบ",
  ExamResult: "ผลสอบ",
  Enrollment: "รายงานตัว",
  ExamRoom: "ห้องสอบ",
  Student: "นักเรียน",
  Admin: "แอดมิน",
  SystemSetting: "ตั้งค่าระบบ",
};

const actionColors: Record<string, string> = {
  UPDATE_DOCUMENT_REVIEW: "bg-blue-50 text-blue-700",
  UPDATE_ELIGIBILITY: "bg-purple-50 text-purple-700",
  UPDATE_EXAM_RESULT: "bg-amber-50 text-amber-700",
  UPDATE_ENROLLMENT: "bg-green-50 text-green-700",
  CREATE_EXAM_ROOM: "bg-teal-50 text-teal-700",
  UPDATE_EXAM_ROOM: "bg-teal-50 text-teal-700",
  DELETE_EXAM_ROOM: "bg-red-50 text-red-700",
  UPDATE_STUDENT: "bg-indigo-50 text-indigo-700",
  UPDATE_ADMIN: "bg-indigo-50 text-indigo-700",
  DELETE_STUDENT: "bg-red-50 text-red-700",
  DELETE_ADMIN: "bg-red-50 text-red-700",
  UPDATE_SETTINGS: "bg-gray-100 text-gray-700",
};

function formatValue(val: Record<string, unknown> | null): string {
  if (!val) return "-";
  return Object.entries(val)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterTable, setFilterTable] = useState("");
  const limit = 30;

  const fetchLogs = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filterTable) params.set("table", filterTable);
    fetch(`/api/admin/audit-logs?${params}`)
      .then((r) => r.json())
      .then((res) => {
        setLogs(res.data || []);
        setTotal(res.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [page, filterTable]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <DashboardReady />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="w-5 h-5 text-[var(--primary)]" />
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">ประวัติการใช้งาน</h1>
          <span className="text-xs text-[var(--text-secondary)] bg-gray-100 px-2 py-0.5 rounded-full">{total} รายการ</span>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
          <select
            value={filterTable}
            onChange={(e) => { setFilterTable(e.target.value); setPage(1); }}
            className="text-sm border border-[var(--border)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">ทั้งหมด</option>
            {Object.entries(tableLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)]">ไม่พบประวัติการใช้งาน</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action] || "bg-gray-100 text-gray-700"}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] bg-gray-50 px-2 py-0.5 rounded">
                        {tableLabels[log.targetTable] || log.targetTable} #{log.targetId}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />{log.userName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatDate(log.createdAt)}
                      </span>
                    </div>
                    {(log.oldValue || log.newValue) && (
                      <div className="flex gap-4 text-xs mt-1">
                        {log.oldValue && Object.keys(log.oldValue).length > 0 && (
                          <span className="text-red-500">เดิม: {formatValue(log.oldValue)}</span>
                        )}
                        {log.newValue && Object.keys(log.newValue).length > 0 && (
                          <span className="text-green-600">ใหม่: {formatValue(log.newValue)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-[var(--border)] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-[var(--text-secondary)]">
            หน้า {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-[var(--border)] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
