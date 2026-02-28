import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- CSV Parser ---
function parseCSV(content: string): string[][] {
  const lines = content.split("\n").filter((l) => l.trim());
  return lines.map((line) => {
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    return cols;
  });
}

// --- Date parser DD/MM/YYYY -> Date ---
function parseDateDMY(str: string): Date | null {
  if (!str) return null;
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  // CSV uses CE year (not Buddhist era)
  return new Date(y, m - 1, d);
}

// --- Load primary/reserve list ---
function loadResults(filePath: string) {
  const content = readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);

  const primary: Map<string, number> = new Map(); // examId -> rank
  const reserve: Map<string, number> = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Primary: columns 0-4 (ที่, เลขประจำตัวสอบ, ชื่อ, โรงเรียน, จังหวัด)
    const pRank = row[0]?.trim();
    const pExamId = row[1]?.trim();
    if (pRank && pExamId) {
      primary.set(pExamId, parseInt(pRank));
    }
    // Reserve: columns 7-11 (สำรองอันดับ, เลขประจำตัวสอบ, ชื่อ, โรงเรียน, จังหวัด)
    const rRank = row[7]?.trim();
    const rExamId = row[8]?.trim();
    if (rRank && rExamId) {
      reserve.set(rExamId, parseInt(rRank));
    }
  }

  return { primary, reserve };
}

// --- Student data interface ---
interface StudentRow {
  examId: string;
  prefix: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  // ที่อยู่
  addressNo: string;
  moo: string;
  road: string;
  soi: string;
  village: string;
  subDistrict: string;
  district: string;
  addressProvince: string;
  postalCode: string;
  homePhone: string;
  phone: string;
  email: string;
  dateOfBirth: Date | null;
  // ผู้ปกครอง
  parentName: string;
  parentRelation: string;
  parentPhone: string;
  parentEmail: string;
  // โรงเรียน
  school: string;
  province: string;
  roomNumber: string;
  seatNumber: string;
}

function clean(val: string | undefined): string {
  const v = val?.trim() || "";
  return v === "0" || v === "-" ? "" : v;
}

function loadStudents(filePath: string): StudentRow[] {
  const content = readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);
  const students: StudentRow[] = [];

  // CSV columns (0-indexed):
  // 0:ที่, 1:เลขประจำตัวสอบ, 2:คำนำหน้า, 3:ชื่อ, 4:นามสกุล, 5:เลขประจำตัวประชาชน
  // 6:ที่อยู่เลขที่, 7:หมู่ที่, 8:ถนน, 9:ซอย, 10:หมู่บ้าน
  // 11:ตำบล/แขวง, 12:อำเภอ/เขต, 13:จังหวัด, 14:รหัสไปรษณีย์
  // 15:โทรศัพท์, 16:โทรศัพท์เคลื่อนที่, 17:อีเมล์
  // 18:วันเดือนปีเกิด
  // 19:ชื่อ-สกุลผู้ปกครอง, 20:ความสัมพันธ์, 21:หมายเลขโทรศัพท์มือถือผู้ปกครอง, 22:อีเมลผู้ปกครอง
  // 23:โรงเรียนเดิม, 24:จังหวัดโรงเรียนเดิม
  // 25:มีสิทธิ์สอบรอบสอง, 26:ห้องสอบ, 27:เลขที่นั่งสอบ

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[1]?.trim()) continue;

    students.push({
      examId: r[1].trim(),
      prefix: r[2]?.trim() || "",
      firstName: r[3]?.trim() || "",
      lastName: r[4]?.trim() || "",
      nationalId: r[5]?.trim() || "",
      addressNo: clean(r[6]),
      moo: clean(r[7]),
      road: clean(r[8]),
      soi: clean(r[9]),
      village: clean(r[10]),
      subDistrict: clean(r[11]),
      district: clean(r[12]),
      addressProvince: clean(r[13]),
      postalCode: clean(r[14]),
      homePhone: clean(r[15]),
      phone: clean(r[16]),
      email: r[17]?.trim() || "",
      dateOfBirth: parseDateDMY(r[18]?.trim() || ""),
      parentName: r[19]?.trim() || "",
      parentRelation: r[20]?.trim() || "",
      parentPhone: clean(r[21]),
      parentEmail: r[22]?.trim() || "",
      school: r[23]?.trim() || "",
      province: r[24]?.trim() || "",
      roomNumber: r[26]?.trim() || "",
      seatNumber: r[27]?.trim() || "",
    });
  }

  return students;
}

async function main() {
  const csvDir = resolve(__dirname, "../../admission/DB");
  const studentFile = resolve(csvDir, "ข้อมูลนักเรียน-2.csv");
  const resultFile = resolve(csvDir, "ตัวจริงและสำรอง.csv");

  console.log("📂 Loading CSV files...");
  const students = loadStudents(studentFile);
  const { primary, reserve } = loadResults(resultFile);

  console.log(`👨‍🎓 Students: ${students.length}`);
  console.log(`✅ Primary (ตัวจริง): ${primary.size}`);
  console.log(`📋 Reserve (สำรอง): ${reserve.size}`);

  let created = 0;
  let updated = 0;

  for (const s of students) {
    // Check if student already exists
    const existing = await prisma.student.findFirst({
      where: {
        OR: [
          { nationalId: s.nationalId },
          ...(s.examId ? [{ examId: s.examId }] : []),
        ],
      },
    });

    const allFields = {
      nationalId: s.nationalId,
      examId: s.examId || null,
      prefix: s.prefix || null,
      firstName: s.firstName,
      lastName: s.lastName,
      dateOfBirth: s.dateOfBirth,
      school: s.school || null,
      province: s.province || null,
      phone: s.phone || null,
      email: s.email || null,
      addressNo: s.addressNo || null,
      moo: s.moo || null,
      road: s.road || null,
      soi: s.soi || null,
      village: s.village || null,
      subDistrict: s.subDistrict || null,
      district: s.district || null,
      addressProvince: s.addressProvince || null,
      postalCode: s.postalCode || null,
      homePhone: s.homePhone || null,
      parentName: s.parentName || null,
      parentRelation: s.parentRelation || null,
      parentPhone: s.parentPhone || null,
      parentEmail: s.parentEmail || null,
    };

    if (existing) {
      // Build update data — only fill in fields that are currently null/empty in DB
      const updateData: Record<string, unknown> = {};
      for (const [key, csvVal] of Object.entries(allFields)) {
        if (key === "nationalId") continue; // don't touch unique key
        const dbVal = (existing as Record<string, unknown>)[key];
        // If DB value is null/empty and CSV has data, fill it in
        if ((dbVal === null || dbVal === undefined || dbVal === "") && csvVal !== null && csvVal !== "") {
          updateData[key] = csvVal;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.student.update({
          where: { id: existing.id },
          data: updateData,
        });
        console.log(`🔄 Updated ${Object.keys(updateData).length} fields: ${s.examId} ${s.firstName} ${s.lastName} [${Object.keys(updateData).join(", ")}]`);
      } else {
        console.log(`✅ Already complete: ${s.examId} ${s.firstName} ${s.lastName}`);
      }

      // Ensure related records exist
      const hasExamRoom = s.roomNumber !== "" && s.seatNumber !== "";

      // DocumentReview
      const existingReview = await prisma.documentReview.findUnique({ where: { studentId: existing.id } });
      if (!existingReview) {
        await prisma.documentReview.create({ data: { studentId: existing.id, status: "PENDING" } });
      }

      // ExamEligibility
      const existingElig = await prisma.examEligibility.findUnique({ where: { studentId: existing.id } });
      if (!existingElig) {
        await prisma.examEligibility.create({
          data: { studentId: existing.id, status: hasExamRoom ? "ELIGIBLE" : "INELIGIBLE" },
        });
      }

      // ExamRoom
      if (hasExamRoom) {
        const existingRoom = await prisma.examRoom.findUnique({ where: { studentId: existing.id } });
        if (!existingRoom) {
          await prisma.examRoom.create({
            data: { studentId: existing.id, roomNumber: s.roomNumber, seatNumber: s.seatNumber },
          });
        }

        // ExamResult
        const existingResult = await prisma.examResult.findUnique({ where: { studentId: existing.id } });
        if (!existingResult) {
          if (primary.has(s.examId)) {
            await prisma.examResult.create({ data: { studentId: existing.id, result: "PASSED_PRIMARY", rank: primary.get(s.examId)! } });
          } else if (reserve.has(s.examId)) {
            await prisma.examResult.create({ data: { studentId: existing.id, result: "PASSED_RESERVE", rank: reserve.get(s.examId)! } });
          } else {
            await prisma.examResult.create({ data: { studentId: existing.id, result: "FAILED" } });
          }
        }
      }

      updated++;
      continue;
    }

    // --- New student: create with all data ---
    const student = await prisma.student.create({ data: allFields });

    await prisma.documentReview.create({ data: { studentId: student.id, status: "PENDING" } });

    const hasExamRoom = s.roomNumber !== "" && s.seatNumber !== "";

    if (hasExamRoom) {
      await prisma.examEligibility.create({ data: { studentId: student.id, status: "ELIGIBLE" } });
      await prisma.examRoom.create({ data: { studentId: student.id, roomNumber: s.roomNumber, seatNumber: s.seatNumber } });

      if (primary.has(s.examId)) {
        await prisma.examResult.create({ data: { studentId: student.id, result: "PASSED_PRIMARY", rank: primary.get(s.examId)! } });
      } else if (reserve.has(s.examId)) {
        await prisma.examResult.create({ data: { studentId: student.id, result: "PASSED_RESERVE", rank: reserve.get(s.examId)! } });
      } else {
        await prisma.examResult.create({ data: { studentId: student.id, result: "FAILED" } });
      }
    } else {
      await prisma.examEligibility.create({ data: { studentId: student.id, status: "INELIGIBLE" } });
    }

    created++;
    const status = !hasExamRoom
      ? "❌ INELIGIBLE"
      : primary.has(s.examId)
        ? "🏆 PRIMARY"
        : reserve.has(s.examId)
          ? "📋 RESERVE"
          : "😞 FAILED";
    console.log(`🆕 Created: ${s.examId} ${s.firstName} ${s.lastName} [${status}]`);
  }

  console.log("\n========== SUMMARY ==========");
  console.log(`Total in CSV: ${students.length}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log("==============================");
}

main()
  .catch((e) => {
    console.error("❌ Import failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
