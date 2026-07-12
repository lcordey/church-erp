"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";
import { PageTransitionStatus } from "@/src/components/page-transition-status";
import type { AssignableUser } from "@/src/modules/identity/types/identity";
import type { SetlistSummary } from "@/src/modules/setlists/types/setlist";
import { useUnsavedChangesGuard } from "@/src/shared/hooks/use-unsaved-changes-guard";
import { useViewModeNavigation } from "@/src/shared/hooks/use-view-mode-navigation";

import type { EventDetail } from "../types/event";
import { DateTimePicker } from "./date-time-picker";

type AssignmentForm = { userId: string; displayName: string; username: string; active: boolean; role: string };

const eventDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  dateStyle: "full",
  timeStyle: "short",
});

function localDateTimeValue(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function EventEditor({ canManage, canOpenSetlist = false, canViewAssignments = false, event, isEditing = false, setlists, users }: { canManage: boolean; canOpenSetlist?: boolean; canViewAssignments?: boolean; event?: EventDetail; isEditing?: boolean; setlists: SetlistSummary[]; users: AssignableUser[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(event?.title ?? "");
  const [startsAt, setStartsAt] = useState(event ? localDateTimeValue(event.startsAt) : "");
  const [endsAt, setEndsAt] = useState(event ? localDateTimeValue(event.endsAt) : "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [setlistId, setSetlistId] = useState(event?.setlist?.id ?? "");
  const allUsers = [...users];
  for (const assignment of event?.assignments ?? []) {
    if (!allUsers.some((user) => user.id === assignment.userId)) {
      allUsers.push({ id: assignment.userId, displayName: assignment.displayName, username: assignment.username });
    }
  }
  const [assignments, setAssignments] = useState<AssignmentForm[]>(allUsers.map((user) => {
    const assignment = event?.assignments.find((item) => item.userId === user.id);
    return { userId: user.id, displayName: user.displayName, username: user.username, active: Boolean(assignment), role: assignment?.role ?? "" };
  }));
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      assignments: assignments
        .filter((item) => item.active)
        .map((item) => ({ role: item.role, userId: item.userId })),
      endsAt,
      notes,
      setlistId,
      startsAt,
      title,
    }),
  );
  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        assignments: assignments
          .filter((item) => item.active)
          .map((item) => ({ role: item.role, userId: item.userId })),
        endsAt,
        notes,
        setlistId,
        startsAt,
        title,
      }),
    [assignments, endsAt, notes, setlistId, startsAt, title],
  );
  const isDirty = currentSnapshot !== savedSnapshot;

  const save = useCallback(async () => {
    setMessage("");
    if (!startsAt) {
      setMessage("La date et l’heure de début sont obligatoires.");
      return false;
    }

    setIsSaving(true);

    try {
      const response = await fetch(event ? `/api/events/${event.id}` : "/api/events", {
        method: event ? "PUT" : "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, startsAt: startsAt ? new Date(startsAt).toISOString() : "", endsAt: endsAt ? new Date(endsAt).toISOString() : null, notes, setlistId: setlistId || null, assignments: assignments.filter((item) => item.active).map((item) => ({ userId: item.userId, role: item.role || null })) }),
      });
      const payload = await response.json().catch(() => null) as { data?: EventDetail; error?: { message?: string; fields?: Record<string, string> } } | null;
      if (!response.ok || !payload?.data) {
        setMessage(Object.values(payload?.error?.fields ?? {})[0] ?? payload?.error?.message ?? "Impossible d’enregistrer l’événement.");
        return false;
      }

      setSavedSnapshot(currentSnapshot);
      router.replace(`/events/${payload.data.id}`);
      return true;
    } finally {
      setIsSaving(false);
    }
  }, [assignments, currentSnapshot, endsAt, event, notes, router, setlistId, startsAt, title]);

  const { confirmNavigation, dialog } = useUnsavedChangesGuard({
    isDirty,
    onSave: save,
  });
  const { navigateToViewMode, pendingViewMode, transitionStatus } = useViewModeNavigation({
    activeMode: isEditing ? "edition" : "selection",
    detail: "L’événement est en cours de rechargement.",
    subject: "de l’événement",
  });

  async function remove() {
    if (!event || !window.confirm(`Supprimer définitivement « ${event.title} » ?`)) return;
    const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    if (!response.ok) { setMessage("Impossible de supprimer l’événement."); return; }
    router.push("/events"); router.refresh();
  }

  if (event && !isEditing) {
    return <main className="event-page"><div className="event-shell"><AppTopBar activeViewMode="selection" backHref="/events" backIconOnly backLabel="Retour aux événements" mode="public" onViewModeChange={canManage ? (mode) => { if (mode === "edition") navigateToViewMode(mode, () => router.push(`/events/${event.id}?mode=edition`)); } : undefined} pendingViewMode={pendingViewMode} /><article className="event-detail"><div className="event-detail__header"><div><p className="eyebrow">Événement</p><h1>{event.title}</h1></div>{event.isCurrentUserAssigned ? <span className="event-detail__badge">Je suis de service</span> : null}</div><dl className="event-detail__meta"><div><dt>Début</dt><dd>{eventDateFormatter.format(new Date(event.startsAt))}</dd></div>{event.endsAt ? <div><dt>Fin</dt><dd>{eventDateFormatter.format(new Date(event.endsAt))}</dd></div> : null}{event.setlist ? <div><dt>Setlist</dt><dd>{canOpenSetlist ? <Link className="admin-button admin-button--primary" href={`/setlist/${event.setlist.id}`}>Ouvrir la setlist « {event.setlist.title} »</Link> : event.setlist.title}</dd></div> : null}</dl><section><h2>Description</h2>{event.notes ? <p className="event-detail__notes">{event.notes}</p> : <p className="event-detail__empty">Aucune description renseignée.</p>}</section>{canViewAssignments ? <section><h2>Équipe de service</h2>{event.assignments.length ? <ul className="event-detail__assignments">{event.assignments.map((assignment) => <li key={assignment.id}><span className="event-detail__assignment-copy"><strong>{assignment.displayName}</strong>{assignment.role ? <span>{assignment.role}</span> : null}</span>{assignment.userStatus === "disabled" ? <em>Compte désactivé</em> : null}</li>)}</ul> : <p className="event-detail__empty">Aucune personne affectée.</p>}</section> : null}</article></div>{transitionStatus}</main>;
  }

  const headerActions = <button className={isDirty ? "admin-button admin-button--primary admin-button--dirty" : "admin-button"} disabled={isSaving} onClick={() => { void save(); }} type="button"><span className="button-label">{isSaving ? <span aria-hidden="true" className="button-spinner button-spinner--on-accent" /> : null}<span>{isSaving ? "Enregistrement…" : isDirty ? "Enregistrer •" : "Enregistrer"}</span></span></button>;

  return <main className="event-page"><div className="event-shell"><AppTopBar activeViewMode={event ? "edition" : undefined} actions={headerActions} backHref="/events" backIconOnly backLabel="Retour aux événements" mode="admin" onViewModeChange={event ? (mode) => { if (mode === "selection") void confirmNavigation(() => navigateToViewMode(mode, () => router.push(`/events/${event.id}`))); } : undefined} pendingViewMode={pendingViewMode} showViewModeToggle={Boolean(event)} /><form className="event-form" onSubmit={(formEvent) => { formEvent.preventDefault(); void save(); }}><div><p className="eyebrow">Agenda</p><h1>{event ? "Modifier l’événement" : "Nouvel événement"}</h1></div><label><span>Titre</span><input maxLength={160} onChange={(input) => setTitle(input.target.value)} required value={title} /></label><div className="event-form__dates"><DateTimePicker defaultTime="10:00" label="Début" onChange={setStartsAt} required value={startsAt} /><DateTimePicker defaultTime="10:00" label="Fin (optionnelle)" onChange={setEndsAt} value={endsAt} /></div><label><span>Description</span><textarea maxLength={5000} onChange={(input) => setNotes(input.target.value)} rows={6} value={notes} /></label><label><span>Setlist</span><select onChange={(input) => setSetlistId(input.target.value)} value={setlistId}><option value="">Aucune setlist</option>{setlists.map((setlist) => <option key={setlist.id} value={setlist.id}>{setlist.title}</option>)}</select></label><fieldset className="event-assignees"><legend>Équipe de service</legend>{assignments.map((assignment, index) => <div className="event-assignee" key={assignment.userId}><label className="checkbox-row"><input checked={assignment.active} onChange={(input) => setAssignments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, active: input.target.checked } : item))} type="checkbox" /><span>{assignment.displayName} <small>@{assignment.username}</small></span></label>{assignment.active ? <input aria-label={`Rôle de ${assignment.displayName}`} maxLength={120} onChange={(input) => setAssignments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, role: input.target.value } : item))} placeholder="Rôle (optionnel)" value={assignment.role} /> : null}</div>)}</fieldset>{message ? <p className="form-message form-message--error">{message}</p> : null}<div className="admin-form__actions">{event ? <button className="admin-button admin-button--danger" disabled={isSaving} onClick={() => { void remove(); }} type="button">Supprimer</button> : null}</div></form></div>{dialog}{transitionStatus}<PageTransitionStatus detail="Les informations de l’événement sont en cours d’enregistrement." isVisible={isSaving} label="Enregistrement de l’événement…" /></main>;
}
