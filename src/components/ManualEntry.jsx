import { useState } from "react";
import { addEntry } from "../api.js";

const EMPTY = { food: "", calories: "", protein: "", carbs: "", fats: "" };

export default function ManualEntry({ date, onAdded }) {
  const [form, setForm] = useState(EMPTY);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const food = form.food.trim();
    const cal = parseFloat(form.calories);
    if (!food || isNaN(cal)) {
      alert("Enter at least a food name and calories.");
      return;
    }
    const item = {
      food,
      quantity: 1,
      unit: "serving",
      calories: cal || 0,
      protein: parseFloat(form.protein) || 0,
      carbs: parseFloat(form.carbs) || 0,
      fats: parseFloat(form.fats) || 0,
    };
    try {
      await addEntry({ date, meal: "snack", items: [item], rawInput: food });
      setForm(EMPTY);
      onAdded();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section className="manual-card">
      <h3>Add manually (optional)</h3>
      <form className="manual-row" onSubmit={handleSubmit}>
        <input type="text" placeholder="Food name" value={form.food} onChange={set("food")} />
        <div className="manual-num">
          <label>Cal</label>
          <input type="number" min="0" step="0.1" placeholder="kcal" value={form.calories} onChange={set("calories")} />
        </div>
        <div className="manual-num">
          <label>P</label>
          <input type="number" min="0" step="0.1" placeholder="g" value={form.protein} onChange={set("protein")} />
        </div>
        <div className="manual-num">
          <label>C</label>
          <input type="number" min="0" step="0.1" placeholder="g" value={form.carbs} onChange={set("carbs")} />
        </div>
        <div className="manual-num">
          <label>F</label>
          <input type="number" min="0" step="0.1" placeholder="g" value={form.fats} onChange={set("fats")} />
        </div>
        <button className="btn btn-secondary" type="submit">Add</button>
      </form>
    </section>
  );
}
