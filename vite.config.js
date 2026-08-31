import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// The Food Log app is a pure frontend now — data + auth come from Supabase,
// and AI parsing runs in a Supabase Edge Function (parse-food).
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "."),
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
