import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found__card">
        <p className="eyebrow">Erreur 404</p>
        <h1>Ce chant n’est pas disponible.</h1>
        <p>
          Il n’existe pas, ou il n’est pas encore publié dans le répertoire.
        </p>
        <Link className="primary-link" href="/worship">
          Voir les chants publiés
        </Link>
      </div>
    </main>
  );
}
