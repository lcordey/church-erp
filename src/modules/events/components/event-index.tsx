"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";

import type { EventSummary } from "../types/event";

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
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

    function handleDocumentClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <article className={`song-card event-card${event.isCurrentUserAssigned ? " event-card--assigned" : ""}${isMenuOpen ? " song-card--menu-open event-card--menu-open" : ""}`}>
      <Link className="song-card__open event-card__open" href={`/events/${event.id}`}>
        <time className="event-card__time" dateTime={new Date(event.startsAt).toISOString()}>
          {timeFormatter.format(new Date(event.startsAt))}
        </time>
        <span className="song-card__content event-card__content">
          <span className="song-card__title event-card__title">{event.title}</span>
          {event.isCurrentUserAssigned ? (
            <span className="song-card__metadata event-card__metadata">
              <em className="event-card__badge">Je suis de service</em>
            </span>
          ) : null}
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
  const eventGroups = useMemo(() => groupEventsByDate(visible, currentTime), [currentTime, visible]);

  return (
    <main className="event-page"><div className="event-shell">
      <AppTopBar actions={canManage ? <Link aria-label="Créer un événement" className="icon-button icon-button--primary" href="/events/nouveau" title="Créer un événement"><PlusIcon /><span className="sr-only">Créer un événement</span></Link> : undefined} mode="public" />
      <div className="event-hero"><div><p className="eyebrow">Agenda</p><h1>Événements</h1></div>{canFilterMine ? <div className="event-scope" role="group" aria-label="Filtrer les événements"><button aria-pressed={scope === "all"} onClick={() => setScope("all")} type="button">Tous</button><button aria-pressed={scope === "mine"} onClick={() => setScope("mine")} type="button">Mes services</button></div> : null}</div>
      {eventGroups.length ? eventGroups.map((group, index) => <Fragment key={group.dateKey}>{group.isPast && !eventGroups[index - 1]?.isPast ? <div className="event-past-divider"><span>Événements passés</span></div> : null}<section className="event-section"><h2>{group.label}</h2><div className="event-list">{group.events.map((event) => <EventCard canManage={canManage} event={event} key={event.id} />)}</div></section></Fragment>) : <section className="event-section"><div className="empty-state"><p>Aucun événement.</p></div></section>}
    </div></main>
  );
}

function groupEventsByDate(events: EventSummary[], currentTime: number) {
  const currentDateKey = dateKey(currentTime);
  const upcomingGroups = new Map<string, EventSummary[]>();
  const pastGroups = new Map<string, EventSummary[]>();

  for (const event of events) {
    const key = dateKey(event.startsAt);
    const groups = key >= currentDateKey ? upcomingGroups : pastGroups;
    const groupEvents = groups.get(key) ?? [];

    groupEvents.push(event);
    groups.set(key, groupEvents);
  }

  const toDateGroup = (key: string, groupEvents: EventSummary[], isPast: boolean) => ({
    dateKey: key,
    events: groupEvents.sort(
      (a, b) => +new Date(a.startsAt) - +new Date(b.startsAt),
    ),
    isPast,
    label: dayFormatter.format(new Date(groupEvents[0].startsAt)),
  });

  return [
    ...[...upcomingGroups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, groupEvents]) => toDateGroup(key, groupEvents, false)),
    ...[...pastGroups.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([key, groupEvents]) => toDateGroup(key, groupEvents, true)),
  ];
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
