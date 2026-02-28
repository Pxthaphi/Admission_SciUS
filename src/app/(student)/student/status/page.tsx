"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Upload, FileSearch, ShieldCheck, Trophy,
  CheckCircle, Clock, AlertCircle, ArrowRight, Lock, X, Bell,
} from "lucide-react";

const REQUIRED_DOCS = ["INTENT_CONFIRM", "FEE_PAYMENT"];

type StatusData = {
  documentReview: string;
  documentReviewRemark: string | null;
  revisionDocTypes: string[];
  eligibility: string;
  eligibilityRemark: string | null;
  examResult: string;
  examResultRemark: string | null;
  uploadedDocuments: string[];
};

type StepState = "complete" | "active" | "locked";

const stepsConfig = [
  { key: "upload", label: "อัปโหลดเอกสาร", icon: Upload },
  { key: "documentReview", label: "ตรวจสอบเอกสาร", icon: FileSearch },
  { key: "eligibility", label: "สิทธิ์ในการสอบ", icon: ShieldCheck },
  { key: "examResult", label: "ผลการสอบคัดเลือก", icon: Trophy },
] as const;

function resolveSteps(data: StatusData) {
  const allUploaded = REQUIRED_DOCS.every((t) => data.uploadedDocuments.includes(t));
  const uploadedCount = REQUIRED_DOCS.filter((t) => data.uploadedDocuments.includes(t)).length;

  const steps: {
    key: string; label: string; icon: typeof Upload;
    state: StepState; statusLabel: string; variant: "success" | "pending" | "danger" | "info";
    remark?: string | null;
    action?: { href: string; label: string };
  }[] = [];

  // Step 1: Upload
  if (allUploaded) {
    steps.push({ ...stepsConfig[0], state: "complete", statusLabel: "อัปโหลดครบแล้ว", variant: "success" });
  } else {
    steps.push({
      ...stepsConfig[0], state: "active",
      statusLabel: `ยังไม่ได้อัปโหลดเอกสาร (${uploadedCount}/${REQUIRED_DOCS.length})`,
      variant: "pending",
      action: { href: "/student/profile", label: "ไปอัปโหลดเอกสาร" },
    });
    return steps; // ยังไม่แสดงขั้นถัดไป
  }

  // Step 2: Document Review
  const docStatus = data.documentReview;
  if (docStatus === "APPROVED") {
    steps.push({ ...stepsConfig[1], state: "complete", statusLabel: "เอกสารผ่านการตรวจสอบ", variant: "success" });
  } else if (docStatus === "REVISION") {
    const revDocLabels: Record<string, string> = { INTENT_CONFIRM: "แจ้งความจำนง", FEE_PAYMENT: "ชำระค่าธรรมเนียม" };
    const revDocs = (data.revisionDocTypes || []).map((t: string) => revDocLabels[t] || t);
    const revisionDetail = revDocs.length > 0 ? `เอกสารที่ต้องแก้ไข: ${revDocs.join(", ")}` : null;
    steps.push({
      ...stepsConfig[1], state: "active", statusLabel: "เอกสารต้องแก้ไข กรุณาอัปโหลดใหม่", variant: "danger",
      remark: [data.documentReviewRemark, revisionDetail].filter(Boolean).join("\n"),
      action: { href: "/student/profile", label: "ไปแก้ไขเอกสาร" },
    });
    return steps;
  } else {
    steps.push({ ...stepsConfig[1], state: "active", statusLabel: "รอเจ้าหน้าที่ตรวจสอบเอกสาร", variant: "pending" });
    return steps;
  }

  // Step 3: Eligibility
  const eligStatus = data.eligibility;
  if (eligStatus === "ELIGIBLE") {
    steps.push({ ...stepsConfig[2], state: "complete", statusLabel: "มีสิทธิ์สอบ", variant: "success" });
  } else if (eligStatus === "INELIGIBLE") {
    steps.push({ ...stepsConfig[2], state: "active", statusLabel: "ไม่มีสิทธิ์สอบ", variant: "danger", remark: data.eligibilityRemark });
    return steps;
  } else {
    steps.push({ ...stepsConfig[2], state: "active", statusLabel: "รอประกาศสิทธิ์สอบ", variant: "pending" });
    return steps;
  }

  // Step 4: Exam Result
  const examStatus = data.examResult;
  if (examStatus === "PASSED_PRIMARY") {
    steps.push({
      ...stepsConfig[3], state: "complete", statusLabel: "สอบผ่าน (ตัวจริง)", variant: "success",
      action: { href: "/student/enrollment", label: "ไปยืนยันสิทธิ์" },
    });
  } else if (examStatus === "PASSED_RESERVE") {
    steps.push({
      ...stepsConfig[3], state: "complete", statusLabel: "สอบผ่าน (สำรอง)", variant: "info",
      action: { href: "/student/enrollment", label: "ไปยืนยันสิทธิ์" },
    });
  } else if (examStatus === "FAILED") {
    steps.push({ ...stepsConfig[3], state: "active", statusLabel: "ไม่ผ่านการคัดเลือก", variant: "danger", remark: data.examResultRemark });
  } else {
    steps.push({ ...stepsConfig[3], state: "active", statusLabel: "รอประกาศผลสอบ", variant: "pending" });
  }

  return steps;
}

const variantColors = {
  success: { bg: "bg-[var(--primary-light)]", text: "text-green-700", icon: "text-[var(--primary)]" },
  pending: { bg: "bg-[var(--warning-light)]", text: "text-amber-700", icon: "text-[var(--warning)]" },
  danger: { bg: "bg-[var(--danger-light)]", text: "text-red-700", icon: "text-[var(--danger)]" },
  info: { bg: "bg-[var(--secondary-light)]", text: "text-blue-700", icon: "text-[var(--secondary)]" },
};

// Get the latest meaningful status update for notification
function getLatestUpdate(data: StatusData): { title: string; message: string; variant: "success" | "danger" | "info" } | null {
  const examStatus = data.examResult;
  if (examStatus === "PASSED_PRIMARY") return { title: "ผ่านการคัดเลือก (ตัวจริง)", message: "ยินดีด้วย! คุณสามารถไปยืนยันสิทธิ์ได้แล้ว", variant: "success" };
  if (examStatus === "PASSED_RESERVE") return { title: "ผ่านการคัดเลือก (สำรอง)", message: "คุณอยู่ในลำดับสำรอง สามารถไปยืนยันสิทธิ์ได้", variant: "info" };
  if (examStatus === "FAILED") return { title: "ไม่ผ่านการคัดเลือก", message: "ขอบคุณที่เข้าร่วมสอบคัดเลือก", variant: "danger" };

  const eligStatus = data.eligibility;
  if (eligStatus === "ELIGIBLE") return { title: "มีสิทธิ์สอบ", message: "คุณได้รับสิทธิ์ในการเข้าสอบคัดเลือกแล้ว", variant: "success" };
  if (eligStatus === "INELIGIBLE") return { title: "ไม่มีสิทธิ์สอบ", message: "กรุณาติดต่อเจ้าหน้าที่หากมีข้อสงสัย", variant: "danger" };

  const docStatus = data.documentReview;
  if (docStatus === "APPROVED") return { title: "เอกสารผ่านการตรวจสอบ", message: "เอกสารของคุณได้รับการอนุมัติแล้ว", variant: "success" };
  if (docStatus === "REVISION") return { title: "เอกสารต้องแก้ไข", message: "กรุณาตรวจสอบและอัปโหลดเอกสารใหม่", variant: "danger" };

  return null;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState<ReturnType<typeof getLatestUpdate>>(null);

  useEffect(() => {
    fetch("/api/student/status")
      .then((r) => r.json())
      .then((d: StatusData) => {
        setData(d);
        // Check if there's a new status to show
        const update = getLatestUpdate(d);
        if (update) {
          const seenKey = `status_seen_${update.title}`;
          if (!sessionStorage.getItem(seenKey)) {
            setNotification(update);
            setShowModal(true);
            sessionStorage.setItem(seenKey, "1");
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return <p className="text-center py-12 text-[var(--text-secondary)]">ไม่พบข้อมูล</p>;

  const steps = resolveSteps(data);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">ติดตามสถานะ</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="space-y-0">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const colors = variantColors[step.variant];
            const StepIcon = step.state === "complete" ? CheckCircle
              : step.variant === "pending" ? Clock
              : step.variant === "danger" ? AlertCircle
              : CheckCircle;

            return (
              <div key={step.key} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colors.bg}`}>
                    <StepIcon className={`w-5 h-5 ${colors.icon}`} />
                  </div>
                  {!isLast && <div className="w-0.5 h-12 bg-gray-200 my-1" />}
                </div>
                <div className="pb-8">
                  <div className="flex items-center gap-3">
                    <step.icon className="w-4 h-4 text-[var(--text-secondary)]" />
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{step.label}</h3>
                  </div>
                  <div className="mt-1.5 ml-7 space-y-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                      {step.statusLabel}
                    </span>
                    {step.remark && (
                      <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-xs text-orange-700">
                          <span className="font-medium">หมายเหตุ:</span> {step.remark}
                        </p>
                      </div>
                    )}
                    {step.action && (
                      <div>
                        <Link
                          href={step.action.href}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          {step.action.label}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Locked future steps */}
          {steps.length < 4 && (
            <>
              {stepsConfig.slice(steps.length).map((step, i) => {
                const isLast = steps.length + i === 3;
                return (
                  <div key={step.key} className="flex gap-4 opacity-40">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-100">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                      {!isLast && <div className="w-0.5 h-12 bg-gray-200 my-1" />}
                    </div>
                    <div className="pb-8">
                      <div className="flex items-center gap-3">
                        <step.icon className="w-4 h-4 text-gray-400" />
                        <h3 className="text-sm font-medium text-gray-400">{step.label}</h3>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Notification when all docs uploaded but still pending review */}
      {REQUIRED_DOCS.every((t) => data.uploadedDocuments.includes(t)) && data.documentReview === "PENDING" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <FileSearch className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">อัปโหลดเอกสารครบแล้ว</p>
            <p className="text-xs text-blue-600 mt-0.5">กรุณารอเจ้าหน้าที่ตรวจสอบเอกสาร จะแจ้งผลให้ทราบภายหลัง</p>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showModal && notification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className={`p-6 text-center ${
              notification.variant === "success" ? "bg-[var(--primary-light)]"
              : notification.variant === "danger" ? "bg-[var(--danger-light)]"
              : "bg-[var(--secondary-light)]"
            }`}>
              <Bell className={`w-10 h-10 mx-auto mb-3 ${
                notification.variant === "success" ? "text-[var(--primary)]"
                : notification.variant === "danger" ? "text-[var(--danger)]"
                : "text-[var(--secondary)]"
              }`} />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{notification.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{notification.message}</p>
            </div>
            <div className="p-4">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
              >
                รับทราบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
