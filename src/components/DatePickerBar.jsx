import { formatDateLabel } from "../utils.js";

export default function DatePickerBar({ selectedDate, onChange }) {
  return (
    <section className="date-bar">
      <label htmlFor="datePicker">Date:</label>
      <input
        type="date"
        id="datePicker"
        value={selectedDate}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="date-label">{formatDateLabel(selectedDate)}</span>
    </section>
  );
}
