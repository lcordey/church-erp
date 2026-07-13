import { AppThemeToggle } from "@/src/components/app-theme-toggle";
import { InfoTooltip } from "@/src/components/info-tooltip";
import { PwaInstallSettings } from "@/src/components/pwa-install-settings";
import { PushNotificationSettings } from "@/src/components/push-notification-settings";
import { MusicNotationToggle } from "@/src/modules/songs/components/music-notation-toggle";
import { SongRenderPreferencesControls } from "@/src/modules/songs/components/song-render-preferences-controls";

export default function SettingsPage() {
  return (
    <main className="app-panel-page">
      <section className="app-panel">
        <p className="eyebrow">Réglages</p>
        <h1>Préférences de lecture et d’affichage.</h1>

        <div className="settings-section">
          <div>
            <h2>Thème</h2>
            <InfoTooltip>Choisissez l’ambiance générale de l’application. Le thème est conservé localement sur cet appareil.</InfoTooltip>
          </div>
          <AppThemeToggle />
        </div>

        <div className="settings-section">
          <div>
            <h2>Notation musicale</h2>
            <InfoTooltip>Choisissez la convention utilisée pour les tonalités et les accords dans les chants.</InfoTooltip>
          </div>
          <MusicNotationToggle />
        </div>

        <div className="settings-section settings-section--stacked">
          <div>
            <h2>Lecture des chants</h2>
            <InfoTooltip>Définissez le rendu et la source d’ouverture par défaut des chants. Ces préférences sont conservées localement sur cet appareil.</InfoTooltip>
          </div>
          <SongRenderPreferencesControls showDescription />
        </div>

        <section className="settings-section settings-section--stacked">
          <div>
            <h2>Notifications</h2>
            <InfoTooltip>Choisissez les alertes reçues sur cet appareil. Les types sont activés par défaut.</InfoTooltip>
          </div>
          <PushNotificationSettings />
        </section>
        <PwaInstallSettings />
      </section>
    </main>
  );
}
