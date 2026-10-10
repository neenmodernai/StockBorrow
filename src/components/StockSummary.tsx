// src/components/StockSummary.tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Notify, StockRow } from "@/lib/types";
import { cleanTerm } from "@/lib/utils";

interface Props {
  active: boolean;
  notify: Notify;
  onJump: (productId: string) => void;
}

const PAGE = 40;
type Sort = "qty-desc" | "qty-asc" | "name-asc";

export default function StockSummary({ active, notify, onJump }: Props) {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("qty-desc");
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const buildQuery = useCallback(
    (from: number) => {
      let qb = supabase.from("stock_summary").select("*", { count: "exact" });
      const t = cleanTerm(q);
      if (t) qb = qb.or(`product_id.ilike.%${t}%,product_name.ilike.%${t}%`);
      if (sort === "qty-desc") qb = qb.order("qty_out", { ascending: false }).order("product_id");
      else if (sort === "qty-asc") qb = qb.order("qty_out", { ascending: true }).order("product_id");
      else qb = qb.order("product_name", { ascending: true });
      return qb.range(from, from + PAGE - 1);
    },
    [q, sort]
  );

  useEffect(() => {
    if (!active) return;
    const id = ++reqId.current;
    setLoading(true);
    buildQuery(0).then(({ data, count, error }) => {
      if (id !== reqId.current) return;
      setLoading(false);
      if (error) {
        notify(`โหลดข้อมูลไม่สำเร็จ: ${error.message}`, "error");
        return;
      }
      setRows((data ?? []) as StockRow[]);
      setTotal(count ?? 0);
    });
  }, [active, buildQuery, notify]);

  async function loadMore() {
    setLoadingMore(true);
    const { data, error } = await buildQuery(rows.length);
    setLoadingMore(false);
    if (error) {
      notify(`โหลดข้อมูลไม่สำเร็จ: ${error.message}`, "error");
      return;
    }
    setRows((prev) => [...prev, ...((data ?? []) as StockRow[])]);
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="ค้นหาสินค้า..."
          className="min-w-0 flex-grow rounded border bg-white p-3 shadow-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded border bg-white p-2 shadow-sm"
        >
          <option value="qty-desc">จำนวน: มาก</option>
          <option value="qty-asc">จำนวน: น้อย</option>
          <option value="name-asc">ชื่อ: ก-ฮ</option>
        </select>
      </div>

      {loading && rows.length === 0 ? (
        <p className="mt-8 text-center text-gray-400">กำลังโหลด...</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">ไม่มีสินค้าที่ค้างยืม</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-gray-500">สินค้าที่ค้างยืม {total.toLocaleString()} รายการ</p>
          <ul className="rounded bg-white shadow">
            {rows.map((r) => (
              <li
                key={r.product_id}
                onClick={() => onJump(r.product_id)}
                className="flex cursor-pointer items-center justify-between gap-3 border-b p-4 transition hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="break-words font-bold text-gray-900">{r.product_name}</p>
                  <p className="text-sm text-gray-500">{r.product_id}</p>
                </div>
                <span className="text-xl font-bold text-blue-600">{r.qty_out}</span>
              </li>
            ))}
          </ul>
          {rows.length < total && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="my-4 w-full rounded-lg border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {loadingMore ? "กำลังโหลด..." : `โหลดเพิ่ม (${rows.length}/${total.toLocaleString()})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
