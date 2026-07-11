import Link from "next/link";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";

export default async function ProfilePage() {
  const actor = await getCurrentActor();
  return (
    <main className="app-panel-page">
      <section className="app-panel">
        <p className="eyebrow">Profil</p>
        <h1>{actor ? actor.displayName : "Accès public"}</h1>
        <p className="app-panel__lead">
          {actor
            ? `Connecté avec l’identifiant ${actor.username}. Groupes : ${actor.groupCodes.map((code) => code === "admin" ? "Admin" : "Louange").join(", ")}.`
            : "Tu peux consulter les accords et les setlists publiques sans compte."}
        </p>
        <div className="settings-section">
          {actor ? <>
            <Link className="admin-button" href="/password-change">Changer le mot de passe</Link>
            <form action="/api/auth/logout" method="post"><button className="admin-button" type="submit">Se déconnecter</button></form>
          </> : <Link className="admin-button admin-button--primary" href="/login">Se connecter</Link>}
        </div>
      </section>
    </main>
  );
}
