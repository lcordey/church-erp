"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DateTimePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  defaultTime?: string;
};

export type CalendarDay = {
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
};

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const selectedDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function buildCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const mondayBasedOffset = (firstDay.getUTCDay() + 6) % 7;

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index - mondayBasedOffset + 1));
    return {
      dateKey: dateKey(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      dayNumber: date.getUTCDate(),
      inCurrentMonth: date.getUTCMonth() === month,
    };
  });
}

export function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

function selectedParts(value: string) {
  const [date = "", time = ""] = value.split("T");
  const [year, month] = date.split("-").map(Number);
  return {
    date,
    time: time.slice(0, 5),
    year: Number.isFinite(year) ? year : 1970,
    month: Number.isFinite(month) ? month - 1 : 0,
  };
}

function currentParisMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value) - 1,
  };
}

function displayValue(value: string) {
  const selected = selectedParts(value);
  if (!selected.date) return "Choisir une date";
  const [year, month, day] = selected.date.split("-").map(Number);
  const date = selectedDateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
  return `${date}${selected.time ? ` · ${selected.time.replace(":", " h ")}` : ""}`;
}

export function DateTimePicker({
  defaultTime = "09:00",
  label,
  onChange,
  required = false,
  value,
}: DateTimePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = selectedParts(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState({
    year: selected.year,
    month: selected.month,
  });

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const days = useMemo(
    () => buildCalendarDays(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );

  function openCalendar() {
    if (selected.date) {
      setVisibleMonth({ year: selected.year, month: selected.month });
    } else {
      setVisibleMonth(currentParisMonth());
    }
    setIsOpen((current) => !current);
  }

  function moveMonth(offset: number) {
    const next = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + offset, 1));
    setVisibleMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  }

  function selectDate(nextDate: string) {
    onChange(`${nextDate}T${selected.time || defaultTime}`);
  }

  return (
    <div className="date-time-picker" ref={rootRef}>
      <span className="date-time-picker__field-label">
        {label}{required ? " *" : ""}
      </span>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="date-time-picker__trigger"
        onClick={openCalendar}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M6 3v3M18 3v3M4 9h16" />
          <rect height="17" rx="2" width="18" x="3" y="4" />
        </svg>
        <span className={selected.date ? undefined : "date-time-picker__placeholder"}>
          {displayValue(value)}
        </span>
        <span aria-hidden="true" className="date-time-picker__chevron">⌄</span>
      </button>

      {isOpen ? (
        <div aria-label={`Choisir ${label.toLowerCase()}`} className="date-time-picker__popover" role="dialog">
          <div className="date-time-picker__month-header">
            <button aria-label="Mois précédent" onClick={() => moveMonth(-1)} type="button">←</button>
            <strong>{monthFormatter.format(new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)))}</strong>
            <button aria-label="Mois suivant" onClick={() => moveMonth(1)} type="button">→</button>
          </div>
          <div className="date-time-picker__weekdays" aria-hidden="true">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="date-time-picker__days">
            {days.map((day) => (
              <button
                aria-pressed={day.dateKey === selected.date}
                className={day.inCurrentMonth ? undefined : "date-time-picker__outside-month"}
                key={day.dateKey}
                onClick={() => selectDate(day.dateKey)}
                type="button"
              >
                {day.dayNumber}
              </button>
            ))}
          </div>
          <div className="date-time-picker__time-row">
            <label>
              <span>Heure</span>
              <input
                disabled={!selected.date}
                inputMode="numeric"
                maxLength={5}
                onChange={(event) => onChange(`${selected.date}T${formatTimeInput(event.target.value)}`)}
                pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]"
                placeholder="HH:MM"
                title="Saisir une heure entre 00:00 et 23:59"
                type="text"
                value={selected.time || defaultTime}
              />
            </label>
            <div className="date-time-picker__footer-actions">
              {!required && selected.date ? (
                <button className="date-time-picker__clear" onClick={() => onChange("")} type="button">Effacer</button>
              ) : null}
              <button className="date-time-picker__done" disabled={!selected.date} onClick={() => setIsOpen(false)} type="button">Valider</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
