export default function Totals({ totals }) {
  const items = [
    { key: "calories", label: "Calories (kcal)", display: `${totals.calories}` },
    { key: "protein", label: "Protein", display: `${totals.protein}g` },
    { key: "carbs", label: "Carbs", display: `${totals.carbs}g` },
    { key: "fats", label: "Fats", display: `${totals.fats}g` },
  ];

  return (
    <section className="totals-card">
      <h2>Today's Totals</h2>
      <div className="totals-grid">
        {items.map((it) => (
          <div className="total-item" key={it.key}>
            <span className="total-num">{it.display}</span>
            <span className="total-label">{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
