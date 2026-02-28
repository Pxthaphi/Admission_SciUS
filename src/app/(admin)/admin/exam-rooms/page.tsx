"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Save, Trash2, Shuffle } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { ExportButtons } from "@/components/shared/export-buttons";

type RoomRow = {
  id: number;
  studentId: number;
  examId: string;
  firstName: string;
  lastName: string;
  school: string;
  province: string;
  roomNumber: string;
  seatNumber: string;
};

export default function ExamRoomsPage() {
  const [data, setData] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<Record<number, { roomNumber?: string; seatNumber?: string }>>({});

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin/exam-rooms").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (id: number) => {
    const change = changes[id];
    if (!change) return;
    const row = data.find((r) => r.id === id);
    const res = await fetch(`/api/admin/exam-rooms/${row!.studentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomNumber: change.roomNumber ?? row?.roomNumber ?? "",
        seatNumber: change.seatNumber ?? row?.seatNumber ?? "",
      }),
    });
    if (res.ok) {
      toast.success("บันทึกสำเร็จ");
      setData((prev) => prev.map((r) => r.id === id ? { ...r, ...change } : r));
      setChanges((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } else toast.error("บันทึกไม่สำเร็จ");
  };

  const handleDelete = async (row: RoomRow) => {
    if (!row.roomNumber && !row.seatNumber) { toast.info("ยังไม่มีห้องสอบ"); return; }
    const result = await Swal.fire({
      title: "ลบห้องสอบ?",
      text: `ลบห้องสอบของ ${row.firstName} ${row.lastName}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--danger)",
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "ลบ",
    });
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/admin/exam-rooms/${row.studentId}`, { method: "DELETE" });
    if (res.ok) { toast.success("ลบสำเร็จ"); fetchData(); }
    else toast.error("ลบไม่สำเร็จ");
  };

  const handleAutoAssign = async () => {
    const unassigned = data.filter((r) => !r.roomNumber && !r.seatNumber);
    if (unassigned.length === 0) { toast.info("ทุกคนมีห้องสอบแล้ว"); return; }

    const { value: formValues } = await Swal.fire({
      title: "จัดห้องสอบอัตโนมัติ",
      html: `
        <div style="text-align:left;font-size:14px;">
          <p style="margin-bottom:12px;">จะจัดห้องสอบให้ ${unassigned.length} คนที่ยังไม่มีห้อง</p>
          <label style="display:block;margin-bottom:4px;">จำนวนคนต่อห้อง</label>
          <input id="swal-per-room" type="number" min="1" value="30" class="swal2-input" style="margin:0 0 12px 0;width:100%;" />
          <label style="display:block;margin-bottom:4px;">เริ่มห้องที่</label>
          <input id="swal-start-room" type="number" min="1" value="1" class="swal2-input" style="margin:0;width:100%;" />
        </div>
      `,
      showCancelButton: true,
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "จัดห้อง",
      confirmButtonColor: "var(--primary)",
      preConfirm: () => ({
        perRoom: parseInt((document.getElementById("swal-per-room") as HTMLInputElement).value) || 30,
        startRoom: parseInt((document.getElementById("swal-start-room") as HTMLInputElement).value) || 1,
      }),
    });
    if (!formValues) return;

    let success = 0;
    for (let i = 0; i < unassigned.length; i++) {
      const roomNum = formValues.startRoom + Math.floor(i / formValues.perRoom);
      const seatNum = (i % formValues.perRoom) + 1;
      const res = await fetch(`/api/admin/exam-rooms/${unassigned[i].studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomNumber: String(roomNum), seatNumber: String(seatNum) }),
      });
      if (res.ok) success++;
    }
    toast.success(`จัดห้องสำเร็จ ${success}/${unassigned.length} คน`);
    fetchData();
  };

  const columns: ColumnDef<RoomRow>[] = [
    { accessorKey: "examId", header: "เลขผู้สอบ" },
    { header: "ชื่อ-สกุล", cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}` },
    { accessorKey: "school", header: "โรงเรียน" },
    { accessorKey: "province", header: "จังหวัด" },
    {
      header: "ห้องสอบ",
      cell: ({ row }) => (
        <input
          value={changes[row.original.id]?.roomNumber ?? row.original.roomNumber}
          onChange={(e) => setChanges((p) => ({ ...p, [row.original.id]: { ...p[row.original.id], roomNumber: e.target.value } }))}
          className="w-20 text-xs border border-[var(--border)] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          placeholder="ห้อง"
        />
      ),
    },
    {
      header: "เลขที่นั่ง",
      cell: ({ row }) => (
        <input
          value={changes[row.original.id]?.seatNumber ?? row.original.seatNumber}
          onChange={(e) => setChanges((p) => ({ ...p, [row.original.id]: { ...p[row.original.id], seatNumber: e.target.value } }))}
          className="w-20 text-xs border border-[var(--border)] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          placeholder="ที่นั่ง"
        />
      ),
    },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleSave(row.original.id)} disabled={!changes[row.original.id]} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--primary)] disabled:opacity-30" title="บันทึก">
            <Save className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(row.original)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--danger)]" title="ลบห้องสอบ">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">จัดการห้องสอบ</h1>
        <div className="flex items-center gap-2">
          <ExportButtons page="exam-rooms" />
          <button onClick={handleAutoAssign} className="flex items-center gap-1.5 px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors">
            <Shuffle className="w-3.5 h-3.5" />จัดห้องอัตโนมัติ
          </button>
        </div>
      </div>
      <DataTable columns={columns} data={data} searchPlaceholder="ค้นหาเลขผู้สอบ, ชื่อ, โรงเรียน..." />
    </div>
  );
}
