// Data layer for the Food Log app.
// All reads/writes go through Supabase (Postgres) with Row Level Security
// scoping every row to the signed-in user. There is no longer a bundled
// Express backend.
import { supabase, isSupabaseConfigured } from "./lib/supabase.js";

export { parseFood } from "./lib/parseFood.js";

function requireConfig() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
}

// Get all logs for the current user, grouped by date.
// Returns e.g. { "2025-01-01": [entry, ...] }
export async function fetchLogs() {
  requireConfig();
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const grouped = {};
  for (const row of data || []) {
    const key = row.date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(transformRow(row));
  }
  return grouped;
}
// Add a food entry.
// payload: { date, meal, items, rawInput, user_id }
export async function addEntry(payload) {
  requireConfig();

  // Resolve user_id from the current session if not provided.
  let userId = payload.user_id;
  if (!userId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  const { data, error } = await supabase
    .from("logs")
    .insert({
      user_id: userId,
      date: payload.date,
      meal: payload.meal,
      items: payload.items,
      raw_input: payload.rawInput,
    })
    .select()
    .single();

  if (error) throw error;
  return transformRow(data);
}

// Delete an entry by its UUID id.
export async function deleteEntry(date, id) {
  requireConfig();
  const { error } = await supabase.from("logs").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}

// Update an entry's items.
export async function updateEntry(date, id, items) {
  requireConfig();
  const { data, error } = await supabase
    .from("logs")
    .update({ items })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return transformRow(data);
}

// Health/status: whether Supabase is configured + a user is signed in.
// Returns { configured, authenticated }
export async function checkApiStatus() {
  if (!isSupabaseConfigured()) {
    return { configured: false, authenticated: false, error: "Supabase not configured" };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { configured: true, authenticated: Boolean(session) };
}

// Convert a DB row (snake_case + uuid) to the app's entry shape.
function transformRow(row) {
  return {
    id: row.id,
    meal: row.meal,
    items: Array.isArray(row.items) ? row.items : [],
    rawInput: row.raw_input || "",
    addedAt: row.created_at,
    date: row.date,
  };
}

