"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";

import type { EventSummary, EventType } from "../types/event";

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
});

const cardDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "short",
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

function ServiceIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="2.2" /><path d="M8.5 20v-4.5l-2.5-4.2 1.7-1 2.3 3.2h4l2.3-3.2 1.7 1-2.5 4.2V20" /><path d="M12 9v4.5M12 9l-3.2 2.2M12 9l3.2 2.2" /></svg>;
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
          <span className="event-card__date">
            {cardDateFormatter.format(new Date(event.startsAt))}
          </span>
          <span>{timeFormatter.format(new Date(event.startsAt))}</span>
        </time>
        <span className="song-card__content event-card__content">
          <span className="song-card__title event-card__title">{event.title}{event.isCurrentUserAssigned ? <span aria-label="Je suis de service" className="event-card__service-icon" role="img"><ServiceIcon /></span> : null}</span>
          {event.eventType ? <span className="event-card__type">{event.eventType.name}</span> : null}
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

export function EventIndex({ canFilterMine, canManage, currentTime, eventTypes, initialEvents }: { canFilterMine: boolean; canManage: boolean; currentTime: number; eventTypes: EventType[]; initialEvents: EventSummary[] }) {
  const [showMine, setShowMine] = useState(false);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const visible = useMemo(() => initialEvents.filter((event) => (!showMine || event.isCurrentUserAssigned) && (!selectedTypeIds.length || (event.eventType && selectedTypeIds.includes(event.eventType.id)))), [initialEvents, selectedTypeIds, showMine]);
  const eventGroups = useMemo(() => groupEventsByDate(visible, currentTime), [currentTime, visible]);

  return (
    <main className="event-page"><div className="event-shell">
      <AppTopBar actions={canManage ? <Link aria-label="Créer un événement" className="icon-button icon-button--primary" href="/events/nouveau" title="Créer un événement"><PlusIcon /><span className="sr-only">Créer un événement</span></Link> : undefined} mode="public" />
      <section className="event-filters" aria-label="Filtrer les événements">{eventTypes.length ? <fieldset><legend>Types d’événements</legend><div className="event-filters__types">{eventTypes.map((eventType) => <label className="checkbox-row" key={eventType.id}><input checked={selectedTypeIds.includes(eventType.id)} onChange={(input) => setSelectedTypeIds((current) => input.target.checked ? [...current, eventType.id] : current.filter((id) => id !== eventType.id))} type="checkbox" /><span>{eventType.name}</span></label>)}</div></fieldset> : null}{canFilterMine ? <label className="event-filters__service"><span>Je suis de service</span><button aria-pressed={showMine} onClick={() => setShowMine((current) => !current)} type="button">{showMine ? "Oui" : "Non"}</button></label> : null}</section>
      {eventGroups.length ? <div className="event-list">{eventGroups.map((group, index) => <Fragment key={group.dateKey}>{group.isPast && !eventGroups[index - 1]?.isPast ? <div className="event-past-divider"><span>Événements passés</span></div> : null}{group.events.map((event) => <EventCard canManage={canManage} event={event} key={event.id} />)}</Fragment>)}</div> : <section className="event-section"><div className="empty-state"><p>Aucun événement.</p></div></section>}
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
