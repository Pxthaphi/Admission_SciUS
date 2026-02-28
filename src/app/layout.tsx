import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/shared/session-provider";
import { WelcomeOverlay } from "@/components/shared/welcome-overlay";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบรับสมัครนักเรียน ม.4 โครงการ วมว. - ม.ทักษิณ",
  description: "ระบบจัดการรับสมัครนักเรียนเข้าเป็นนักเรียนชั้นมัธยมศึกษาปีที่ 4 โครงการ วมว. - ม.ทักษิณ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head />
      <body className="antialiased">
        <AuthProvider>
          {children}
          <WelcomeOverlay />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
