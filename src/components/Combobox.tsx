// src/components/Combobox.tsx
"use client";
import { useRef, useState } from "react";

export interface ComboOption {
  value: string;
  label: string;
  sub?: string;
  isNew?: boolean;
}

interface Props {
  label: string;
  value: string;
  onChange: (text: string) => void;
  onSelect: (option: ComboOption) => void;
  fetchOptions: (query: string) => Promise<ComboOption[]>;
  placeholder?: string;
  required?: boolean;
}

// Search-as-you-type box. Results come from the database, so it stays fast
// even with 18,000+ products.
export default function Combobox({ label, value, onChange, onSelect, fetchOptions, placeholder, required }: Props) {
  const [options, setOptions] = useState<ComboOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleInput(text: string) {
    onChange(text);
    setOpen(true);
    clearTimeout(timer.current);
    const id = ++reqId.current;
    const q = text.trim();
    if (!q) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetchOptions(q);
        if (id === reqId.current) setOptions(res);
      } catch {
        if (id === reqId.current) setOptions([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 200);
  }

  function pick(opt: ComboOption) {
    setOpen(false);
    setOptions([]);
    onSelect(opt);
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={value}
        required={required}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => value.trim() && handleInput(value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && open && options[0]) {
            e.preventDefault();
            pick(options[0]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className="mt-1 block w-full rounded-md border border-gray-300 p-3 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {open && value.trim() && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg">
          {loading && options.length === 0 && <li className="p-3 text-sm text-gray-400">กำลังค้นหา...</li>}
          {!loading && options.length === 0 && <li className="p-3 text-sm text-gray-500">ไม่พบข้อมูล</li>}
          {options.map((o) => (
            <li
              key={o.value + o.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
              className={`cursor-pointer border-b border-gray-100 p-3 text-sm hover:bg-gray-100 ${
                o.isNew ? "italic text-blue-700" : ""
              }`}
            >
              {o.sub && <span className="mr-2 font-semibold text-gray-900">{o.sub}</span>}
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
