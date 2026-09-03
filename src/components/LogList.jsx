import { useState } from "react";
import { deleteEntry, updateEntry, saveFoodCache } from "../api.js";
import { formatQuantity } from "../utils.js";

const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function mealLabel(m) {
  return MEAL_LABELS[m] || "Snack";
}

const SOURCE_LABEL = {
  openfoodfacts: "Open Food Facts",
  usda: "USDA",
  corrected: "Corrected",
  ai: "AI estimate",
  manual: "Manual",
};

function sourceTag(source) {
  return SOURCE_LABEL[source] || "—";
}

function ItemEditor({ item, onChange, onRemove }) {
  const fields = [
    ["calories", "kcal"],
    ["protein", "g"],
    ["carbs", "g"],
    ["fats", "g"],
  ];
  return (
    <div className="item-editor">
      <div className="item-editor-head">
        <input
          className="edit-food"
          type="text"
          value={item.food || ""}
          onChange={(e) => onChange({ ...item, food: e.target.value })}
        />
        <button className="delete-btn" title="Remove item" onClick={onRemove}>✕</button>
      </div>
      <div className="edit-fields">
        <label className="edit-qty">
          Qty
          <input
            type="number"
            step="any"
            value={item.quantity ?? ""}
            onChange={(e) => onChange({ ...item, quantity: e.target.value })}
          />
        </label>
        <label className="edit-qty">
          Unit
          <input
            type="text"
            value={item.unit || ""}
            onChange={(e) => onChange({ ...item, unit: e.target.value })}
          />
        </label>
        {fields.map(([key, unit]) => (
          <label className="edit-num" key={key}>
            {key[0].toUpperCase()}
            <input
              type="number"
              step="any"
              value={item[key] ?? ""}
              onChange={(e) => onChange({ ...item, [key]: e.target.value })}
            />
            <span className="edit-unit">{unit}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function LogList({ date, entries, dayLabel, onChanged }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState([]);

  if (!entries || entries.length === 0) {
    return (
      <section className="log-card">
        <h2>Log for {dayLabel}</h2>
        <div className="empty">No food logged for this day yet.</div>
      </section>
    );
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteEntry(date, id);
      onChanged();
    } catch (err) {
      alert(err.message);
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setDraft(entry.items.map((it) => ({ ...it })));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft([]);
  };

  const saveEdit = async (id) => {
    try {
      await updateEntry(date, id, draft);
      // Remember user-corrected macros so the same food parses correctly next time.
      for (const item of draft) {
        try {
          await saveFoodCache(item);
        } catch {
          // Cache write is best-effort; never block saving the log entry.
        }
      }
      cancelEdit();
      onChanged();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section className="log-card">
      <h2>Log for {dayLabel}</h2>
      <div className="log-list">
        {entries.map((entry) => {
          const cals = entry.items.reduce((s, it) => s + Number(it.calories || 0), 0);
          const protein = entry.items.reduce((s, it) => s + Number(it.protein || 0), 0);
          const carbs = entry.items.reduce((s, it) => s + Number(it.carbs || 0), 0);
          const fats = entry.items.reduce((s, it) => s + Number(it.fats || 0), 0);
          const isEditing = editingId === entry.id;

          return (
            <div className="entry" key={entry.id}>
              <div className="entry-head">
                <span className="entry-meal">{mealLabel(entry.meal)}</span>
                <div className="entry-macros">
                  <span><strong>{Math.round(cals)}</strong> kcal</span>
                  <span>P <strong>{Math.round(protein)}g</strong></span>
                  <span>C <strong>{Math.round(carbs)}g</strong></span>
                  <span>F <strong>{Math.round(fats)}g</strong></span>
                  {isEditing ? (
                    <>
                      <button className="btn btn-mini btn-primary" onClick={() => saveEdit(entry.id)}>Save</button>
                      <button className="btn btn-mini" onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-mini" onClick={() => startEdit(entry)}>Edit</button>
                      <button
                        className="delete-btn"
                        title="Delete"
                        onClick={() => handleDelete(entry.id)}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="entry-items">
                  {draft.map((item, i) => (
                    <ItemEditor
                      key={i}
                      item={item}
                      onChange={(next) =>
                        setDraft((d) => d.map((it, idx) => (idx === i ? next : it)))
                      }
                      onRemove={() =>
                        setDraft((d) => d.filter((_, idx) => idx !== i))
                      }
                    />
                  ))}
                  <button
                    className="btn btn-mini"
                    onClick={() =>
                      setDraft((d) => [
                        ...d,
                        { food: "", quantity: 1, unit: "serving", calories: 0, protein: 0, carbs: 0, fats: 0 },
                      ])
                    }
                  >
                    + Add item
                  </button>
                </div>
              ) : (
                <div className="entry-items">
                  {entry.items.map((item, i) => (
                    <div className="entry-item" key={i}>
                      <span>
                        {item.food}
                        {item.matchName && item.matchName !== item.food && (
                          <span className="muted"> ({item.matchName})</span>
                        )}
                        {formatQuantity(item) && <span className="muted"> ({formatQuantity(item)})</span>}
                      </span>
                      <span className="item-right">
                        <span className="item-nutr">
                          {item.calories ? `${Math.round(item.calories)} kcal` : ""}
                        </span>
                        <span className={`source-tag ${item.source || ""}`}>
                          {sourceTag(item.source)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {entry.rawInput && (
                <div className="entry-raw">“{entry.rawInput}”</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
