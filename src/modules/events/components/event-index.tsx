"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";

import type { EventSummary } from "../types/event";

const formatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long",
  year: "numeric", hour: "2-digit", minute: "2-digit",
});

function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link className={`event-card${event.isCurrentUserAssigned ? " event-card--assigned" : ""}`} href={`/events/${event.id}`}>
      <span className="event-card__date">{formatter.format(new Date(event.startsAt))}</span>
      <strong>{event.title}</strong>
      <span>{event.assignmentCount} {event.assignmentCount > 1 ? "personnes" : "personne"} de service{event.setlist ? ` · ${event.setlist.title}` : ""}</span>
      {event.isCurrentUserAssigned ? <em>Je suis de service</em> : null}
    </Link>
  );
}

export function EventIndex({ canManage, currentTime, initialEvents }: { canManage: boolean; currentTime: number; initialEvents: EventSummary[] }) {
  const [scope, setScope] = useState<"all" | "mine">("all");
  const visible = useMemo(() => scope === "mine" ? initialEvents.filter((event) => event.isCurrentUserAssigned) : initialEvents, [initialEvents, scope]);
  const upcoming = visible.filter((event) => new Date(event.startsAt).getTime() >= currentTime).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = visible.filter((event) => new Date(event.startsAt).getTime() < currentTime).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  return (
    <main className="event-page"><div className="event-shell">
      <AppTopBar actions={canManage ? <Link className="admin-button admin-button--primary" href="/events/nouveau">Ajouter</Link> : undefined} mode="public" />
      <div className="event-hero"><div><p className="eyebrow">Agenda</p><h1>Événements</h1></div><div className="event-scope" role="group" aria-label="Filtrer les événements"><button aria-pressed={scope === "all"} onClick={() => setScope("all")} type="button">Tous</button><button aria-pressed={scope === "mine"} onClick={() => setScope("mine")} type="button">Mes services</button></div></div>
      <section className="event-section"><h2>À venir</h2>{upcoming.length ? <div className="event-list">{upcoming.map((event) => <EventCard event={event} key={event.id} />)}</div> : <div className="empty-state"><p>Aucun événement à venir.</p></div>}</section>
      {past.length ? <section className="event-section event-section--past"><h2>Passés</h2><div className="event-list">{past.map((event) => <EventCard event={event} key={event.id} />)}</div></section> : null}
    </div></main>
  );
}
