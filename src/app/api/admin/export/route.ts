import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import fs from "fs";
import path from "path";

const statusLabels: Record<string, string> = {
  PENDING: "รอตรวจสอบ",
  REVISION: "แก้ไข",
  APPROVED: "ผ่าน",
  ELIGIBLE: "มีสิทธิ์สอบ",
  INELIGIBLE: "ไม่มีสิทธิ์สอบ",
  FAILED: "ไม่ผ่าน",
  PASSED_PRIMARY: "ผ่าน (ตัวจริง)",
  PASSED_RESERVE: "ผ่าน (สำรอง)",
  CONFIRMED: "ยืนยันแล้ว",
  WAIVED: "สละสิทธิ์",
};

function label(s: string) {
  return statusLabels[s] || s;
}

// ===== STATUS SORT ORDER =====
const docStatusOrder: Record<string, number> = { APPROVED: 0, REVISION: 1, PENDING: 2 };
const eligibilityOrder: Record<string, number> = { ELIGIBLE: 0, INELIGIBLE: 1, PENDING: 2 };
const resultOrder: Record<string, number> = { PASSED_PRIMARY: 0, PASSED_RESERVE: 1, PENDING: 2, FAILED: 3 };
const confirmOrder: Record<string, number> = { CONFIRMED: 0, WAIVED: 1, PENDING: 2 };

// ===== DATA FETCHERS (sorted per page logic) =====
async function getDocumentsData() {
  const reviews = await prisma.documentReview.findMany({
    include: { student: { include: { documents: true } } },
  });
  const rows = reviews.map((r) => {
    const s = r.student;
    const docs = s.documents.filter((d: any) => ["INTENT_CONFIRM", "FEE_PAYMENT"].includes(d.type));
    return {
      _sortStatus: docStatusOrder[r.status] ?? 99,
      _sortExamId: s.examId || "zzz",
      examId: s.examId || "-",
      name: `${s.prefix || ""}${s.firstName} ${s.lastName}`,
      school: s.school || "-",
      province: s.province || "-",
      intentConfirm: docs.some((d: any) => d.type === "INTENT_CONFIRM") ? "อัปโหลดแล้ว" : "ยังไม่อัปโหลด",
      feePayment: docs.some((d: any) => d.type === "FEE_PAYMENT") ? "อัปโหลดแล้ว" : "ยังไม่อัปโหลด",
      status: label(r.status),
      remark: r.remark || "-",
    };
  });
  // Sort: status (APPROVED → REVISION → PENDING), then examId
  return rows.sort((a, b) => a._sortStatus - b._sortStatus || a._sortExamId.localeCompare(b._sortExamId));
}

async function getEligibilityData() {
  const rows = await prisma.examEligibility.findMany({
    include: { student: true },
  });
  const mapped = rows.map((r) => ({
    _sortStatus: eligibilityOrder[r.status] ?? 99,
    _sortExamId: r.student.examId || "zzz",
    examId: r.student.examId || "-",
    name: `${r.student.prefix || ""}${r.student.firstName} ${r.student.lastName}`,
    school: r.student.school || "-",
    province: r.student.province || "-",
    status: label(r.status),
    remark: r.remark || "-",
  }));
  // Sort: status (ELIGIBLE → INELIGIBLE → PENDING), then examId
  return mapped.sort((a, b) => a._sortStatus - b._sortStatus || a._sortExamId.localeCompare(b._sortExamId));
}

async function getResultsData() {
  const rows = await prisma.examResult.findMany({
    include: { student: true },
  });
  const mapped = rows.map((r) => ({
    _sortResult: resultOrder[r.result] ?? 99,
    _sortRank: r.rank ?? 9999,
    examId: r.student.examId || "-",
    name: `${r.student.prefix || ""}${r.student.firstName} ${r.student.lastName}`,
    school: r.student.school || "-",
    province: r.student.province || "-",
    result: label(r.result),
    rank: r.rank ?? "-",
    remark: r.remark || "-",
  }));
  // Sort: result (PASSED_PRIMARY → PASSED_RESERVE → PENDING → FAILED), then rank asc
  return mapped.sort((a, b) => a._sortResult - b._sortResult || a._sortRank - b._sortRank);
}

async function getEnrollmentData() {
  const rows = await prisma.enrollment.findMany({
    include: {
      student: { include: { examResult: true, documents: true } },
    },
  });
  const mapped = rows.map((r) => {
    const s = r.student;
    const enrollDocs = s.documents.filter((d: any) =>
      ["ENROLLMENT_CONFIRM", "ENROLLMENT_CONTRACT", "SCHOOL_TRANSFER"].includes(d.type)
    );
    const resultVal = s.examResult?.result || "PENDING";
    return {
      _sortResult: resultOrder[resultVal] ?? 99,
      _sortRank: s.examResult?.rank ?? 9999,
      _sortConfirm: confirmOrder[r.confirmationStatus] ?? 99,
      examId: s.examId || "-",
      name: `${s.prefix || ""}${s.firstName} ${s.lastName}`,
      school: s.school || "-",
      province: s.province || "-",
      result: label(resultVal),
      rank: s.examResult?.rank ?? "-",
      confirmationStatus: label(r.confirmationStatus),
      enrollDocs: `${enrollDocs.length}/3`,
      documentReviewStatus: label(r.documentReviewStatus),
      documentRemark: r.documentRemark || "-",
    };
  });
  // Sort: result (PASSED_PRIMARY first), then rank asc, then confirmation status
  return mapped.sort((a, b) =>
    a._sortResult - b._sortResult || a._sortRank - b._sortRank || a._sortConfirm - b._sortConfirm
  );
}

async function getExamRoomsData() {
  const rows = await prisma.examRoom.findMany({
    include: { student: true },
  });
  const mapped = rows.map((r) => ({
    _sortRoom: r.roomNumber || "zzz",
    _sortSeat: parseInt(r.seatNumber) || 9999,
    examId: r.student.examId || "-",
    name: `${r.student.prefix || ""}${r.student.firstName} ${r.student.lastName}`,
    school: r.student.school || "-",
    province: r.student.province || "-",
    roomNumber: r.roomNumber || "-",
    seatNumber: r.seatNumber || "-",
  }));
  // Sort: room number asc, then seat number asc
  return mapped.sort((a, b) => a._sortRoom.localeCompare(b._sortRoom) || a._sortSeat - b._sortSeat);
}

type PageConfig = {
  title: string;
  headers: string[];
  keys: string[];
  widths: number[];
  getData: () => Promise<Record<string, any>[]>;
};

const pageConfigs: Record<string, PageConfig> = {
  documents: {
    title: "ตรวจสอบเอกสาร",
    headers: ["เลขผู้สอบ", "ชื่อ-สกุล", "โรงเรียน", "จังหวัด", "แจ้งความจำนง", "ชำระค่าธรรมเนียม", "สถานะ", "หมายเหตุ"],
    keys: ["examId", "name", "school", "province", "intentConfirm", "feePayment", "status", "remark"],
    widths: [12, 28, 28, 14, 14, 16, 12, 18],
    getData: getDocumentsData,
  },
  eligibility: {
    title: "จัดการสิทธิ์สอบ",
    headers: ["เลขผู้สอบ", "ชื่อ-สกุล", "โรงเรียน", "จังหวัด", "สถานะ", "หมายเหตุ"],
    keys: ["examId", "name", "school", "province", "status", "remark"],
    widths: [12, 28, 28, 14, 16, 18],
    getData: getEligibilityData,
  },
  results: {
    title: "ผลการสอบคัดเลือก",
    headers: ["เลขผู้สอบ", "ชื่อ-สกุล", "โรงเรียน", "จังหวัด", "ผลสอบ", "ลำดับ", "หมายเหตุ"],
    keys: ["examId", "name", "school", "province", "result", "rank", "remark"],
    widths: [12, 28, 28, 14, 16, 8, 18],
    getData: getResultsData,
  },
  "exam-rooms": {
    title: "จัดการห้องสอบ",
    headers: ["เลขผู้สอบ", "ชื่อ-สกุล", "โรงเรียน", "จังหวัด", "ห้องสอบ", "เลขที่นั่ง"],
    keys: ["examId", "name", "school", "province", "roomNumber", "seatNumber"],
    widths: [12, 28, 28, 14, 12, 12],
    getData: getExamRoomsData,
  },
  enrollment: {
    title: "รายงานตัวและมอบตัว",
    headers: ["เลขผู้สอบ", "ชื่อ-สกุล", "โรงเรียน", "จังหวัด", "ผลสอบ", "ลำดับ", "ยืนยันสิทธิ์", "เอกสาร", "สถานะเอกสาร", "หมายเหตุ"],
    keys: ["examId", "name", "school", "province", "result", "rank", "confirmationStatus", "enrollDocs", "documentReviewStatus", "documentRemark"],
    widths: [12, 26, 22, 12, 14, 7, 13, 8, 13, 17],
    getData: getEnrollmentData,
  },
};

// ===== STATUS COLOR MAPPING =====
function getStatusFill(value: string): { fgColor: string } | null {
  const map: Record<string, string> = {
    "ผ่าน": "FF16A34A",
    "มีสิทธิ์สอบ": "FF16A34A",
    "ผ่าน (ตัวจริง)": "FF16A34A",
    "อนุมัติ": "FF16A34A",
    "ยืนยันแล้ว": "FF16A34A",
    "ผ่าน (สำรอง)": "FF2563EB",
    "รอตรวจสอบ": "FFF59E0B",
    "แก้ไข": "FFF97316",
    "ไม่ผ่าน": "FFDC2626",
    "ไม่มีสิทธิ์สอบ": "FFDC2626",
    "สละสิทธิ์": "FF6B7280",
    "อัปโหลดแล้ว": "FF16A34A",
    "ยังไม่อัปโหลด": "FFDC2626",
  };
  const color = map[value];
  return color ? { fgColor: color } : null;
}

// ===== EXCEL EXPORT =====
async function generateExcel(config: PageConfig, data: Record<string, any>[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SCiUS Admission System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(config.title, {
    properties: { defaultRowHeight: 22 },
  });

  // Title row
  sheet.mergeCells(1, 1, 1, config.headers.length);
  const titleCell = sheet.getCell("A1");
  titleCell.value = `${config.title} - SCiUS TSU Admission`;
  titleCell.font = { size: 14, bold: true, color: { argb: "FF1E3A5F" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } };
  sheet.getRow(1).height = 36;

  // Date row
  sheet.mergeCells(2, 1, 2, config.headers.length);
  const dateCell = sheet.getCell("A2");
  const now = new Date();
  dateCell.value = `ส่งออกเมื่อ: ${now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
  dateCell.font = { size: 9, italic: true, color: { argb: "FF6B7280" } };
  dateCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 20;

  // Header row
  const headerRow = sheet.getRow(4);
  config.headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF1E3A5F" } },
      bottom: { style: "thin", color: { argb: "FF1E3A5F" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  });
  headerRow.height = 28;

  // Set column widths
  config.widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  // Data rows
  data.forEach((row, rowIdx) => {
    const excelRow = sheet.getRow(rowIdx + 5);
    const isEven = rowIdx % 2 === 0;

    config.keys.forEach((key, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1);
      const val = String(row[key] ?? "-");
      cell.value = val;
      cell.font = { size: 10, color: { argb: "FF374151" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFF9FAFB" : "FFFFFFFF" },
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFF3F4F6" } },
        left: { style: "thin", color: { argb: "FFF3F4F6" } },
        right: { style: "thin", color: { argb: "FFF3F4F6" } },
      };

      // Color status cells
      const statusFill = getStatusFill(val);
      if (statusFill) {
        cell.font = { size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusFill.fgColor } };
      }
    });
    excelRow.height = 22;
  });

  // Summary row
  const summaryRowNum = data.length + 6;
  sheet.mergeCells(summaryRowNum, 1, summaryRowNum, config.headers.length);
  const summaryCell = sheet.getCell(summaryRowNum, 1);
  summaryCell.value = `จำนวนทั้งหมด: ${data.length} รายการ`;
  summaryCell.font = { size: 10, bold: true, color: { argb: "FF1E3A5F" } };
  summaryCell.alignment = { horizontal: "right", vertical: "middle" };
  summaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } };
  sheet.getRow(summaryRowNum).height = 24;

  return workbook.xlsx.writeBuffer();
}

// ===== PDF EXPORT WITH THAI FONT =====
function loadFontBase64(filename: string): string {
  // Try multiple possible paths for the font file
  const possiblePaths = [
    path.join(process.cwd(), "public", "fonts", "DB-O3-Std", filename),
    path.join(process.cwd(), ".next", "standalone", "public", "fonts", "DB-O3-Std", filename),
  ];
  for (const p of possiblePaths) {
    try {
      const buffer = fs.readFileSync(p);
      return buffer.toString("base64");
    } catch {
      continue;
    }
  }
  throw new Error(`Font file not found: ${filename}`);
}

// PDF status colors
function getStatusColor(value: string): [number, number, number] | null {
  const map: Record<string, [number, number, number]> = {
    "ผ่าน": [22, 163, 74],
    "มีสิทธิ์สอบ": [22, 163, 74],
    "ผ่าน (ตัวจริง)": [22, 163, 74],
    "ยืนยันแล้ว": [22, 163, 74],
    "ผ่าน (สำรอง)": [37, 99, 235],
    "รอตรวจสอบ": [245, 158, 11],
    "แก้ไข": [249, 115, 22],
    "ไม่ผ่าน": [220, 38, 38],
    "ไม่มีสิทธิ์สอบ": [220, 38, 38],
    "สละสิทธิ์": [107, 114, 128],
    "อัปโหลดแล้ว": [22, 163, 74],
    "ยังไม่อัปโหลด": [220, 38, 38],
  };
  return map[value] || null;
}

async function generatePDF(config: PageConfig, data: Record<string, any>[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Load and register Thai font
  try {
    const regularBase64 = loadFontBase64("DB O3 Std v4.ttf");
    const boldBase64 = loadFontBase64("DB O3 Std Bold v4.ttf");

    doc.addFileToVFS("DBO3-Regular.ttf", regularBase64);
    doc.addFont("DBO3-Regular.ttf", "DBO3", "normal");
    doc.addFileToVFS("DBO3-Bold.ttf", boldBase64);
    doc.addFont("DBO3-Bold.ttf", "DBO3", "bold");
  } catch {
    // Fallback: if font loading fails, PDF will have garbled Thai text
    // but at least won't crash
  }

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pageW - margin * 2;
  const totalW = config.widths.reduce((a, b) => a + b, 0);
  const colWidths = config.widths.map((w) => (w / totalW) * usableW);

  const fontSize = 7.5;
  const lineH = 4; // line height per text line in mm
  const minRowH = 8;
  const cellPadding = 2; // horizontal padding inside cell
  const headerH = 9;

  // Calculate how many lines a text needs in a given column width
  function calcLines(text: string, colW: number): number {
    doc.setFont("DBO3", "normal");
    doc.setFontSize(fontSize);
    const maxW = colW - cellPadding * 2;
    if (maxW <= 0) return 1;
    const lines = doc.splitTextToSize(text, maxW);
    return Array.isArray(lines) ? lines.length : 1;
  }

  // Calculate dynamic row height for a data row
  function calcRowH(row: Record<string, any>): number {
    let maxLines = 1;
    config.keys.forEach((key, i) => {
      const val = String(row[key] ?? "-");
      const lines = calcLines(val, colWidths[i]);
      if (lines > maxLines) maxLines = lines;
    });
    return Math.max(minRowH, maxLines * lineH + 3);
  }

  // ===== Draw functions =====
  const drawTitle = () => {
    doc.setFont("DBO3", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text(`${config.title} - SCiUS TSU Admission`, pageW / 2, 14, { align: "center" });

    doc.setFont("DBO3", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    const now = new Date();
    doc.text(
      `ส่งออกเมื่อ: ${now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      pageW / 2, 20, { align: "center" }
    );
  };

  let y = 0;

  const drawHeader = () => {
    doc.setFillColor(30, 58, 95);
    doc.rect(margin, y, usableW, headerH, "F");
    doc.setFont("DBO3", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    let x = margin;
    config.headers.forEach((h, i) => {
      doc.text(h, x + colWidths[i] / 2, y + headerH / 2 + 2, { align: "center", maxWidth: colWidths[i] - 2 });
      x += colWidths[i];
    });
    y += headerH;
  };

  const drawFooter = () => {
    doc.setFont("DBO3", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`${config.title} | SCiUS TSU Admission`, margin, pageH - 5);
    doc.text(`หน้า ${doc.getNumberOfPages()}`, pageW - margin, pageH - 5, { align: "right" });
  };

  // ===== First page =====
  drawTitle();
  y = 26;
  drawHeader();

  // ===== Data rows =====
  data.forEach((row, rowIdx) => {
    const rowH = calcRowH(row);

    if (y + rowH > pageH - 15) {
      drawFooter();
      doc.addPage();
      y = 12;
      drawHeader();
    }

    // Row background
    const isEven = rowIdx % 2 === 0;
    if (isEven) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y, usableW, rowH, "F");
    }

    let x = margin;
    config.keys.forEach((key, i) => {
      const val = String(row[key] ?? "-");
      const statusColor = getStatusColor(val);
      const colW = colWidths[i];
      const maxTextW = colW - cellPadding * 2;

      if (statusColor) {
        // Draw colored pill background (centered in cell)
        const pillW = Math.min(colW - 3, maxTextW + 2);
        const pillH = Math.min(rowH - 2, 6);
        const pillX = x + (colW - pillW) / 2;
        const pillY = y + (rowH - pillH) / 2;
        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.roundedRect(pillX, pillY, pillW, pillH, 1.5, 1.5, "F");
        doc.setFont("DBO3", "bold");
        doc.setFontSize(fontSize);
        doc.setTextColor(255, 255, 255);
        // Single line centered in pill
        doc.text(val, x + colW / 2, pillY + pillH / 2 + 1.2, {
          align: "center",
          maxWidth: pillW - 2,
        });
      } else {
        doc.setFont("DBO3", "normal");
        doc.setFontSize(fontSize);
        doc.setTextColor(55, 65, 81);

        // Split text into lines for wrapping
        const lines: string[] = doc.splitTextToSize(val, maxTextW);
        const textBlockH = lines.length * lineH;
        const startY = y + (rowH - textBlockH) / 2 + lineH * 0.7;

        lines.forEach((line: string, lineIdx: number) => {
          doc.text(line, x + colW / 2, startY + lineIdx * lineH, {
            align: "center",
          });
        });
      }

      x += colW;
    });

    // Bottom border
    doc.setDrawColor(233, 234, 236);
    doc.setLineWidth(0.15);
    doc.line(margin, y + rowH, margin + usableW, y + rowH);

    y += rowH;
  });

  // Summary
  y += 5;
  doc.setFont("DBO3", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 95);
  doc.text(`จำนวนทั้งหมด: ${data.length} รายการ`, pageW - margin, y, { align: "right" });

  // Footer on last page
  drawFooter();

  return Buffer.from(doc.output("arraybuffer"));
}

// ===== API HANDLER =====
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = req.nextUrl.searchParams.get("page");
  const format = req.nextUrl.searchParams.get("format");

  if (!page || !format || !pageConfigs[page] || !["excel", "pdf"].includes(format)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const config = pageConfigs[page];
  const rawData = await config.getData();
  // Strip internal sort keys
  const data = rawData.map((row) => {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!k.startsWith("_sort")) clean[k] = v;
    }
    return clean;
  });

  if (format === "excel") {
    const buffer = await generateExcel(config, data);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${page}-export.xlsx"`,
      },
    });
  } else {
    const buffer = await generatePDF(config, data);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${page}-export.pdf"`,
      },
    });
  }
}
