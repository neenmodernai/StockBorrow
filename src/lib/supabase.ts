// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isConfigured = Boolean(url && key);

// Placeholders keep the build from crashing when env vars are not set yet.
export const supabase = createClient(url || "http://localhost:54321", key || "missing-key");
