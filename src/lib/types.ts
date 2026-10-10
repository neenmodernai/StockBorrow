// src/lib/types.ts
export const STATUS = {
  BORROWED: "อยู่ในระหว่างยืม",
  RETURNED: "คืนแล้ว",
  SOLD: "ทำขายแล้ว",
} as const;

export type Status = (typeof STATUS)[keyof typeof STATUS];

export const STATUS_LIST: Status[] = [STATUS.BORROWED, STATUS.RETURNED, STATUS.SOLD];

// Short label + colors for each status (same wording as the old app)
export const STATUS_META: Record<Status, { short: string; on: string; chip: string }> = {
  [STATUS.BORROWED]: {
    short: "ยืม",
    on: "bg-yellow-400 text-yellow-900 ring-2 ring-yellow-200",
    chip: "bg-yellow-50 border-yellow-300 text-yellow-800",
  },
  [STATUS.RETURNED]: {
    short: "คืน",
    on: "bg-green-400 text-green-900 ring-2 ring-green-200",
    chip: "bg-green-50 border-green-300 text-green-800",
  },
  [STATUS.SOLD]: {
    short: "ขาย",
    on: "bg-blue-400 text-blue-900 ring-2 ring-blue-200",
    chip: "bg-blue-50 border-blue-300 text-blue-800",
  },
};

export interface BorrowRow {
  uid: string;
  created_at: string;
  barcode: string | null;
  product_id: string;
  product_name: string;
  customer_name: string;
  quote_no: string | null;
  quantity: number;
  requester: string | null;
  notes: string | null;
  status: Status;
  deleted_at: string | null;
}

export interface StockRow {
  product_id: string;
  product_name: string;
  qty_out: number;
}

export type Notify = (message: string, type?: "success" | "error") => void;
