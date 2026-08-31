// Helper to call the Supabase Edge Function that parses food text.
// The function is invoked with the user's anon JWT as Authorization so
// Supabase knows who is calling; the function does NOT need the key but it
// honors the auth header so standard Supabase Function invocations work.
import { supabase, EDGE_PARSE_URL, isSupabaseConfigured } from "./supabase.js";

export async function parseFood(text, noDb = false) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(EDGE_PARSE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({ text, noDb }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }

  if (!res.ok) {
    const message = data?.error || `Parse request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}
