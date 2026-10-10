// src/components/BorrowList.tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STATUS, STATUS_LIST, STATUS_META, type BorrowRow, type Notify, type Status } from "@/lib/types";
import { cleanTerm, formatDateTime, monthRange } from "@/lib/utils";

interface Props {
  active: boolean;
  preset: { term: string; nonce: number };
  notify: Notify;
}

const PAGE = 30;
// Only the columns the cards actually show (less data over the wire)
const LIST_COLUMNS =
  "uid,created_at,product_id,product_name,customer_name,quote_no,quantity,requester,notes,status";

export default function BorrowList({ active, preset, notify }: Props) {
  const [rows, setRows] = useState<BorrowRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [month, setMonth] = useState("");
  const [sortBy, setSortBy] = useState<"new" | "product">("new");
  // Default view = items still out on borrow (what people look for most)
  const [statuses, setStatuses] = useState<Record<Status, boolean>>({
    [STATUS.BORROWED]: true,
    [STATUS.RETURNED]: false,
    [STATUS.SOLD]: false,
  });
  const [tick, setTick] = useState(0);
  const [undoRow, setUndoRow] = useState<BorrowRow | null>(null);
  const reqId = useRef(0);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const statusKey = STATUS_LIST.filter((s) => statuses[s]).join("|");

  // Jump here from the stock summary: search that product, show only "ยืม"
  useEffect(() => {
    if (preset.nonce === 0) return;
    setSearchInput(preset.term);
    setQ(preset.term);
    setMonth("");
    setStatuses({ [STATUS.BORROWED]: true, [STATUS.RETURNED]: false, [STATUS.SOLD]: false });
  }, [preset]);

  // Wait a moment after typing before searching
  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const buildQuery = useCallback(
    (from: number) => {
      let qb = supabase
        .from("borrow_log")
        .select(LIST_COLUMNS, { count: "exact" })
        .is("deleted_at", null)
        .in("status", STATUS_LIST.filter((s) => statuses[s]));
      if (month) {
        const [start, end] = monthRange(month);
        qb = qb.gte("created_at", start).lt("created_at", end);
      }
      const t = cleanTerm(q);
      if (t) {
        qb = qb.or(
          ["product_name", "product_id", "customer_name", "quote_no", "notes"].map((c) => `${c}.ilike.%${t}%`).join(",")
        );
      }
      qb =
        sortBy === "new"
          ? qb.order("created_at", { ascending: false })
          : qb.order("product_id").order("created_at", { ascending: false });
      return qb.range(from, from + PAGE - 1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusKey, month, q, sortBy]
  );

  // Reload from page 1 whenever a filter changes, the tab opens, or something was undone/failed
  useEffect(() => {
    if (!active) return;
    if (!statusKey) {
      setRows([]);
      setTotal(0);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    buildQuery(0).then(({ data, count, error }) => {
      if (id !== reqId.current) return;
      setLoading(false);
      if (error) {
        notify(`โหลดข้อมูลไม่สำเร็จ: ${error.message}`, "error");
        return;
      }
      setRows((data ?? []) as unknown as BorrowRow[]);
      setTotal(count ?? 0);
    });
  }, [active, buildQuery, statusKey, tick, notify]);

  async function loadMore() {
    setLoadingMore(true);
    const { data, error } = await buildQuery(rows.length);
    setLoadingMore(false);
    if (error) {
      notify(`โหลดข้อมูลไม่สำเร็จ: ${error.message}`, "error");
      return;
    }
    setRows((prev) => {
      const seen = new Set(prev.map((r) => r.uid));
      return [...prev, ...((data ?? []) as unknown as BorrowRow[]).filter((r) => !seen.has(r.uid))];
    });
  }

  async function changeStatus(uid: string, status: Status) {
    const prev = rows.find((r) => r.uid === uid);
    if (!prev || prev.status === status) return;
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, status } : r)));
    const { error } = await supabase.from("borrow_log").update({ status }).eq("uid", uid);
    if (error) {
      setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, status: prev.status } : r)));
      notify("อัปเดตไม่สำเร็จ", "error");
    } else {
      notify("อัปเดตแล้ว", "success");
      // Resolved items disappear from the open list (they are not loaded unless asked for)
      if (!statuses[status]) {
        setTimeout(() => {
          setRows((rs) => rs.filter((r) => !(r.uid === uid && r.status === status)));
          setTotal((t) => Math.max(0, t - 1));
        }, 1500);
      }
    }
  }

  // Manual opt-in: also include returned / sold items in the list
  function includeResolved() {
    setStatuses({ [STATUS.BORROWED]: true, [STATUS.RETURNED]: true, [STATUS.SOLD]: true });
  }

  async function remove(row: BorrowRow) {
    setRows((rs) => rs.filter((r) => r.uid !== row.uid));
    setTotal((t) => Math.max(0, t - 1));
    const { error } = await supabase
      .from("borrow_log")
      .update({ deleted_at: new Date().toISOString() })
      .eq("uid", row.uid);
    if (error) {
      notify("ลบไม่สำเร็จ", "error");
      setTick((t) => t + 1);
      return;
    }
    setUndoRow(row);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoRow(null), 8000);
  }

  async function undo() {
    if (!undoRow) return;
    const { error } = await supabase.from("borrow_log").update({ deleted_at: null }).eq("uid", undoRow.uid);
    clearTimeout(undoTimer.current);
    setUndoRow(null);
    if (error) notify("กู้คืนไม่สำเร็จ", "error");
    else {
      notify("กู้คืนแล้ว", "success");
      setTick((t) => t + 1);
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา สินค้า / ลูกค้า / เลขใบเสนอราคา..."
            className="min-w-0 flex-grow rounded border border-gray-300 p-2 text-sm"
          />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-36 rounded border border-gray-300 bg-white p-2 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex gap-2">
            {STATUS_LIST.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatuses((p) => ({ ...p, [s]: !p[s] }))}
                className={`rounded-full border px-3 py-1.5 font-medium ${
                  statuses[s] ? STATUS_META[s].chip : "border-gray-200 bg-white text-gray-400"
                }`}
              >
                {STATUS_META[s].short}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "new" | "product")}
            className="rounded border border-gray-300 bg-white p-1.5 text-xs"
          >
            <option value="new">ใหม่สุด</option>
            <option value="product">รหัสสินค้า</option>
          </select>
        </div>
      </div>

      {!statuses[STATUS.RETURNED] && !statuses[STATUS.SOLD] && (
        <p className="mb-2 text-xs text-gray-400">แสดงเฉพาะรายการที่ยังค้างยืม — กด “คืน” หรือ “ขาย” ด้านบนเพื่อดูรายการเก่า</p>
      )}

      {loading && rows.length === 0 ? (
        <p className="mt-8 text-center text-gray-400">กำลังโหลด...</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 text-center text-gray-500">
          <p>ไม่พบข้อมูล</p>
          {!statuses[STATUS.RETURNED] && !statuses[STATUS.SOLD] && (
            <button
              type="button"
              onClick={includeResolved}
              className="mt-3 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-blue-700"
            >
              ค้นหารวมรายการที่คืน/ขายแล้ว
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-gray-500">พบ {total.toLocaleString()} รายการ</p>
          {rows.map((item) => {
            const { date, time } = formatDateTime(item.created_at);
            return (
              <div key={item.uid} className="mb-3 rounded-lg border border-gray-200 bg-white p-4 shadow">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-bold text-blue-700">{item.product_name}</p>
                    <p className="text-sm text-gray-500">
                      {item.product_id} | จำนวน: {item.quantity}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-xs font-medium text-gray-800">{date}</span>
                    <span className="block text-xs text-gray-400">{time}</span>
                  </div>
                </div>
                <div className="mb-3 space-y-1 text-sm text-gray-700">
                  <p>
                    <strong>ลูกค้า:</strong> {item.customer_name}
                    {item.quote_no ? ` (${item.quote_no})` : ""}
                  </p>
                  {item.requester && (
                    <p className="text-xs text-gray-500">ผู้แจ้ง: {item.requester}</p>
                  )}
                  {item.notes && (
                    <p className="whitespace-pre-line rounded bg-gray-50 p-1.5 text-sm">
                      <strong>หมายเหตุ:</strong> {item.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {STATUS_LIST.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => changeStatus(item.uid, s)}
                      className={`flex-1 rounded-full px-2 py-2.5 text-sm font-medium transition ${
                        item.status === s ? `${STATUS_META[s].on} shadow-md` : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {STATUS_META[s].short}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    className="shrink-0 rounded-full bg-red-100 px-4 py-2.5 text-sm text-red-700 hover:bg-red-200"
                    aria-label="ลบรายการ"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            );
          })}
          {rows.length < total && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {loadingMore ? "กำลังโหลด..." : `โหลดเพิ่ม (${rows.length}/${total.toLocaleString()})`}
            </button>
          )}
        </>
      )}

      {undoRow && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full bg-gray-800 px-6 py-3 text-white shadow-lg">
          <span className="text-sm">ลบรายการแล้ว</span>
          <button onClick={undo} className="text-sm font-bold text-blue-300 hover:text-blue-200">
            เลิกทำ
          </button>
        </div>
      )}
    </div>
  );
}
