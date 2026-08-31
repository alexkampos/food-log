// Test Supabase Auth (signup) — confirms email/password auth is enabled.
import { readFileSync } from "fs";
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const idx = line.indexOf("=");
  if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
}
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
const email = "test" + Date.now() + "@gmail.com";
const password = "testpass123";

async function run() {
  console.log("--- signup attempt ---");
  const r = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anon },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  console.log("status:", r.status);
  console.log(JSON.stringify(data));
  if (r.ok) {
    console.log("AUTH IS ENABLED. Session:", data.session ? "YES (auto-confirmed)" : "NO (check your email)");
  } else {
    console.log("AUTH NOT WORKING:", data.msg || data.error_description || data.message);
  }
}
run();
