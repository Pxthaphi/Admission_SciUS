"use client";

import Link from "next/link";
import Image from "next/image";
import { GraduationCap, Calendar, Users, FileCheck, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/SCiUS_Logo.webp" alt="SCiUS Logo" width={40} height={40} className="object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">โครงการ วมว.</h1>
              <p className="text-xs text-[var(--text-secondary)]">มหาวิทยาลัยทักษิณ</p>
            </div>
          </div>
          <Link
            href="/login"
            className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium text-sm hover:bg-[var(--primary-hover)] transition-colors duration-150"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1.5 bg-[var(--primary-light)] text-[var(--primary)] rounded-full text-sm font-medium mb-6">
            รับสมัครนักเรียน ม.4
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
            ระบบจัดการรับสมัครนักเรียน
            <br />
            <span className="text-[var(--primary)]">โครงการ วมว.</span>{" "}
            <span className="text-[var(--accent-gold)]">-</span>{" "}
            <span className="text-[var(--secondary)]">ม.ทักษิณ</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-lg mb-8 leading-relaxed">
            ระบบรับสมัครสอบคัดเลือก รายงานตัว และมอบตัวนักเรียน
            <br />
            เข้าเป็นนักเรียนชั้นมัธยมศึกษาปีที่ 4 โครงการห้องเรียนวิทยาศาสตร์
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[var(--primary)] text-white rounded-lg font-semibold text-base hover:bg-[var(--primary-hover)] transition-colors duration-150"
          >
            เข้าสู่ระบบ
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: FileCheck, title: "สมัครสอบ", desc: "ยื่นเอกสารสมัครสอบคัดเลือกออนไลน์", color: "var(--primary)" },
            { icon: Calendar, title: "ตรวจสอบสถานะ", desc: "ติดตามสถานะการสมัครแบบ real-time", color: "var(--secondary)" },
            { icon: Users, title: "ประกาศผล", desc: "ดูผลสอบคัดเลือกและลำดับสำรอง", color: "var(--warning)" },
            { icon: GraduationCap, title: "รายงานตัว", desc: "ยืนยันสิทธิ์และมอบตัวออนไลน์", color: "var(--accent-gold)" },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-150">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: `${item.color}15` }}
              >
                <item.icon className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-1">{item.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            ระบบจัดการรับสมัครนักเรียนเข้าเป็นนักเรียนชั้นมัธยมศึกษาปีที่ 4 โครงการ วมว. - ม.ทักษิณ
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            พัฒนาระบบโดย อาจารย์ณัฐสิทธิ์ อุ่นแก้ว อาจารย์ประจำโครงการ วมว. - ม.ทักษิณ
          </p>
        </div>
      </footer>
    </div>
  );
}
