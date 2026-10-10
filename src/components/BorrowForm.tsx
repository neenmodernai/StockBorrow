// src/components/BorrowForm.tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STATUS, type Notify } from "@/lib/types";
import { cleanTerm } from "@/lib/utils";
import Combobox, { type ComboOption } from "./Combobox";

interface Props {
  notify: Notify;
  onFinished: () => void;
}

const REQUESTER_KEY = "stock_borrow_requester";

async function searchProducts(q: string): Promise<ComboOption[]> {
  const t = cleanTerm(q);
  if (!t) return [];
  const { data, error } = await supabase
    .from("products")
    .select("id,name")
    .or(`id.ilike.${t}%,name.ilike.%${t}%`)
    .order("id")
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((p) => ({ value: p.id, label: p.name, sub: p.id }));
}

async function searchCustomers(q: string): Promise<ComboOption[]> {
  const t = cleanTerm(q);
  if (!t) return [];
  const { data, error } = await supabase
    .from("customers")
    .select("name")
    .ilike("name", `%${t}%`)
    .order("name")
    .limit(20);
  if (error) throw error;
  const opts: ComboOption[] = (data ?? []).map((c) => ({ value: c.name, label: c.name }));
  const exact = opts.some((o) => o.value.toLowerCase() === q.trim().toLowerCase());
  if (!exact) opts.push({ value: q.trim(), label: `เพิ่มลูกค้าใหม่: ${q.trim()}`, isNew: true });
  return opts;
}

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 p-3 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function BorrowForm({ notify, onFinished }: Props) {
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customer, setCustomer] = useState("");
  const [quoteNo, setQuoteNo] = useState("");
  const [requester, setRequester] = useState("");
  const [notes, setNotes] = useState("");
  const [barcode, setBarcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Remember who is using this phone, so they only type their name once.
  useEffect(() => {
    try {
      setRequester(localStorage.getItem(REQUESTER_KEY) ?? "");
    } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) {
      notify("กรุณาเลือกสินค้า", "error");
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      notify("จำนวนไม่ถูกต้อง", "error");
      return;
    }
    const customerName = customer.trim();
    setSaving(true);

    const { error } = await supabase.from("borrow_log").insert({
      barcode: barcode.trim() || null,
      product_id: product.id,
      product_name: product.name,
      customer_name: customerName,
      quote_no: quoteNo.trim(),
      quantity: qty,
      requester: requester.trim(),
      notes: notes.trim() || null,
      status: STATUS.BORROWED,
    });

    if (error) {
      setSaving(false);
      notify(`บันทึกไม่สำเร็จ: ${error.message}`, "error");
      return;
    }

    // Add new customers to the master list (ignored if the name already exists)
    await supabase.from("customers").upsert({ name: customerName }, { onConflict: "name", ignoreDuplicates: true });

    try {
      localStorage.setItem(REQUESTER_KEY, requester.trim());
    } catch {}
    setSaving(false);
    setShowSuccess(true);
  }

  function addMore() {
    setShowSuccess(false);
    setProduct(null);
    setProductQuery("");
    setQuantity("1");
    setBarcode("");
  }

  function finish() {
    setShowSuccess(false);
    setProduct(null);
    setProductQuery("");
    setQuantity("1");
    setCustomer("");
    setQuoteNo("");
    setNotes("");
    setBarcode("");
    onFinished();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {product ? (
          <div>
            <label className="block text-sm font-medium text-gray-700">สินค้า *</label>
            <div className="mt-1 flex items-start justify-between gap-2 rounded-md border border-blue-300 bg-blue-50 p-3">
              <div>
                <p className="text-sm font-semibold text-blue-900">{product.id}</p>
                <p className="text-sm text-gray-800">{product.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setProduct(null)}
                className="rounded-full px-2 text-xl leading-none text-gray-500 hover:text-red-600"
                aria-label="เปลี่ยนสินค้า"
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          <Combobox
            label="สินค้า * (พิมพ์รหัสหรือชื่อ)"
            value={productQuery}
            onChange={setProductQuery}
            onSelect={(o) => {
              setProduct({ id: o.value, name: o.label });
              setProductQuery("");
            }}
            fetchOptions={searchProducts}
            placeholder="ค้นหาสินค้า..."
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">จำนวน *</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Barcode</label>
            <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} className={inputCls} />
          </div>
        </div>

        <Combobox
          label="ชื่อลูกค้า *"
          value={customer}
          onChange={setCustomer}
          onSelect={(o) => setCustomer(o.value)}
          fetchOptions={searchCustomers}
          placeholder="ค้นหา / เพิ่มลูกค้าใหม่..."
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">เลขใบเสนอราคา *</label>
            <input type="text" value={quoteNo} onChange={(e) => setQuoteNo(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ชื่อผู้แจ้ง *</label>
            <input type="text" value={requester} onChange={(e) => setRequester(e.target.value)} required className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-lg bg-blue-600 p-4 text-base font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการยืม"}
        </button>
      </form>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-green-700">✓ บันทึกสำเร็จ</h2>
            <p className="mt-2 text-sm text-gray-600">ต้องการทำรายการต่อสำหรับลูกค้าเดิม หรือจบงาน?</p>
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={addMore} className="w-full rounded-md bg-blue-600 px-4 py-3 font-bold text-white shadow hover:bg-blue-700">
                + เพิ่มสินค้าอื่น (ลูกค้าเดิม)
              </button>
              <button onClick={finish} className="w-full rounded-md bg-gray-200 px-4 py-3 font-medium text-gray-800 hover:bg-gray-300">
                จบงาน / รายการใหม่
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
