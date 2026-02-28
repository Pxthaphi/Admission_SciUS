"use client";

import { useEffect } from "react";
import { useWelcomeStore } from "@/lib/welcome-store";

export function DashboardReady() {
  const setReady = useWelcomeStore((s) => s.setReady);
  useEffect(() => { setReady(); }, [setReady]);
  return null;
}
