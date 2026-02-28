"use client";

import { useState } from "react";
import { X } from "lucide-react";

type StatusOption = {
  value: string;
  label: string;
  color: string; // tailwind bg class
};

type Props = {
  title: string;
  subtitle?: string;
  currentStatus: string;
  options: StatusOption[];
  requireRemark?: string[]; // status values that require remark
  onSave: (status: string, remark: string) => void;
  onClose: () => void;
  children?: React.ReactNode; // extra fields like rank input
};

export function StatusChangeModal({ title, subtitle, currentStatus, options, requireRemark = [], onSave, onClose, children }: Props) {
  const [selected, setSelected] = useState(currentStatus);
  const [remark, setRemark] = useState("");
  const needsRemark = requireRemark.includes(selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--text-secondary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status options */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[var(--text-primary)]">เลือกสถานะ</label>
            <div className="grid gap-2">
              {options.map((opt) => (
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

          {/* Extra children (e.g. rank input) */}
          {children}

          {/* Remark field */}
          {needsRemark && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">หมายเหตุ / เหตุผล <span className="text-red-400">*</span></label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="ระบุเหตุผลที่ต้องแก้ไข..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
              />
            </div>
          )}

          {/* Optional remark for non-required */}
          {!needsRemark && selected !== currentStatus && (
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
            onClick={() => onSave(selected, remark)}
            disabled={selected === currentStatus || (needsRemark && !remark.trim())}
            className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
