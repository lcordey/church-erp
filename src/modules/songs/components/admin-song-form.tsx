"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";

import {
  formatMusicalKey,
  musicalKeys,
} from "../music/musical-key";
import type { AdminSong } from "../types/admin-song";
import type {
  AdminSongField,
  AdminSongValidationErrors,
} from "../validation/admin-song-input";
import { ChordSheet } from "./chord-sheet";
import { useMusicNotation } from "./music-notation-provider";

type AdminSongFormProps = {
  song?: AdminSong;
  backHref?: string;
  backLabel?: string;
  headerActions?: ReactNode;
  onCancel?: () => void;
  onDeleted?: () => void;
  onSaved?: (song: AdminSong) => void;
  showBackAction?: boolean;
};

type FormState = {
  title: string;
  slug: string;
  author: string;
  copyright: string;
  defaultKey: string;
  chordProContent: string;
};

type ApiError = {
  error?: {
    message?: string;
    fields?: AdminSongValidationErrors;
  };
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createChordProTemplate() {
  return `{title: Nouveau chant}
{subtitle: LeMont}
{key: C}

{comment: Intro}
[C]Quelques accords si tu veux une intro

{start_of_verse: Couplet 1}
[C]Première ligne du couplet
[Am]Deuxième ligne du couplet
[F]Troisième ligne du couplet
[C]Quatrième ligne du couplet
{comment: Répéter la ligne suivante x2}
[F]Cette ligne est chantée deux fois
{end_of_verse}

{start_of_chorus: Refrain}
[F]Première ligne du refrain
[C]Deuxième ligne du refrain
[Em]Troisième ligne du refrain x2
[Am]Quatrième ligne du refrain
{end_of_chorus}

{comment: Pont x2}
{start_of_bridge: Pont}
[Am]Première ligne du pont
[F]Deuxième ligne du pont
[Dm]Troisième ligne du pont
[C]Quatrième ligne du pont
{end_of_bridge}`;
}

function initialState(song?: AdminSong): FormState {
  return {
    title: song?.title ?? "",
    slug: song?.slug ?? "",
    author: song?.author ?? "LeMont",
    copyright: song?.copyright ?? "LeMont",
    defaultKey: song?.defaultKey ?? "",
    chordProContent: song?.chordProContent ?? createChordProTemplate(),
  };
}

export function AdminSongForm({
  song,
  backHref = "/worship",
  backLabel = "Retour",
  headerActions,
  onCancel,
  onDeleted,
  onSaved,
  showBackAction = true,
}: AdminSongFormProps) {
  const router = useRouter();
  const { notation } = useMusicNotation();
  const [form, setForm] = useState(() => initialState(song));
  const [errors, setErrors] = useState<AdminSongValidationErrors>({});
  const [message, setMessage] = useState("");
  const [isPdfPending, setIsPdfPending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(song);
  const isReadOnly = song ? !song.isEditable : false;

  function updateField(field: AdminSongField, value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "title") {
        next.slug = slugify(value);
      }

      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage("");
  }

  async function saveSong(): Promise<AdminSong | null> {
    const endpoint = song
      ? `/api/admin/songs/${song.id}`
      : "/api/admin/songs";
    const response = await fetch(
      endpoint,
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const payload = (await response.json()) as ApiError & { data?: AdminSong };

    if (!response.ok || !payload.data) {
      setErrors(payload.error?.fields ?? {});
      setMessage(payload.error?.message ?? "Impossible d’enregistrer le chant.");
      return null;
    }

    return payload.data;
  }

  async function submitSong() {
    const savedSong = await saveSong();

    if (!savedSong) {
      return;
    }

    const publishedSong =
      savedSong.status === "published"
        ? savedSong
        : await setPublication(savedSong.id, true);

    if (!publishedSong) {
      return;
    }

    if (onSaved) {
      onSaved(publishedSong);
      setMessage(isEditing ? "Modifications enregistrées." : "Chant créé.");
      return;
    }

    if (!isEditing) {
      router.push(`/chants/${publishedSong.slug}?mode=edition`);
      return;
    }

    setMessage("Modifications enregistrées.");
    router.refresh();
  }

  async function setPublication(songId: string, published: boolean) {
    const response = await fetch(`/api/admin/songs/${songId}/publication`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ published }),
    });
    const payload = (await response.json()) as ApiError & { data?: AdminSong };

    if (!response.ok) {
      setMessage(
        payload.error?.message ?? "Impossible de modifier la publication.",
      );
      return null;
    }

    return payload.data ?? null;
  }

  async function deleteSong() {
    if (!song) {
      return;
    }

    const confirmed = window.confirm(
      song.status === "published"
        ? `Retirer « ${song.title} » du catalogue puis le supprimer définitivement ?`
        : `Supprimer définitivement le chant « ${song.title} » ?`,
    );

    if (!confirmed) {
      return;
    }

    if (song.status === "published") {
      const unpublishedSong = await setPublication(song.id, false);

      if (!unpublishedSong) {
        return;
      }
    }

    const response = await fetch(`/api/admin/songs/${song.id}`, {
      method: "DELETE",
    });
    const payload = response.status === 204
      ? null
      : ((await response.json()) as ApiError);

    if (!response.ok) {
      setMessage(payload?.error?.message ?? "Impossible de supprimer le chant.");
      return;
    }

    if (onDeleted) {
      onDeleted();
      return;
    }

    router.push("/worship");
  }

  async function uploadPdf(file: File) {
    if (!song) {
      return;
    }

    setIsPdfPending(true);
    setMessage("");

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await fetch(`/api/admin/songs/${song.id}/pdf`, {
        method: "PUT",
        body: formData,
      });
      const payload = (await response.json()) as ApiError & {
        data?: AdminSong;
      };

      if (!response.ok || !payload.data) {
        setMessage(
          payload.error?.message ?? "Impossible d’ajouter la partition PDF.",
        );
        return;
      }

      onSaved?.(payload.data);
      setMessage("Partition PDF enregistrée.");
      router.refresh();
    } finally {
      setIsPdfPending(false);
    }
  }

  async function deletePdf() {
    if (!song) {
      return;
    }

    const confirmed = window.confirm(
      `Retirer la partition PDF de « ${song.title} » ?`,
    );

    if (!confirmed) {
      return;
    }

    setIsPdfPending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/songs/${song.id}/pdf`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiError & {
        data?: AdminSong;
      };

      if (!response.ok || !payload.data) {
        setMessage(
          payload.error?.message ?? "Impossible de retirer la partition PDF.",
        );
        return;
      }

      onSaved?.(payload.data);
      setMessage("Partition PDF retirée.");
      router.refresh();
    } finally {
      setIsPdfPending(false);
    }
  }

  return (
    <div className="admin-editor">
      <section className="admin-form-panel">
        <div className="admin-form-panel__heading">
          <div>
            <p className="eyebrow">{isEditing ? "Édition" : "Nouveau chant"}</p>
            <h1>{isEditing ? form.title || "Sans titre" : "Créer un chant"}</h1>
          </div>
          {headerActions ? (
            <div className="admin-form-panel__heading-side">
              {headerActions}
            </div>
          ) : null}
        </div>

        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(submitSong);
          }}
        >
          <label className="field field--wide">
            <span>Titre *</span>
            <input
              disabled={isReadOnly}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
            {errors.title ? <small>{errors.title}</small> : null}
          </label>

          <label className="field">
            <span>Tonalité</span>
            <select
              disabled={isReadOnly}
              value={form.defaultKey}
              onChange={(event) => updateField("defaultKey", event.target.value)}
            >
              <option value="">Sans tonalité</option>
              <optgroup label="Majeures">
                {musicalKeys.slice(0, 12).map((musicalKey) => (
                  <option key={musicalKey} value={musicalKey}>
                    {formatMusicalKey(musicalKey, notation)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Mineures">
                {musicalKeys.slice(12).map((musicalKey) => (
                  <option key={musicalKey} value={musicalKey}>
                    {formatMusicalKey(musicalKey, notation)}
                  </option>
                ))}
              </optgroup>
            </select>
            {errors.defaultKey ? <small>{errors.defaultKey}</small> : null}
          </label>

          <label className="field">
            <span>Auteur</span>
            <input
              disabled={isReadOnly}
              value={form.author}
              onChange={(event) => updateField("author", event.target.value)}
            />
          </label>

          <label className="field">
            <span>Copyright</span>
            <input
              disabled={isReadOnly}
              value={form.copyright}
              onChange={(event) => updateField("copyright", event.target.value)}
            />
          </label>

          {song?.collection && song.collectionNumber ? (
            <div className="field field--readonly">
              <span>Recueil</span>
              <strong>
                {song.collection} {String(song.collectionNumber).padStart(3, "0")}
              </strong>
            </div>
          ) : null}

          {song?.sourcePageUrl ? (
            <div className="field field--readonly">
              <span>Source officielle</span>
              <a href={song.sourcePageUrl} rel="noreferrer" target="_blank">
                JEMAF
              </a>
            </div>
          ) : null}

          <div className="field field--wide pdf-field">
            <span>Partition PDF</span>
            {song?.pdfSource ? (
              <div className="pdf-field__current">
                <a href={song.pdfSource.downloadUrl} target="_blank">
                  {song.pdfSource.fileName ?? "Partition PDF"}
                </a>
                {song.pdfSource.fileSizeBytes ? (
                  <small>
                    {Math.round(song.pdfSource.fileSizeBytes / 1024)} Ko
                  </small>
                ) : null}
              </div>
            ) : (
              <p className="field__hint">
                Aucune partition PDF n’est attachée à ce chant.
              </p>
            )}
            {song ? (
              <div className="pdf-field__actions">
                <label className="admin-button admin-button--quiet">
                  {isPdfPending
                    ? "Traitement…"
                    : song.pdfSource
                      ? "Remplacer le PDF"
                      : "Ajouter un PDF"}
                  <input
                    accept="application/pdf"
                    disabled={isPdfPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";

                      if (file) {
                        void uploadPdf(file);
                      }
                    }}
                    type="file"
                  />
                </label>
                {song.pdfSource ? (
                  <button
                    className="admin-button admin-button--danger"
                    disabled={isPdfPending}
                    onClick={() => void deletePdf()}
                    type="button"
                  >
                    Retirer le PDF
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="field__hint">
                Enregistre le chant avant d’ajouter une partition.
              </p>
            )}
          </div>

          <label className="field field--wide">
            <span>Source ChordPro *</span>
            <textarea
              disabled={isReadOnly}
              rows={17}
              value={form.chordProContent}
              onChange={(event) =>
                updateField("chordProContent", event.target.value)
              }
              spellCheck={false}
            />
            {errors.chordProContent ? (
              <small>{errors.chordProContent}</small>
            ) : null}
            <p className="field__hint">
              Utilise les accords anglais entre crochets comme <code>[G]</code>,{" "}
              <code>[Bb]</code>, <code>[C#m]</code> ou <code>[F/A]</code>. Les
              notes françaises comme <code>[Do]</code> ne sont pas acceptées. Les
              sections <code>{"{start_of_verse}"}</code>, <code>{"{start_of_chorus}"}</code>
              , <code>{"{start_of_bridge}"}</code> et les titres de sections
              comme <code>{"{start_of_verse: Couplet 1}"}</code> sont compris
              par le rendu. Ajoute un commentaire comme <code>{"{comment: Pont x2}"}</code>
              pour indiquer une répétition.
            </p>
          </label>

          {message ? <p className="form-message">{message}</p> : null}
          {isReadOnly ? (
            <p className="form-message">
              Ce chant vient d’une source officielle et ne peut pas être modifié directement.
            </p>
          ) : null}

          <div className="admin-form__actions">
            <button
              className="admin-button admin-button--primary"
              disabled={isPending || isReadOnly}
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>

            {song && !isReadOnly ? (
              <button
                className="admin-button admin-button--danger"
                disabled={isPending}
                onClick={() => startTransition(deleteSong)}
                type="button"
              >
                {song.status === "published"
                  ? "Retirer du catalogue et supprimer"
                  : "Supprimer le chant"}
              </button>
            ) : null}

            {showBackAction && onCancel ? (
              <button
                className="admin-button admin-button--quiet"
                onClick={onCancel}
                type="button"
              >
                {backLabel}
              </button>
            ) : null}

            {showBackAction && !onCancel ? (
              <Link className="admin-button admin-button--quiet" href={backHref}>
                {backLabel}
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <aside className="admin-preview">
        <div className="admin-preview__heading">
          <span>Prévisualisation</span>
          <span>
            {form.defaultKey
              ? formatMusicalKey(form.defaultKey, notation)
              : "Sans tonalité"}
          </span>
        </div>
        <div className="admin-preview__sheet">
          <ChordSheet content={form.chordProContent} />
        </div>
      </aside>
    </div>
  );
}
