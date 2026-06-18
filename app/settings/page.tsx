import { MusicNotationToggle } from "@/src/modules/songs/components/music-notation-toggle";

export default function SettingsPage() {
  return (
    <main className="app-panel-page">
      <section className="app-panel">
        <p className="eyebrow">Réglages</p>
        <h1>Préférences de lecture et d’affichage.</h1>
        <p className="app-panel__lead">
          Les réglages globaux de l’application seront centralisés ici au fur et
          à mesure de l’évolution du produit.
        </p>

        <div className="settings-section">
          <div>
            <h2>Notation musicale</h2>
            <p>
              Choisissez la convention utilisée pour les tonalités et les
              accords dans les chants.
            </p>
          </div>
          <MusicNotationToggle />
        </div>

        <div className="settings-section settings-section--placeholder">
          <div>
            <h2>Thème</h2>
            <p>
              Le choix du thème visuel sera ajouté ici quand la direction
              d’interface sera stabilisée.
            </p>
          </div>
          <span className="settings-badge">Bientôt</span>
        </div>
      </section>
    </main>
  );
}
