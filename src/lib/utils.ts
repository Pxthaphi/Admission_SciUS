import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatNationalId(id: string) {
  return id.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, "$1-$2-$3-$4-$5");
}

/**
 * Convert a stored file path to a proxied URL.
 * Handles both legacy full Supabase URLs and new relative paths.
 */
export function getFileUrl(fileUrl: string) {
  // Already a proxy URL
  if (fileUrl.startsWith("/api/files/")) return fileUrl;
  // Legacy full Supabase URL — extract the path after bucket name
  if (fileUrl.includes("/storage/v1/object/public/admission/")) {
    const path = fileUrl.split("/storage/v1/object/public/admission/")[1];
    return `/api/files/${path}`;
  }
  // New relative path
  return `/api/files/${fileUrl}`;
}

/**
 * Check if the current admin session is a VIEWER role (read-only).
 */
export function isViewer(session: any): boolean {
  return session?.user?.adminRole === "VIEWER";
}
