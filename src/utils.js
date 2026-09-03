// Helpers for displaying and computing nutrition data.

// Lowercase + strip diacritics + fold final sigma. Mirrors the edge function's
// normalization so the food_cache name_key matches on both ends.
export function normalizeFoodName(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ς/g, "σ")
    .normalize("NFC")
    .trim();
}

// Sum macros across all entries for a given date.
export function computeTotals(entries = []) {
  const totals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
  for (const entry of entries) {
    for (const item of entry.items || []) {
      totals.calories += num(item.calories);
      totals.protein += num(item.protein);
      totals.carbs += num(item.carbs);
      totals.fats += num(item.fats);
    }
  }
  return {
    calories: round(totals.calories),
    protein: round(totals.protein),
    carbs: round(totals.carbs),
    fats: round(totals.fats),
  };
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function round(v) {
  return Math.round(v * 10) / 10;
}

// Format a quantity+unit nicely.
export function formatQuantity(item) {
  const q = item.quantity;
  if (q === undefined || q === null || q === "") return "";
  return `${q}${item.unit ? " " + item.unit : ""}`;
}

// Add today's date as YYYY-MM-DD (local time).
export function todayLocalStr() {
  const d = new Date();
  return localDateStr(d);
}

export function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Nicer display label for a date.
export function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  if (localDateStr(now) === dateStr) return "Today";
  if (localDateStr(new Date(now.getTime() - 86400000)) === dateStr) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
