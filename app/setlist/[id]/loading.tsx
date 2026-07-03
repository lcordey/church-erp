export default function SetlistDetailLoading() {
  return (
    <main className="setlist-page">
      <div className="setlist-shell">
        <div
          aria-busy="true"
          aria-live="polite"
          className="song-route-loading"
          role="status"
        >
          <span aria-hidden="true" className="catalog-loading__spinner" />
          <span>Ouverture de la setlist…</span>
        </div>
      </div>
    </main>
  );
}
