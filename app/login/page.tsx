import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connexion à l'espace équipe louange.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, redirectTo } = await searchParams;

  return (
    <main className="app-panel-page">
      <section className="app-panel login-panel">
        <p className="eyebrow">Accès équipe</p>
        <h1>Connexion</h1>
        <p className="app-panel__lead">
          Connecte-toi avec ton compte pour retrouver les partitions, les
          setlists et tes prochains services.
        </p>

        <form action="/api/auth/login" className="login-form" method="post">
          <input name="redirectTo" type="hidden" value={redirectTo ?? "/worship"} />
          <label>
            <span>Identifiant</span>
            <input
              autoCapitalize="none"
              autoComplete="username"
              autoFocus
              name="username"
              required
            />
          </label>
          <label>
            <span>Mot de passe</span>
            <input
              autoComplete="current-password"
              name="password"
              required
              type="password"
            />
          </label>
          {error ? (
            <p className="form-message form-message--error">
              Identifiant ou mot de passe incorrect.
            </p>
          ) : null}
          <button className="admin-button admin-button--primary" type="submit">
            Se connecter
          </button>
        </form>
      </section>
    </main>
  );
}
