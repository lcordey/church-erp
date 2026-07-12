"use client";

import { useState } from "react";

import type { SetlistItemNotes, SetlistTeamNote } from "../types/setlist";

type ApiError = { error?: { message?: string } };

type SetlistSongNotesProps = {
  notes: SetlistItemNotes | undefined;
  onPersonalNoteSaved: (content: string | null) => void;
  onTeamNoteSaved: (note: SetlistTeamNote | null) => void;
  setlistId: string;
  setlistItemId: string;
};

const updatedAtFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

async function saveNote(url: string, content: string) {
  const response = await fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) });
  const payload = (await response.json()) as ApiError & { data?: unknown };
  if (!response.ok) throw new Error(payload.error?.message ?? "Impossible d’enregistrer la note.");
  return payload.data;
}

export function SetlistSongNotes({ notes, onPersonalNoteSaved, onTeamNoteSaved, setlistId, setlistItemId }: SetlistSongNotesProps) {
  const [teamContent, setTeamContent] = useState(notes?.teamNote?.content ?? "");
  const [personalContent, setPersonalContent] = useState(notes?.personalNote ?? "");
  const [saving, setSaving] = useState<"team" | "personal" | null>(null);
  const [message, setMessage] = useState("");

  async function saveTeamNote() {
    setSaving("team"); setMessage("");
    try {
      const data = await saveNote(`/api/setlists/${setlistId}/items/${setlistItemId}/team-note`, teamContent);
      onTeamNoteSaved((data as SetlistTeamNote | null) ?? null);
      setMessage("Note d’équipe enregistrée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d’enregistrer la note.");
    } finally { setSaving(null); }
  }

  async function savePersonalNote() {
    setSaving("personal"); setMessage("");
    try {
      const data = await saveNote(`/api/setlists/${setlistId}/items/${setlistItemId}/personal-note`, personalContent);
      onPersonalNoteSaved((data as string | null) ?? null);
      setMessage("Note personnelle enregistrée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d’enregistrer la note.");
    } finally { setSaving(null); }
  }

  return <div className="setlist-song-notes">
    <section className="setlist-song-notes__section">
      <div className="setlist-song-notes__heading"><div><h3>Note d’équipe</h3><p>Visible et modifiable par l’équipe Louange.</p></div>{notes?.teamNote ? <small>Mis à jour par {notes.teamNote.updatedByDisplayName} · {updatedAtFormatter.format(new Date(notes.teamNote.updatedAt))}</small> : null}</div>
      <textarea aria-label="Note d’équipe" maxLength={5000} onChange={(event) => setTeamContent(event.target.value)} placeholder="Ex. reprendre le refrain après le pont." rows={4} value={teamContent} />
      <button className="admin-button admin-button--primary" disabled={saving !== null} onClick={() => void saveTeamNote()} type="button">{saving === "team" ? "Enregistrement…" : "Enregistrer"}</button>
    </section>
    <section className="setlist-song-notes__section">
      <div className="setlist-song-notes__heading"><div><h3>Mes notes</h3><p>Visibles uniquement par toi.</p></div></div>
      <textarea aria-label="Mes notes" maxLength={5000} onChange={(event) => setPersonalContent(event.target.value)} placeholder="Ex. commencer avec la guitare seule." rows={4} value={personalContent} />
      <button className="admin-button admin-button--quiet" disabled={saving !== null} onClick={() => void savePersonalNote()} type="button">{saving === "personal" ? "Enregistrement…" : "Enregistrer"}</button>
    </section>
    {message ? <p className="setlist-song-notes__message" role="status">{message}</p> : null}
  </div>;
}
