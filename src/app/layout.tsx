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
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
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
