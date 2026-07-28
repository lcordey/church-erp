import { redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { minimumPasswordLength } from "@/src/modules/identity/validation/identity-input";
import { getSafeRedirectPath } from "@/src/shared/navigation/login-redirect";

type PasswordChangePageProps = {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
};

export default async function PasswordChangePage({ searchParams }: PasswordChangePageProps) {
  const [actor, params] = await Promise.all([getCurrentActor(), searchParams]);
  if (!actor) redirect("/login?redirectTo=/password-change");
  const redirectTo = getSafeRedirectPath(params.redirectTo ?? "/profile");
  return (
    <main className="app-panel-page">
      <section className="app-panel login-panel">
        <p className="eyebrow">Sécurité</p>
        <h1>{actor.mustChangePassword ? "Choisis ton mot de passe" : "Changer le mot de passe"}</h1>
        <p className="app-panel__lead">
          {actor.mustChangePassword
            ? "Le mot de passe temporaire doit être remplacé avant de continuer."
            : "Saisis ton mot de passe actuel puis choisis-en un nouveau."}
        </p>
        <form action="/api/auth/password" className="login-form" method="post">
          <input name="redirectTo" type="hidden" value={redirectTo} />
          <label><span>Mot de passe actuel</span><input autoComplete="current-password" name="currentPassword" required type="password" /></label>
          <label><span>Nouveau mot de passe</span><input autoComplete="new-password" maxLength={128} minLength={minimumPasswordLength} name="newPassword" required type="password" /></label>
          <label><span>Confirmer le nouveau mot de passe</span><input autoComplete="new-password" maxLength={128} minLength={minimumPasswordLength} name="confirmNewPassword" required type="password" /></label>
          {params.error ? <p className="form-message form-message--error">
            {params.error === "current"
              ? "Le mot de passe actuel est incorrect."
              : params.error === "confirmation"
                ? "Les deux nouveaux mots de passe ne correspondent pas."
                : `Le nouveau mot de passe doit contenir entre ${minimumPasswordLength} et 128 caractères et ne pas être trop courant.`}
          </p> : null}
          <button className="admin-button admin-button--primary" type="submit">Enregistrer</button>
        </form>
      </section>
    </main>
  );
}
