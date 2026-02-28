"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import gsap from "gsap";
import dynamic from "next/dynamic";
import { useWelcomeStore } from "@/lib/welcome-store";

const Grainient = dynamic(() => import("@/components/shared/grainient"), { ssr: false });

export function WelcomeOverlay() {
  const { show, name, ready, clear } = useWelcomeStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const greetRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const [entranceDone, setEntranceDone] = useState(false);

  const playEntrance = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => setEntranceDone(true),
    });
    tl.fromTo(greetRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" })
      .fromTo(lineRef.current, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, "-=0.2")
      .fromTo(subtitleRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.2");
    return tl;
  }, []);

  const playExit = useCallback(() => {
    gsap.to(overlayRef.current, {
      y: "-100%",
      duration: 1,
      ease: "power3.inOut",
      onComplete: () => clear(),
    });
  }, [clear]);

  // Play entrance when overlay shows
  useEffect(() => {
    if (!show) return;
    setEntranceDone(false);
    playEntrance();
  }, [show, playEntrance]);

  // Play exit only when BOTH entrance is done AND dashboard is ready
  useEffect(() => {
    if (entranceDone && ready) {
      // Small pause so user can read the welcome text
      gsap.delayedCall(0.8, () => playExit());
    }
  }, [entranceDone, ready, playExit]);

  if (!show) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
    >
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
      <div ref={greetRef} className="relative z-10 text-center opacity-0">
        <p className="text-sm text-[var(--text-secondary)] mb-2">
          สวัสดี, {name}
        </p>
        <h1 className="text-[40px] font-bold text-[var(--text-primary)]">
          ยินดีต้อนรับ
        </h1>
      </div>
      <div ref={lineRef} className="relative z-10 w-16 h-0.5 bg-[var(--primary)] mt-4 origin-center scale-x-0" />
      <div ref={subtitleRef} className="relative z-10 mt-4 opacity-0">
        <p className="text-xs tracking-[0.2em] uppercase text-[var(--text-secondary)]">
          SCiUS Admission System
        </p>
      </div>
    </div>
  );
}
