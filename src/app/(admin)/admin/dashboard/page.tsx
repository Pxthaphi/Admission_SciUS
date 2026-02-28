import { prisma } from "@/lib/prisma";
import { Users, GraduationCap, School, CheckCircle, XCircle, Trophy } from "lucide-react";
import { DashboardReady } from "@/components/shared/dashboard-ready";

export const dynamic = "force-dynamic";

async function getStats() {
  const [
    totalStudents,
    totalSchools,
    totalProvinces,
    eligible,
    passedPrimary,
    passedReserve,
    confirmed,
    waived,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.groupBy({ by: ["school"], where: { school: { not: null } } }).then((r) => r.length),
    prisma.student.groupBy({ by: ["province"], where: { province: { not: null } } }).then((r) => r.length),
    prisma.examEligibility.count({ where: { status: "ELIGIBLE" } }),
    prisma.examResult.count({ where: { result: "PASSED_PRIMARY" } }),
    prisma.examResult.count({ where: { result: "PASSED_RESERVE" } }),
    prisma.enrollment.count({ where: { confirmationStatus: "CONFIRMED" } }),
    prisma.enrollment.count({ where: { confirmationStatus: "WAIVED" } }),
  ]);

  return { totalStudents, totalSchools, totalProvinces, eligible, passedPrimary, passedReserve, confirmed, waived };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "ผู้สมัครทั้งหมด", value: stats.totalStudents, icon: Users, color: "var(--primary)" },
    { label: "โรงเรียน / จังหวัด", value: `${stats.totalSchools} / ${stats.totalProvinces}`, icon: School, color: "var(--secondary)" },
    { label: "มีสิทธิ์สอบ", value: stats.eligible, icon: CheckCircle, color: "var(--primary)" },
    { label: "ผ่าน (ตัวจริง)", value: stats.passedPrimary, icon: Trophy, color: "var(--accent-gold)" },
    { label: "ผ่าน (สำรอง)", value: stats.passedReserve, icon: Trophy, color: "var(--warning)" },
    { label: "ยืนยันสิทธิ์", value: stats.confirmed, icon: GraduationCap, color: "var(--primary)" },
    { label: "สละสิทธิ์", value: stats.waived, icon: XCircle, color: "var(--danger)" },
  ];

  return (
    <div>
      <DashboardReady />
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">แดชบอร์ด</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[var(--text-secondary)]">{card.label}</span>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold font-inter text-[var(--text-primary)]">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
