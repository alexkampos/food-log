import { useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

export default function Auth() {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="auth-card">
        <h2>🥗 Food Log</h2>
        <div className="parse-status error">
          Supabase is not configured. Create a <code>.env.local</code> from
          <code> ENV.example </code>
          (or set the VITE_* vars) and restart.
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setMsg({
            type: "info",
            text: "Account created. Check your email to confirm, then sign in.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>🥗 Food Log</h2>
      <p className="auth-sub">Sign in or create an account to track your meals.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>

        {msg.text && <div className={`parse-status ${msg.type}`}>{msg.text}</div>}
      </form>

      <button
        className="link-btn"
        onClick={() => setMode((m) => (m === "signup" ? "login" : "signup"))}
      >
        {mode === "signup"
          ? "Already have an account? Sign in"
          : "New here? Create an account"}
      </button>
    </div>
  );
}
