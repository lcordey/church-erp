export default function SongLoading() {
  return (
    <main className="song-page song-page--immersive">
      <div className="song-page__shell song-page__shell--immersive">
        <div
          aria-busy="true"
          aria-live="polite"
          className="song-route-loading"
          role="status"
        >
          <span aria-hidden="true" className="catalog-loading__spinner" />
          <span>Ouverture du chant…</span>
        </div>
      </div>
    </main>
  );
}
