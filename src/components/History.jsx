import { computeTotals, formatDateLabel } from "../utils.js";

export default function History({ logs, selectedDate, onSelectDate }) {
  const dates = Object.keys(logs || {}).sort().reverse();

  if (dates.length === 0) {
    return (
      <section className="history-card">
        <h2>History</h2>
        <div className="empty">No entries yet.</div>
      </section>
    );
  }

  return (
    <section className="history-card">
      <h2>History</h2>
      <div className="history-list">
        {dates.map((date) => {
          const totals = computeTotals(logs[date]);
          const isSelected = date === selectedDate;
          return (
            <div
              key={date}
              className={`history-item ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectDate(date)}
            >
              <span className="history-date">{formatDateLabel(date)}</span>
              <span className="history-summary">
                {totals.calories} kcal · P{totals.protein} C{totals.carbs} F{totals.fats}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
