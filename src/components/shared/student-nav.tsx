"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { User, Activity, FileCheck, LogOut } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function StudentNav() {
  const pathname = usePathname();
  const [showEnrollment, setShowEnrollment] = useState(false);

  useEffect(() => {
    fetch("/api/student/status")
      .then((r) => r.json())
      .then((data) => {
        if (["PASSED_PRIMARY", "PASSED_RESERVE"].includes(data.examResult)) {
          setShowEnrollment(true);
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { href: "/student/profile", label: "ข้อมูลส่วนตัว", icon: User },
    { href: "/student/status", label: "ติดตามสถานะ", icon: Activity },
    ...(showEnrollment
      ? [{ href: "/student/enrollment", label: "รายงานตัว/มอบตัว", icon: FileCheck }]
      : []),
  ];

  return (
    <header className="bg-white border-b border-[var(--border)] sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <Image src="/SCiUS_Logo.webp" alt="SCiUS Logo" width={32} height={32} className="object-contain" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)] hidden sm:block">วมว. - ม.ทักษิณ</span>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors",
                    isActive
                      ? "bg-[var(--primary)]/10 text-[var(--primary)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-gray-100"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm text-[var(--text-secondary)] hover:bg-gray-100 hover:text-[var(--danger)] transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">ออก</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
