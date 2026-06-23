import Link from "next/link";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";

export default async function ProfilePage() {
  const actor = await getCurrentActor();

  return (
    <main className="app-panel-page">
      <section className="app-panel">
        <p className="eyebrow">Profil</p>
        <h1>{actor ? "Session active." : "Accès public."}</h1>
        <p className="app-panel__lead">
          {actor
            ? "Tu peux consulter les partitions, gérer les chants et préparer les setlists."
            : "Tu peux consulter les accords des chants publiés. Connecte-toi pour accéder aux partitions et aux outils de l’équipe."}
        </p>
        <div className="settings-section">
          {actor ? (
            <form action="/api/auth/logout" method="post">
              <button className="admin-button" type="submit">
                Se déconnecter
              </button>
            </form>
          ) : (
            <Link className="admin-button admin-button--primary" href="/login">
              Se connecter
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
