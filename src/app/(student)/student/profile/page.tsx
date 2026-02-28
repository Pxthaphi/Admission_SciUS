"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { User, Phone, Mail, School, MapPin, FileText, Upload, CheckCircle, Loader2, Eye, X, Pencil, Save, Home, Users } from "lucide-react";
import { toast } from "sonner";
import { formatNationalId, getFileUrl } from "@/lib/utils";
import { DashboardReady } from "@/components/shared/dashboard-ready";
import Select from "react-select";
import DatePicker from "react-datepicker";
import { provinceOptions } from "@/lib/provinces";

type Profile = {
  id: number;
  nationalId: string;
  examId: string | null;
  prefix: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  school: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  addressNo: string | null;
  moo: string | null;
  road: string | null;
  soi: string | null;
  village: string | null;
  subDistrict: string | null;
  district: string | null;
  addressProvince: string | null;
  postalCode: string | null;
  homePhone: string | null;
  parentName: string | null;
  parentRelation: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  documents: { type: string; fileUrl: string; uploadedAt: string }[];
};

const docLabels: Record<string, string> = {
  INTENT_CONFIRM: "หนังสือแจ้งความจำนงยืนยันสิทธิ์เข้าสอบรอบสอง",
  FEE_PAYMENT: "หนังสือยืนยันการชำระค่าธรรมเนียมสมัครสอบรอบสอง",
};

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base, borderColor: "var(--border)", borderRadius: "0.5rem", fontSize: "0.875rem", minHeight: "38px",
    "&:hover": { borderColor: "var(--primary)" },
  }),
  option: (base: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base, fontSize: "0.875rem",
    backgroundColor: state.isSelected ? "var(--primary)" : state.isFocused ? "var(--primary-light)" : "white",
    color: state.isSelected ? "white" : "var(--text-primary)",
  }),
  menu: (base: Record<string, unknown>) => ({ ...base, borderRadius: "0.5rem", overflow: "hidden", zIndex: 60 }),
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string | null>>({});

  const fetchProfile = () => {
    fetch("/api/student/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setForm({
          prefix: data.prefix, firstName: data.firstName, lastName: data.lastName,
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : null,
          school: data.school, province: data.province, phone: data.phone, email: data.email,
          addressNo: data.addressNo, moo: data.moo, road: data.road, soi: data.soi,
          village: data.village, subDistrict: data.subDistrict, district: data.district,
          addressProvince: data.addressProvince, postalCode: data.postalCode, homePhone: data.homePhone,
          parentName: data.parentName, parentRelation: data.parentRelation,
          parentPhone: data.parentPhone, parentEmail: data.parentEmail,
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, []);

  const setField = (key: string, value: string | null) => setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("บันทึกข้อมูลสำเร็จ");
        setEditing(false);
        fetchProfile();
      } else {
        const err = await res.json();
        toast.error(err.error || "บันทึกไม่สำเร็จ");
      }
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    setSaving(false);
  };

  const handleUpload = async (type: string, file: File) => {
    setUploading((p) => ({ ...p, [type]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch("/api/student/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        toast.success("อัปโหลดสำเร็จ");
        fetchProfile();
      } else {
        const err = await res.json();
        toast.error(err.error || "อัปโหลดไม่สำเร็จ");
      }
    } catch { toast.error("อัปโหลดไม่สำเร็จ"); }
    finally { setUploading((p) => ({ ...p, [type]: false })); }
  };

  const handleDelete = async (type: string) => {
    const res = await fetch("/api/student/documents/delete", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }),
    });
    if (res.ok) {
      toast.success("ลบเอกสารสำเร็จ");
      setProfile((prev) => prev ? { ...prev, documents: prev.documents.filter((d) => d.type !== type) } : prev);
    } else { toast.error("ลบไม่สำเร็จ"); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!profile) return <p className="text-center py-12 text-[var(--text-secondary)]">ไม่พบข้อมูล</p>;

  const inputClass = "w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent";
  const labelClass = "block text-xs text-[var(--text-secondary)] mb-1";

  return (
    <div className="space-y-6">
      <DashboardReady />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">ข้อมูลส่วนตัว</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors">
            <Pencil className="w-4 h-4" />แก้ไขข้อมูล
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); fetchProfile(); }} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition-colors">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" />{saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        )}
      </div>

      {/* ข้อมูลพื้นฐาน */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-[var(--primary)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">ข้อมูลพื้นฐาน</h2>
        </div>
        {!editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: FileText, label: "เลขประจำตัวผู้สอบ", value: profile.examId || "-" },
              { icon: User, label: "เลขบัตรประชาชน", value: formatNationalId(profile.nationalId) },
              { icon: User, label: "ชื่อ-นามสกุล", value: `${profile.prefix || ""}${profile.firstName} ${profile.lastName}` },
              { icon: School, label: "โรงเรียน", value: profile.school || "-" },
              { icon: MapPin, label: "จังหวัดโรงเรียนเดิม", value: profile.province || "-" },
              { icon: FileText, label: "วันเกิด", value: profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }) : "-" },
              { icon: Phone, label: "โทรศัพท์", value: profile.phone || "-" },
              { icon: Mail, label: "อีเมล", value: profile.email || "-" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">{item.label}</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className={labelClass}>เลขประจำตัวผู้สอบ</p><p className="text-sm font-medium text-[var(--text-primary)] px-3 py-2 bg-gray-50 rounded-lg">{profile.examId || "-"}</p></div>
              <div><p className={labelClass}>เลขบัตรประชาชน</p><p className="text-sm font-medium text-[var(--text-primary)] px-3 py-2 bg-gray-50 rounded-lg">{formatNationalId(profile.nationalId)}</p></div>
            </div>
            <div>
              <label className={labelClass}>คำนำหน้า</label>
              <select value={form.prefix || ""} onChange={(e) => setField("prefix", e.target.value || null)} className={inputClass}>
                <option value="">เลือกคำนำหน้า</option>
                <option value="นาย">นาย</option>
                <option value="นางสาว">นางสาว</option>
                <option value="เด็กชาย">เด็กชาย</option>
                <option value="เด็กหญิง">เด็กหญิง</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>ชื่อ</label><input value={form.firstName || ""} onChange={(e) => setField("firstName", e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>นามสกุล</label><input value={form.lastName || ""} onChange={(e) => setField("lastName", e.target.value)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>วันเกิด</label>
                <DatePicker
                  selected={form.dateOfBirth ? new Date(form.dateOfBirth) : null}
                  onChange={(date: Date | null) => setField("dateOfBirth", date ? date.toISOString().slice(0, 10) : null)}
                  locale="th" dateFormat="dd/MM/yyyy" showYearDropdown showMonthDropdown dropdownMode="select"
                  yearDropdownItemNumber={30} scrollableYearDropdown placeholderText="เลือกวันเกิด"
                  className={inputClass} wrapperClassName="w-full" maxDate={new Date()} isClearable
                />
              </div>
              <div><label className={labelClass}>อีเมล</label><input type="email" value={form.email || ""} onChange={(e) => setField("email", e.target.value || null)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>โทรศัพท์มือถือ</label><input value={form.phone || ""} onChange={(e) => setField("phone", e.target.value || null)} className={inputClass} placeholder="0xxxxxxxxx" /></div>
              <div><label className={labelClass}>โทรศัพท์บ้าน</label><input value={form.homePhone || ""} onChange={(e) => setField("homePhone", e.target.value || null)} className={inputClass} placeholder="0xxxxxxxxx" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>โรงเรียนเดิม</label><input value={form.school || ""} onChange={(e) => setField("school", e.target.value || null)} className={inputClass} /></div>
              <div>
                <label className={labelClass}>จังหวัดโรงเรียนเดิม</label>
                <Select options={provinceOptions} value={form.province ? { value: form.province, label: form.province } : null}
                  onChange={(opt) => setField("province", opt?.value || null)} placeholder="ค้นหาจังหวัด..." isClearable isSearchable
                  noOptionsMessage={() => "ไม่พบจังหวัด"} styles={selectStyles} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ที่อยู่ */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-4 h-4 text-[var(--primary)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">ที่อยู่</h2>
        </div>
        {!editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "เลขที่", value: profile.addressNo },
              { label: "หมู่ที่", value: profile.moo },
              { label: "ถนน", value: profile.road },
              { label: "ซอย", value: profile.soi },
              { label: "หมู่บ้าน", value: profile.village },
              { label: "ตำบล/แขวง", value: profile.subDistrict },
              { label: "อำเภอ/เขต", value: profile.district },
              { label: "จังหวัด", value: profile.addressProvince },
              { label: "รหัสไปรษณีย์", value: profile.postalCode },
              { label: "โทรศัพท์บ้าน", value: profile.homePhone },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">{item.label}</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.value || "-"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><label className={labelClass}>เลขที่</label><input value={form.addressNo || ""} onChange={(e) => setField("addressNo", e.target.value || null)} className={inputClass} /></div>
              <div><label className={labelClass}>หมู่ที่</label><input value={form.moo || ""} onChange={(e) => setField("moo", e.target.value || null)} className={inputClass} /></div>
              <div><label className={labelClass}>หมู่บ้าน</label><input value={form.village || ""} onChange={(e) => setField("village", e.target.value || null)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>ถนน</label><input value={form.road || ""} onChange={(e) => setField("road", e.target.value || null)} className={inputClass} /></div>
              <div><label className={labelClass}>ซอย</label><input value={form.soi || ""} onChange={(e) => setField("soi", e.target.value || null)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>ตำบล/แขวง</label><input value={form.subDistrict || ""} onChange={(e) => setField("subDistrict", e.target.value || null)} className={inputClass} /></div>
              <div><label className={labelClass}>อำเภอ/เขต</label><input value={form.district || ""} onChange={(e) => setField("district", e.target.value || null)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>จังหวัด</label>
                <Select options={provinceOptions} value={form.addressProvince ? { value: form.addressProvince, label: form.addressProvince } : null}
                  onChange={(opt) => setField("addressProvince", opt?.value || null)} placeholder="ค้นหาจังหวัด..." isClearable isSearchable
                  noOptionsMessage={() => "ไม่พบจังหวัด"} styles={selectStyles} />
              </div>
              <div><label className={labelClass}>รหัสไปรษณีย์</label><input value={form.postalCode || ""} onChange={(e) => setField("postalCode", e.target.value || null)} className={inputClass} maxLength={5} /></div>
            </div>
          </div>
        )}
      </div>

      {/* ข้อมูลผู้ปกครอง */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-[var(--primary)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">ข้อมูลผู้ปกครอง</h2>
        </div>
        {!editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "ชื่อ-สกุลผู้ปกครอง", value: profile.parentName },
              { label: "ความสัมพันธ์", value: profile.parentRelation },
              { label: "เบอร์โทรผู้ปกครอง", value: profile.parentPhone },
              { label: "อีเมลผู้ปกครอง", value: profile.parentEmail },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">{item.label}</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.value || "-"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>ชื่อ-สกุลผู้ปกครอง</label><input value={form.parentName || ""} onChange={(e) => setField("parentName", e.target.value || null)} className={inputClass} /></div>
              <div>
                <label className={labelClass}>ความสัมพันธ์</label>
                <select value={form.parentRelation || ""} onChange={(e) => setField("parentRelation", e.target.value || null)} className={inputClass}>
                  <option value="">เลือกความสัมพันธ์</option>
                  <option value="บิดา">บิดา</option>
                  <option value="มารดา">มารดา</option>
                  <option value="ปู่">ปู่</option>
                  <option value="ย่า">ย่า</option>
                  <option value="ตา">ตา</option>
                  <option value="ยาย">ยาย</option>
                  <option value="ลุง">ลุง</option>
                  <option value="ป้า">ป้า</option>
                  <option value="น้า">น้า</option>
                  <option value="อา">อา</option>
                  <option value="พี่">พี่</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>เบอร์โทรผู้ปกครอง</label><input value={form.parentPhone || ""} onChange={(e) => setField("parentPhone", e.target.value || null)} className={inputClass} placeholder="0xxxxxxxxx" /></div>
              <div><label className={labelClass}>อีเมลผู้ปกครอง</label><input type="email" value={form.parentEmail || ""} onChange={(e) => setField("parentEmail", e.target.value || null)} className={inputClass} /></div>
            </div>
          </div>
        )}
      </div>

      {/* Document Upload */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[var(--primary)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">อัปโหลดเอกสาร</h2>
        </div>
        <div className="space-y-4">
          {Object.entries(docLabels).map(([type, label]) => {
            const existing = profile.documents.find((d) => d.type === type);
            const isUploading = uploading[type];
            return (
              <div key={type} className="border border-[var(--border)] rounded-lg p-4">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{label}</p>
                {existing ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[var(--primary)]" />
                      <span className="text-xs text-[var(--primary)]">อัปโหลดแล้ว</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={getFileUrl(existing.fileUrl)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-[var(--text-secondary)] rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                        <Eye className="w-3.5 h-3.5" />ดูเอกสาร
                      </a>
                      <button onClick={() => handleDelete(type)}
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-red-50 text-[var(--danger)] rounded-lg text-xs font-medium hover:bg-red-100 transition-colors cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary-light)]/30 transition-colors ${isUploading ? "pointer-events-none opacity-60" : ""}`}>
                    {isUploading ? <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" /> : <Upload className="w-8 h-8 text-gray-400" />}
                    <span className="text-sm text-[var(--text-secondary)]">{isUploading ? "กำลังอัปโหลด..." : "คลิกเพื่อเลือกไฟล์"}</span>
                    <span className="text-xs text-gray-400">รองรับ PDF, JPG, PNG</span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" disabled={isUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(type, f); e.target.value = ""; }} />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
