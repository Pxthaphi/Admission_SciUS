"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

type Props = {
  page: "documents" | "eligibility" | "results" | "enrollment" | "exam-rooms";
};

export function ExportButtons({ page }: Props) {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: "excel" | "pdf") => {
    setExporting(format);
    try {
      const res = await fetch(`/api/admin/export?page=${page}&format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${page}-export.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent fail
    }
    setExporting(null);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleExport("excel")}
        disabled={!!exporting}
        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
        title="ส่งออก Excel"
      >
        {exporting === "excel" ? (
          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5" />
        )}
        Excel
      </button>
      <button
        onClick={() => handleExport("pdf")}
        disabled={!!exporting}
        className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        title="ส่งออก PDF"
      >
        {exporting === "pdf" ? (
          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5" />
        )}
        PDF
      </button>
    </div>
  );
}
