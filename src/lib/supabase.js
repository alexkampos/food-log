// Supabase client for the Food Log app.
// Reads public config from Vite environment variables:
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY
//   VITE_EDGE_PARSE_URL
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // In the browser this just means the env isn't set — the auth screen will
  // show a helpful message. Don't crash hard during build.
  console.warn(
    "Supabase env vars not set. Create .env.local from ENV.example (or set VITE_* on Vercel)."
  );
}

// options for the DATA API / DB
export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder");

// Full URL of the parse-food Edge Function
export const EDGE_PARSE_URL =
  import.meta.env.VITE_EDGE_PARSE_URL ||
  (url ? `${url.replace(/\/$/, "")}/functions/v1/parse-food` : "");

export function isSupabaseConfigured() {
  return Boolean(url && anonKey);
}
