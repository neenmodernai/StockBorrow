// src/app/page.tsx
"use client";
import { useCallback, useRef, useState } from "react";
import BorrowForm from "@/components/BorrowForm";
import BorrowList from "@/components/BorrowList";
import StockSummary from "@/components/StockSummary";
import { isConfigured } from "@/lib/supabase";
import type { Notify } from "@/lib/types";

type Tab = "borrow" | "list" | "summary";

const TITLES: Record<Tab, string> = {
  borrow: "ขอเบิกสินค้า",
  list: "รายการยืม",
  summary: "สรุปสต็อก",
};

const ICONS: Record<Tab, string> = {
  borrow: "M12 4.5v15m7.5-7.5h-15",
  list: "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm0 5.25h.007v.008H3.75V12Zm0 5.25h.007v.008H3.75v-.008Z",
  summary: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("borrow");
  const [visited, setVisited] = useState<Set<Tab>>(new Set(["borrow"]));
  const [preset, setPreset] = useState({ term: "", nonce: 0 });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify: Notify = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  function go(next: Tab) {
    setTab(next);
    setVisited((v) => new Set(v).add(next));
  }

  function jumpToList(term: string) {
    setPreset((p) => ({ term, nonce: p.nonce + 1 }));
    go("list");
  }

  if (!isConfigured) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-bold text-red-600">ยังไม่ได้ตั้งค่า Supabase</h1>
        <p className="mt-2 text-sm text-gray-700">
          ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน Vercel (Settings → Environment Variables) แล้ว Redeploy
        </p>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-white shadow-2xl">
      <header className="pt-safe flex select-none items-center justify-between bg-blue-600 px-4 pb-4 text-white shadow-md">
        <h1 className="text-xl font-bold">{TITLES[tab]}</h1>
        <span className="rounded bg-blue-700 px-2 py-1 text-xs">v3.0</span>
      </header>

      <main className="flex-1 p-4 pb-28">
        <div hidden={tab !== "borrow"}>
          <BorrowForm notify={notify} onFinished={() => go("list")} />
        </div>
        {visited.has("list") && (
          <div hidden={tab !== "list"}>
            <BorrowList active={tab === "list"} preset={preset} notify={notify} />
          </div>
        )}
        {visited.has("summary") && (
          <div hidden={tab !== "summary"}>
            <StockSummary active={tab === "summary"} notify={notify} onJump={jumpToList} />
          </div>
        )}
      </main>

      <nav className="pb-safe fixed bottom-0 left-0 right-0 z-40 mx-auto flex max-w-lg justify-around border-t border-gray-200 bg-white pt-3 shadow-inner">
        {(Object.keys(TITLES) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => go(t)}
            className={`flex min-w-20 flex-col items-center ${tab === t ? "text-blue-600" : "text-gray-500"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[t]} />
            </svg>
            <span className="text-xs font-medium">{t === "borrow" ? "ขอเบิก" : TITLES[t]}</span>
          </button>
        ))}
      </nav>

      {toast && (
        <div
          className={`fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === "error" ? "bg-red-500" : "bg-green-500"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
