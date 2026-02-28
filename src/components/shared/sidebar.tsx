"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, FileCheck, ShieldCheck,
  DoorOpen, Trophy, GraduationCap, LogOut, Menu, X, ScrollText,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/admin/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/admin/users", label: "จัดการผู้ใช้งาน", icon: Users },
  { href: "/admin/documents", label: "ตรวจสอบเอกสาร", icon: FileCheck },
  { href: "/admin/eligibility", label: "จัดการสิทธิ์สอบ", icon: ShieldCheck },
  { href: "/admin/exam-rooms", label: "จัดการห้องสอบ", icon: DoorOpen },
  { href: "/admin/results", label: "ผลการสอบคัดเลือก", icon: Trophy },
  { href: "/admin/enrollment", label: "รายงานตัว/มอบตัว", icon: GraduationCap },
  { href: "/admin/audit-logs", label: "ประวัติการใช้งาน", icon: ScrollText, superAdminOnly: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.adminRole === "SUPER_ADMIN";
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
            <Image src="/SCiUS_Logo.webp" alt="SCiUS Logo" width={36} height={36} className="object-contain" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">วมว. - ม.ทักษิณ</h2>
            <p className="text-xs text-[var(--text-secondary)]">ระบบจัดการรับสมัคร</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.filter((item) => !(item as any).superAdminOnly || isSuperAdmin).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150",
                isActive
                  ? "bg-[var(--primary)]/10 text-[var(--primary)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-gray-100 hover:text-[var(--text-primary)]"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-gray-100 hover:text-[var(--danger)] transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-100"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full bg-white flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 h-screen bg-white border-r border-[var(--border)] flex-col fixed left-0 top-0">
        <SidebarContent />
      </aside>
    </>
  );
}
