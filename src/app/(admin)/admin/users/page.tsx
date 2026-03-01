"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import Select from "react-select";
import DatePicker, { registerLocale } from "react-datepicker";
import { th } from "date-fns/locale";
import { provinceOptions } from "@/lib/provinces";
import Swal from "sweetalert2";
import { toast } from "sonner";

registerLocale("th", th);

type Student = {
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
};

type Admin = {
  id: number;
  username: string;
  fullName: string;
  role: string;
};

const emptyStudent: Omit<Student, "id"> = {
  nationalId: "", examId: null, prefix: null, firstName: "", lastName: "",
  dateOfBirth: null, school: null, province: null, phone: null, email: null,
};

const emptyAdmin = { username: "", fullName: "", password: "", role: "ADMIN" };

export default function UsersPage() {
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.adminRole === "SUPER_ADMIN";
  const [tab, setTab] = useState<"student" | "admin">("student");
  const [students, setStudents] = useState<Student[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Student | Admin | null>(null);
  const [form, setForm] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?type=${tab}`);
      const data = await res.json();
      if (tab === "student") setStudents(data);
      else setAdmins(data);
    } catch { toast.error("โหลดข้อมูลไม่สำเร็จ"); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tab]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(tab === "student" ? { ...emptyStudent } : { ...emptyAdmin });
    setModalOpen(true);
  };

  const openEdit = (item: Student | Admin) => {
    setEditingItem(item);
    if (tab === "student") {
      const s = item as Student;
      setForm({
        nationalId: s.nationalId, examId: s.examId, prefix: s.prefix, firstName: s.firstName,
        lastName: s.lastName, dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : null,
        school: s.school, province: s.province, phone: s.phone, email: s.email,
      });
    } else {
      const a = item as Admin;
      setForm({ username: a.username, fullName: a.fullName, password: "", role: a.role });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = !!editingItem;
      const url = isEdit ? `/api/admin/users/${editingItem!.id}` : "/api/admin/users";
      const method = isEdit ? "PUT" : "POST";
      const body = { ...form, type: tab };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(isEdit ? "แก้ไขสำเร็จ" : "เพิ่มสำเร็จ");
        setModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "ดำเนินการไม่สำเร็จ");
      }
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: "ข้อมูลจะถูกลบถาวร",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--danger)",
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "ลบ",
    });
    if (result.isConfirmed) {
      const res = await fetch(`/api/admin/users/${id}?type=${tab}`, { method: "DELETE" });
      if (res.ok) { toast.success("ลบข้อมูลสำเร็จ"); fetchData(); }
      else toast.error("ลบไม่สำเร็จ");
    }
  };

  const setField = (key: string, value: string | null) => setForm((p) => ({ ...p, [key]: value }));

  const studentColumns: ColumnDef<Student>[] = [
    { accessorKey: "examId", header: "เลขผู้สอบ", cell: ({ row }) => row.original.examId || "-" },
    { accessorKey: "nationalId", header: "เลขบัตรประชาชน" },
    { header: "ชื่อ-สกุล", cell: ({ row }) => `${row.original.prefix || ""}${row.original.firstName} ${row.original.lastName}` },
    { accessorKey: "school", header: "โรงเรียน", cell: ({ row }) => row.original.school || "-" },
    { accessorKey: "province", header: "จังหวัด", cell: ({ row }) => row.original.province || "-" },
    ...(isSuperAdmin ? [{
      id: "actions", header: "จัดการ",
      cell: ({ row }: { row: { original: Student } }) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row.original)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--text-secondary)]" title="แก้ไข"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(row.original.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--danger)]" title="ลบ"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    }] as ColumnDef<Student>[] : []),
  ];

  const adminColumns: ColumnDef<Admin>[] = [
    { accessorKey: "username", header: "ชื่อผู้ใช้" },
    { accessorKey: "fullName", header: "ชื่อ-นามสกุล" },
    { accessorKey: "role", header: "บทบาท", cell: ({ row }) => row.original.role === "SUPER_ADMIN" ? "Super Admin" : row.original.role === "VIEWER" ? "Viewer" : "Admin" },
    ...(isSuperAdmin ? [{
      id: "actions", header: "จัดการ",
      cell: ({ row }: { row: { original: Admin } }) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row.original)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--text-secondary)]" title="แก้ไข"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(row.original.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--danger)]" title="ลบ"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    }] as ColumnDef<Admin>[] : []),
  ];

  const inputClass = "w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent";
  const labelClass = "block text-sm font-medium text-[var(--text-primary)] mb-1";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">จัดการผู้ใช้งาน</h1>
        {isSuperAdmin && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors">
            <Plus className="w-4 h-4" />เพิ่ม{tab === "student" ? "นักเรียน" : "ผู้ดูแล"}
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {(["student", "admin"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-white text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"}`}>
            {t === "student" ? "นักเรียน" : "ผู้ดูแลระบบ"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>
      ) : tab === "student" ? (
        <DataTable columns={studentColumns} data={students} searchPlaceholder="ค้นหาชื่อ, เลขผู้สอบ, โรงเรียน..." />
      ) : (
        <DataTable columns={adminColumns} data={admins} searchPlaceholder="ค้นหาชื่อผู้ใช้..." />
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {editingItem ? "แก้ไข" : "เพิ่ม"}{tab === "student" ? "นักเรียน" : "ผู้ดูแลระบบ"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {tab === "student" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>เลขบัตรประชาชน *</label><input required maxLength={13} pattern="\d{13}" value={form.nationalId || ""} onChange={(e) => setField("nationalId", e.target.value)} className={inputClass} placeholder="เลขบัตรประชาชน 13 หลัก" /></div>
                    <div><label className={labelClass}>เลขผู้สอบ</label><input value={form.examId || ""} onChange={(e) => setField("examId", e.target.value || null)} className={inputClass} placeholder="เลขผู้สอบ" /></div>
                  </div>
                  <div>
                    <label className={labelClass}>คำนำหน้า *</label>
                    <select required value={form.prefix || ""} onChange={(e) => setField("prefix", e.target.value)} className={inputClass}>
                      <option value="">เลือกคำนำหน้า</option>
                      <option value="นาย">นาย</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="เด็กชาย">เด็กชาย</option>
                      <option value="เด็กหญิง">เด็กหญิง</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>ชื่อ *</label><input required value={form.firstName || ""} onChange={(e) => setField("firstName", e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass}>นามสกุล *</label><input required value={form.lastName || ""} onChange={(e) => setField("lastName", e.target.value)} className={inputClass} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>วันเกิด</label>
                      <DatePicker
                        selected={form.dateOfBirth ? new Date(form.dateOfBirth) : null}
                        onChange={(date: Date | null) => setField("dateOfBirth", date ? date.toISOString().slice(0, 10) : null)}
                        locale="th"
                        dateFormat="dd/MM/yyyy"
                        showYearDropdown
                        showMonthDropdown
                        dropdownMode="select"
                        yearDropdownItemNumber={30}
                        scrollableYearDropdown
                        placeholderText="เลือกวันเกิด"
                        className={inputClass}
                        wrapperClassName="w-full"
                        maxDate={new Date()}
                        isClearable
                      />
                    </div>
                    <div>
                      <label className={labelClass}>จังหวัด</label>
                      <Select
                        options={provinceOptions}
                        value={form.province ? { value: form.province, label: form.province } : null}
                        onChange={(opt) => setField("province", opt?.value || null)}
                        placeholder="ค้นหาจังหวัด..."
                        isClearable
                        isSearchable
                        noOptionsMessage={() => "ไม่พบจังหวัด"}
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: "var(--border)",
                            borderRadius: "0.5rem",
                            fontSize: "0.875rem",
                            minHeight: "38px",
                            "&:hover": { borderColor: "var(--primary)" },
                          }),
                          option: (base, state) => ({
                            ...base,
                            fontSize: "0.875rem",
                            backgroundColor: state.isSelected ? "var(--primary)" : state.isFocused ? "var(--primary-light)" : "white",
                            color: state.isSelected ? "white" : "var(--text-primary)",
                          }),
                          menu: (base) => ({ ...base, borderRadius: "0.5rem", overflow: "hidden", zIndex: 60 }),
                        }}
                      />
                    </div>
                  </div>
                  <div><label className={labelClass}>โรงเรียน</label><input value={form.school || ""} onChange={(e) => setField("school", e.target.value || null)} className={inputClass} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>โทรศัพท์</label><input value={form.phone || ""} onChange={(e) => setField("phone", e.target.value || null)} className={inputClass} /></div>
                    <div><label className={labelClass}>อีเมล</label><input type="email" value={form.email || ""} onChange={(e) => setField("email", e.target.value || null)} className={inputClass} /></div>
                  </div>
                </>
              ) : (
                <>
                  <div><label className={labelClass}>ชื่อผู้ใช้ *</label><input required value={form.username || ""} onChange={(e) => setField("username", e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>ชื่อ-นามสกุล *</label><input required value={form.fullName || ""} onChange={(e) => setField("fullName", e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>{editingItem ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน *"}</label><input type="password" required={!editingItem} value={form.password || ""} onChange={(e) => setField("password", e.target.value)} className={inputClass} /></div>
                  <div>
                    <label className={labelClass}>บทบาท</label>
                    <select value={form.role || "ADMIN"} onChange={(e) => setField("role", e.target.value)} className={inputClass}>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50">
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
