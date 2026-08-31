import { useEffect, useState, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import { fetchLogs, checkApiStatus } from "./api.js";
import { todayLocalStr, computeTotals, formatDateLabel } from "./utils.js";
import Auth from "./components/Auth.jsx";
import Header from "./components/Header.jsx";
import DatePickerBar from "./components/DatePickerBar.jsx";
import FoodInput from "./components/FoodInput.jsx";
import ManualEntry from "./components/ManualEntry.jsx";
import Totals from "./components/Totals.jsx";
import LogList from "./components/LogList.jsx";
import History from "./components/History.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logs, setLogs] = useState({});
  const [selectedDate, setSelectedDate] = useState(todayLocalStr());
  const [apiStatus, setApiStatus] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEntryAdded = useCallback(() => setRefreshKey((k) => k + 1), []);

  // On mount: read the current auth session and listen for changes.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setAuthLoading(false);
      })
      .catch(() => setAuthLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setAuthLoading(false);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  // Load logs + API status whenever we have a session.
  useEffect(() => {
    if (!session) {
      setLogs({});
      return;
    }
    fetchLogs()
      .then(setLogs)
      .catch((e) => console.error("Failed to load logs:", e.message));
    checkApiStatus().then(setApiStatus);
  }, [session, refreshKey]);

  if (authLoading) {
    return <div className="app"><div className="empty">Loading…</div></div>;
  }

  if (!session) {
    return (
      <div className="app">
        <Auth />
      </div>
    );
  }

  const dayEntries = logs[selectedDate] || [];
  const totals = computeTotals(dayEntries);
  const dayLabel = formatDateLabel(selectedDate);

  const handleDateChange = (date) => setSelectedDate(date);
  const handleSignOut = () => supabase.auth.signOut();

  return (
    <div className="app">
      <Header apiStatus={apiStatus} onSignOut={handleSignOut} />

      <DatePickerBar selectedDate={selectedDate} onChange={handleDateChange} />

      <FoodInput
        date={selectedDate}
        onAdded={handleEntryAdded}
        apiConfigured={apiStatus.configured}
      />

      <ManualEntry date={selectedDate} onAdded={handleEntryAdded} />

      <Totals totals={totals} />

      <LogList
        date={selectedDate}
        entries={dayEntries}
        dayLabel={dayLabel}
        onChanged={handleEntryAdded}
      />

      <History logs={logs} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
    </div>
  );
}
