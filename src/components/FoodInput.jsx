import { useState, useRef } from "react";
import { parseFood, addEntry } from "../api.js";

const MEALS = ["breakfast", "lunch", "dinner", "snack"];

export default function FoodInput({ date, onAdded, apiConfigured }) {
  const [text, setText] = useState("");
  const [meal, setMeal] = useState("lunch");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);

  const updateStatus = (type, message) => setStatus({ type, message });

  const handleLog = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      updateStatus("error", "Please describe what you ate.");
      return;
    }
    if (!apiConfigured) {
      updateStatus("info", "DeepSeek API key is not configured yet. Add it in config.js to parse food.");
      return;
    }

    setLoading(true);
    updateStatus("info", "Parsing your food with AI…");
    try {
      const parsed = await parseFood(trimmed);
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      const resolvedMeal = parsed.meal || meal;
      if (items.length === 0) {
        updateStatus("error", "No food items could be parsed.");
        return;
      }
      await addEntry({ date, meal: resolvedMeal, items, rawInput: trimmed });
      setText("");
      updateStatus("success", `Logged ${items.length} item${items.length > 1 ? "s" : ""} as ${resolvedMeal}.`);
      onAdded();
    } catch (err) {
      updateStatus("error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Run two recognizers in parallel (English + Greek) so the spoken language
  // is detected automatically: whichever produces a confident result wins.
  const LANGUAGES = ["en-US", "el-GR"];

  const handleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      updateStatus("error", "Voice recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isRecordingRef.current) {
      recognitionRef.current?.forEach((r) => r.stop());
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognizers = [];
    recognitionRef.current = recognizers;

    let finished = 0;
    let settled = false;

    const settle = (transcript) => {
      if (settled) return;
      settled = true;
      // Stop any recognizers still running
      recognizers.forEach((r) => {
        if (r.ignoreUntilEnd) return;
        try { r.stop(); } catch { /* ignore */ }
      });
      isRecordingRef.current = false;
      setListening(false);
      if (transcript) {
        setText((prev) => (prev ? prev + " " + transcript : transcript));
        updateStatus("success", "Captured voice. Review the text, then press Log it.");
      }
    };

    const onEndCheck = () => {
      finished += 1;
      if (finished === recognizers.length && !settled) {
        isRecordingRef.current = false;
        setListening(false);
      }
    };

    LANGUAGES.forEach((lang) => {
      const recognition = new SR();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = false;
      let recognized = false;
      recognition.ignoreUntilEnd = false;

      recognition.onstart = () => {
        isRecordingRef.current = true;
        setListening(true);
        updateStatus("info", "🎙️ Listening…");
      };

      recognition.onresult = (event) => {
        const best = event.results[0];
        if (!best || best.isFinal === false) return;
        const transcript = best[0].transcript.trim();
        const confidence = best[0].confidence || 0;
        if (!transcript) return;

        // If a result from another recognizer already won, ignore.
        if (settled) return;

        recognized = true;
        // Start settled as soon as any language produces a solid result.
        // (Only one recognizer typically returns a usable final result for a
        // short utterance.)
        settle(transcript);
      };

      recognition.onerror = (event) => {
        if (event.error !== "aborted" && !recognized && !settled) {
          // Only surface an error if the browser doesn't support the language.
        }
      };

      recognition.onend = () => {
        recognition.ignoreUntilEnd = true;
        onEndCheck();
      };

      recognizers.push(recognition);
      try {
        recognition.start();
      } catch (err) {
        recognition.ignoreUntilEnd = true;
        onEndCheck();
      }
    });
  };

  return (
    <section className="input-card">
      <h2>Log your food</h2>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Try: "200g grilled chicken breast, a cup of rice, and salad with 1 tbsp olive oil"'
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleLog();
        }}
      />

      <div className="input-actions">
        <button
          className="btn btn-primary"
          onClick={handleLog}
          disabled={loading || !apiConfigured}
        >
          {loading ? "Parsing…" : "Log it"}
        </button>
        <button
          className={`btn btn-voice ${listening ? "recording" : ""}`}
          onClick={handleVoice}
        >
          {listening ? "⏹ Stop" : "🎙️ Voice"}
        </button>
        <span className={`voice-status ${listening ? "listening" : ""}`}>
          {listening ? "Recording… speak now" : ""}
        </span>
      </div>

      <div className="meal-tabs">
        {MEALS.map((m) => (
          <button
            key={m}
            className={`meal-tab ${meal === m ? "active" : ""}`}
            onClick={() => setMeal(m)}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {status.message && (
        <div className={`parse-status ${status.type}`}>{status.message}</div>
      )}
    </section>
  );
}
