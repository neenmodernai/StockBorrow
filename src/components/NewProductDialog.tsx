// src/components/NewProductDialog.tsx
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Notify } from "@/lib/types";

interface Props {
  initialId: string;
  initialName: string;
  notify: Notify;
  onCreated: (product: { id: string; name: string }) => void;
  onCancel: () => void;
}

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 p-3 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

// Add a product that is not in the master list yet (same idea as adding a new customer).
export default function NewProductDialog({ initialId, initialName, notify, onCreated, onCancel }: Props) {
  const [id, setId] = useState(initialId);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const pid = id.trim();
    const pname = name.trim();
    if (!pid || !pname) {
      notify("กรุณากรอกรหัสและชื่อสินค้า", "error");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("products").insert({ id: pid, name: pname });
    if (error) {
      // 23505 = this ID already exists: use the existing product instead of creating a duplicate
      if (error.code === "23505") {
        const { data } = await supabase.from("products").select("id,name").eq("id", pid).maybeSingle();
        setSaving(false);
        if (data) {
          notify("รหัสนี้มีอยู่แล้ว ใช้สินค้าเดิมให้แล้ว", "success");
          onCreated(data);
          return;
        }
      }
      setSaving(false);
      notify(`เพิ่มสินค้าไม่สำเร็จ: ${error.message}`, "error");
      return;
    }
    setSaving(false);
    notify("เพิ่มสินค้าใหม่แล้ว", "success");
    onCreated({ id: pid, name: pname });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={save} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">เพิ่มสินค้าใหม่</h2>
        <p className="mt-1 text-xs text-gray-500">ใช้เมื่อสินค้านี้ยังไม่มีรหัสในระบบ</p>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">รหัสสินค้า *</label>
            <input type="text" value={id} onChange={(e) => setId(e.target.value)} required autoFocus={!initialId} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ชื่อสินค้า *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus={Boolean(initialId)} className={inputCls} />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-md bg-gray-200 px-4 py-3 font-medium text-gray-800 hover:bg-gray-300">
            ยกเลิก
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-md bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "กำลังบันทึก..." : "เพิ่มสินค้า"}
          </button>
        </div>
      </form>
    </div>
  );
}
