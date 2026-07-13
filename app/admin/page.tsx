import Link from "next/link";
import { redirect } from "next/navigation";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

export default async function AdminPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login?redirectTo=/admin");
  if (actor.mustChangePassword) redirect("/password-change?redirectTo=/admin");
  if (!actor.permissions.includes("user.manage")) redirect("/worship");

  return (
    <main className="admin-page">
      <div className="admin-shell admin-hub">
        <AppTopBar mode="admin" />
        <nav aria-label="Sections d’administration" className="admin-hub-grid">
          <Link className="admin-hub-card" href="/admin/comptes">
            <span className="admin-hub-card__index">01</span>
            <span className="admin-hub-card__content">
              <strong>Comptes</strong>
              <small>Utilisateurs, groupes et mots de passe temporaires</small>
            </span>
            <ArrowIcon />
          </Link>
          <Link className="admin-hub-card" href="/admin/referentiels">
            <span className="admin-hub-card__index">02</span>
            <span className="admin-hub-card__content">
              <strong>Chants</strong>
              <small>Thèmes et labels disponibles pour les chants</small>
            </span>
            <ArrowIcon />
          </Link>
          <Link className="admin-hub-card" href="/admin/evenements">
            <span className="admin-hub-card__index">03</span>
            <span className="admin-hub-card__content">
              <strong>Événements</strong>
              <small>Types disponibles pour les événements</small>
            </span>
            <ArrowIcon />
          </Link>
        </nav>
      </div>
    </main>
  );
}
