"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";

import type { EventSummary } from "../types/event";

const formatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long",
  year: "numeric", hour: "2-digit", minute: "2-digit",
});

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function stopEvent(event: {
  stopPropagation: () => void;
}) {
  event.stopPropagation();
}

function EventCard({ canManage, event }: { canManage: boolean; event: EventSummary }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <article className={`song-card event-card${event.isCurrentUserAssigned ? " event-card--assigned" : ""}${isMenuOpen ? " song-card--menu-open event-card--menu-open" : ""}`}>
      <Link className="song-card__open event-card__open" href={`/events/${event.id}`}>
        <span className="song-card__content event-card__content">
          <span className="song-card__title event-card__title">{event.title}</span>
          <span className="song-card__metadata event-card__metadata">
            <span className="event-card__date">{formatter.format(new Date(event.startsAt))}</span>
            {event.setlist ? <span>{event.setlist.title}</span> : null}
            {event.isCurrentUserAssigned ? <em className="event-card__badge">Je suis de service</em> : null}
          </span>
        </span>
        {canManage ? <span className="song-card__action-space event-card__action-space" aria-hidden="true" /> : null}
      </Link>
      {canManage ? (
        <div className="song-card__menu event-card__menu" ref={menuRef}>
          <button
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label={`Actions pour ${event.title}`}
            className="song-card__edit"
            onClick={(clickEvent) => {
              stopEvent(clickEvent);
              setIsMenuOpen((current) => !current);
            }}
            onPointerDown={stopEvent}
            type="button"
          >
            <MoreIcon />
          </button>
          {isMenuOpen ? (
            <div
              className="song-card__menu-popover"
              onClick={(clickEvent) => clickEvent.stopPropagation()}
              onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
              role="menu"
            >
              <Link href={`/events/${event.id}?mode=edition`} role="menuitem">
                Modifier l’événement
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function EventIndex({ canFilterMine, canManage, currentTime, initialEvents }: { canFilterMine: boolean; canManage: boolean; currentTime: number; initialEvents: EventSummary[] }) {
  const [scope, setScope] = useState<"all" | "mine">("all");
  const visible = useMemo(() => scope === "mine" ? initialEvents.filter((event) => event.isCurrentUserAssigned) : initialEvents, [initialEvents, scope]);
  const currentDateKey = dateKey(currentTime);
  const today = visible.filter((event) => dateKey(event.startsAt) === currentDateKey).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const upcoming = visible.filter((event) => dateKey(event.startsAt) > currentDateKey).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = visible.filter((event) => dateKey(event.startsAt) < currentDateKey).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  return (
    <main className="event-page"><div className="event-shell">
      <AppTopBar actions={canManage ? <Link aria-label="Créer un événement" className="icon-button icon-button--primary" href="/events/nouveau" title="Créer un événement"><PlusIcon /><span className="sr-only">Créer un événement</span></Link> : undefined} mode="public" />
      <div className="event-hero"><div><p className="eyebrow">Agenda</p><h1>Événements</h1></div>{canFilterMine ? <div className="event-scope" role="group" aria-label="Filtrer les événements"><button aria-pressed={scope === "all"} onClick={() => setScope("all")} type="button">Tous</button><button aria-pressed={scope === "mine"} onClick={() => setScope("mine")} type="button">Mes services</button></div> : null}</div>
      <section className="event-section"><h2>Aujourd’hui</h2>{today.length ? <div className="event-list">{today.map((event) => <EventCard canManage={canManage} event={event} key={event.id} />)}</div> : <div className="empty-state"><p>Aucun événement aujourd’hui.</p></div>}</section>
      <section className="event-section"><h2>À venir</h2>{upcoming.length ? <div className="event-list">{upcoming.map((event) => <EventCard canManage={canManage} event={event} key={event.id} />)}</div> : <div className="empty-state"><p>Aucun événement à venir.</p></div>}</section>
      {past.length ? <section className="event-section event-section--past"><h2>Passés</h2><div className="event-list">{past.map((event) => <EventCard canManage={canManage} event={event} key={event.id} />)}</div></section> : null}
    </div></main>
  );
}
function dateKey(value: Date | string | number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
