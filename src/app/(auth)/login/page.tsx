"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators";
import { Loader2, Eye, EyeOff, Search, Lock, ArrowRight } from "lucide-react";
import Image from "next/image";
import Swal from "sweetalert2";
import { useWelcomeStore } from "@/lib/welcome-store";
import dynamic from "next/dynamic";

const Grainient = dynamic(() => import("@/components/shared/grainient"), { ssr: false });

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const triggerWelcome = useWelcomeStore((s) => s.trigger);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const identifier = watch("identifier", "");
  const isNationalId = /^\d{13}$/.test(identifier);
  const showPasswordField = identifier.length > 0 && !/^\d+$/.test(identifier);

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        identifier: data.identifier,
        password: data.password || "",
        redirect: false,
      });
      if (result?.error) {
        setIsLoading(false);
        await Swal.fire({
          icon: "error",
          title: "เข้าสู่ระบบไม่สำเร็จ",
          text: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
          confirmButtonColor: "var(--primary)",
        });
      } else {
        // Fetch session to get user name
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const userName = session?.user?.name || "ผู้ใช้งาน";
        const role = session?.user?.role;
        const redirectUrl = role === "student" ? "/student/profile" : "/admin/dashboard";

        // Trigger welcome overlay, then navigate
        triggerWelcome(userName);
        router.push(redirectUrl);
      }
    } catch {
      setIsLoading(false);
      await Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "กรุณาลองใหม่อีกครั้ง" });
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <Grainient
          color1="#DCFCE7"
          color2="#DBEAFE"
          color3="#FEF3C7"
          timeSpeed={0.15}
          colorBalance={0}
          warpStrength={0.8}
          warpFrequency={3}
          warpSpeed={1}
          warpAmplitude={60}
          blendAngle={0}
          blendSoftness={0.15}
          rotationAmount={300}
          noiseScale={1.5}
          grainAmount={0.02}
          grainScale={2}
          grainAnimated={false}
          contrast={1.1}
          gamma={1}
          saturation={0.6}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[860px] bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 grid grid-cols-1 md:grid-cols-2 overflow-hidden">

        {/* Left - Branding */}
        <div className="flex flex-col items-center justify-center text-center p-6 md:p-10 bg-gradient-to-b from-white/60 to-white/30 md:h-full">
          <div className="flex flex-col items-center md:my-auto">
            <Image src="/SCiUS_Logo.webp" alt="SCiUS Logo" width={100} height={100} className="w-16 h-16 md:w-[100px] md:h-[100px] mb-3 md:mb-5 drop-shadow-md" priority />
            <h1 className="text-lg md:text-[24px] leading-tight font-bold text-[var(--text-primary)]">
              ระบบรับสมัคร<br className="hidden md:block" /><span className="md:hidden"> </span>นักเรียน ม.4
            </h1>
            <div className="mt-2 md:mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/50 shadow-sm"
              style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
              <span className="text-xs font-semibold text-[var(--primary)]">v 1.0</span>
              <span className="text-xs text-[var(--text-secondary)]">·</span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">Admission System</span>
            </div>
            <p className="hidden md:block text-sm text-[var(--text-secondary)] mt-6 leading-relaxed">
              ระบบจัดการรับสมัครนักเรียน<br />โครงการ วมว. มหาวิทยาลัยทักษิณ
            </p>
          </div>
          <p className="hidden md:block text-xs text-[var(--text-secondary)]/50 pb-2">© 2025 TSU SCiUS Admission System</p>
        </div>

        {/* Dividers */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px" style={{ background: "linear-gradient(to bottom, transparent 0%, #e5e7eb 25%, #e5e7eb 75%, transparent 100%)" }} />
        <div className="block md:hidden w-full h-px" style={{ background: "linear-gradient(to right, transparent 0%, #e5e7eb 25%, #e5e7eb 75%, transparent 100%)" }} />

        {/* Right - Form */}
        <div className="flex flex-col justify-center p-6 md:p-10">
          <h2 className="text-[24px] font-semibold text-[var(--text-primary)] mb-1">ยินดีต้อนรับ</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-8">ลงชื่อเข้าใช้เพื่อเริ่มต้นใช้งาน</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">ชื่อผู้ใช้</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register("identifier")}
                  type="text"
                  placeholder="พิมพ์ชื่อผู้ใช้ หรือ เลขบัตรประชาชน..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all placeholder:text-gray-400"
                  autoComplete="username"
                />
              </div>
              {errors.identifier && <p className="text-sm text-[var(--danger)] mt-1">{errors.identifier.message}</p>}
              {identifier.length > 0 && /^\d+$/.test(identifier) && !isNationalId && (
                <p className="text-sm text-[var(--text-secondary)] mt-1">กรอกเลขบัตรประชาชนให้ครบ 13 หลัก ({identifier.length}/13)</p>
              )}
            </div>

            {showPasswordField && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">รหัสผ่าน</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="กรอกรหัสผ่าน"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all placeholder:text-gray-400"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[var(--text-primary)] transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !identifier.trim()}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />กำลังเข้าสู่ระบบ...</>
              ) : (
                <>เข้าสู่ระบบ<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 md:mt-8 space-y-1">
            <p className="text-xs text-[var(--text-secondary)]">นักเรียน: ใช้เลขบัตรประชาชน 13 หลัก (ไม่ต้องใส่รหัสผ่าน)</p>
            <p className="text-xs text-[var(--text-secondary)]">ผู้ดูแลระบบ: ใช้ชื่อผู้ใช้และรหัสผ่าน</p>
          </div>
          <p className="block md:hidden text-xs text-[var(--text-secondary)]/50 text-center mt-6">© 2025 TSU SCiUS Admission System</p>
        </div>
      </div>
    </div>
  );
}
