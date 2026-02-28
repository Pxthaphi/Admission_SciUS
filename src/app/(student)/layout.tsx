import { StudentNav } from "@/components/shared/student-nav";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <StudentNav />
      <main className="max-w-4xl mx-auto px-4 py-6 w-full flex-1">{children}</main>
      <footer className="border-t border-[var(--border)] bg-white mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            ระบบจัดการรับสมัครนักเรียน โครงการ วมว. - ม.ทักษิณ
          </p>
        </div>
      </footer>
    </div>
  );
}
