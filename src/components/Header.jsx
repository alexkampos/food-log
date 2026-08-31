export default function Header({ apiStatus, onSignOut }) {
  const configured = apiStatus.configured;
  const authenticated = apiStatus.authenticated;

  const label = !configured
    ? "Setup needed"
    : authenticated
    ? "DeepSeek ready"
    : "Signed in";

  const className = configured && authenticated ? "ok" : "warn";

  return (
    <header className="app-header">
      <h1>🥗 Food Log</h1>
      <div className="header-right">
        <div className={`api-status ${className}`}>{label}</div>
        <button className="btn btn-mini" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
