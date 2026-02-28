import { AdminSidebar } from "@/components/shared/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AdminSidebar />
      <main className="lg:ml-60 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
