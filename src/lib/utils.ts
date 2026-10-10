// src/lib/utils.ts

// Remove characters that would break a PostgREST filter string.
export function cleanTerm(input: string): string {
  return input.replace(/[,()%*\\:"]/g, " ").trim();
}

// Show timestamps in Thailand time, like the old sheet did.
export function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }),
    time: d.toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }),
  };
}

// "2026-09" -> [start, end) of that month in Thailand time.
export function monthRange(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  return [`${y}-${pad(m)}-01T00:00:00+07:00`, `${nextY}-${pad(nextM)}-01T00:00:00+07:00`];
}
