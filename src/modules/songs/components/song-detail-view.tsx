"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

import { getLoginHref } from "@/src/shared/navigation/login-redirect";

import { formatSongCollectionLabel } from "../collections/song-collection";
import type { AdminSong } from "../types/admin-song";
import type { PublicSongDetail } from "../types/public-song";
import { MusicalKeyText } from "./musical-key-text";
import type { MusicXmlScoreViewerHandle } from "./music-xml-score-viewer";
import type { SongPdfViewerHandle } from "./song-pdf-viewer";
import {
  hasChordProChords,
  hasChordProLyrics,
} from "../services/chordpro";
import {
  resolveSongSourceView,
  type SongSourceView,
} from "./song-render-preferences";
import {
  TransposableSongSheet,
  type TransposableSongSheetHandle,
} from "./transposable-song-sheet";
import { useSongRenderPreferences } from "./song-render-preferences-provider";

const MusicXmlScoreViewer = lazy(() =>
  import("./music-xml-score-viewer").then((module) => ({
    default: module.MusicXmlScoreViewer,
  })),
);

const SongPdfViewer = lazy(() =>
  import("./song-pdf-viewer").then((module) => ({
    default: module.SongPdfViewer,
  })),
);

const sourceLabels: Record<SongSourceView, string> = {
  chordpro: "Accords",
  lyrics: "Paroles",
  musicxml: "Partition",
  pdf: "PDF",
};

const PDF_MIN_ZOOM = 0.6;
const PDF_MAX_ZOOM = 2;
const SCORE_MIN_ZOOM = 0.2;
const SCORE_MAX_ZOOM = 1.8;
const TEXT_LYRICS_MIN_ZOOM = 0.9;
const TEXT_LYRICS_MAX_ZOOM = 1.28;
const TEXT_CHORD_MIN_ZOOM = 0.68;
const TEXT_CHORD_MAX_ZOOM = 1.24;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
}

function getFocusZoomBoundsForSource(source: SongSourceView) {
  if (source === "pdf") {
    return { max: PDF_MAX_ZOOM, min: PDF_MIN_ZOOM };
  }

  if (source === "musicxml") {
    return { max: SCORE_MAX_ZOOM, min: SCORE_MIN_ZOOM };
  }

  return { max: TEXT_LYRICS_MAX_ZOOM, min: TEXT_LYRICS_MIN_ZOOM };
}

function DocumentViewerLoadingState() {
  return (
    <div
      aria-busy="true"
      className="song-document-viewer__status-row"
      role="status"
    >
      <p className="song-document-viewer__status">
        Chargement du document…
      </p>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <path d="M6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 4h12v16H6z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 4v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 4H4v4" />
      <path d="M16 4h4v4" />
      <path d="M20 16v4h-4" />
      <path d="M4 16v4h4" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9 4H4v5" />
      <path d="m4 4 6 6" />
      <path d="M15 4h5v5" />
      <path d="m20 4-6 6" />
      <path d="M4 15v5h5" />
      <path d="m4 20 6-6" />
      <path d="M20 15v5h-5" />
      <path d="m20 20-6-6" />
    </svg>
  );
}

type SongDetailViewProps = {
  song: PublicSongDetail | AdminSong;
  actions?: ReactNode;
  canAccessScores?: boolean;
  eyebrow?: string;
  loginRedirectTo?: string;
  notesPanel?: ReactNode;
};

type FocusPinchGesture = {
  contentX: number;
  contentY: number;
  distance: number;
  focalX: number;
  focalY: number;
  paddingLeft: number;
  paddingTop: number;
  zoom: number;
};

function getTouchDistance(touches: TouchList) {
  const firstTouch = touches.item(0);
  const secondTouch = touches.item(1);

  if (!firstTouch || !secondTouch) {
    return null;
  }

  return Math.hypot(
    secondTouch.clientX - firstTouch.clientX,
    secondTouch.clientY - firstTouch.clientY,
  );
}

function getTouchCenter(touches: TouchList) {
  const firstTouch = touches.item(0);
  const secondTouch = touches.item(1);

  if (!firstTouch || !secondTouch) {
    return null;
  }

  return {
    x: (firstTouch.clientX + secondTouch.clientX) / 2,
    y: (firstTouch.clientY + secondTouch.clientY) / 2,
  };
}

export function SongDetailView({
  song,
  actions,
  canAccessScores = false,
  loginRedirectTo,
  notesPanel,
}: SongDetailViewProps) {
  const containerRef = useRef<HTMLElement>(null);
  const {
    currentSourceView,
    preferences,
    setCurrentSourceView,
    setPreferences,
  } = useSongRenderPreferences();
  const hasLyrics = hasChordProLyrics(song.chordProContent ?? "");
  const hasChords = hasLyrics && hasChordProChords(song.chordProContent ?? "");
  const availableSources = useMemo<SongSourceView[]>(
    () => [
      ...(hasLyrics ? (["lyrics"] as const) : []),
      ...(hasChords ? (["chordpro"] as const) : []),
      ...(canAccessScores && song.pdfSource ? (["pdf"] as const) : []),
      ...(canAccessScores && song.musicXmlSource
        ? (["musicxml"] as const)
        : []),
    ],
    [canAccessScores, hasChords, hasLyrics, song.musicXmlSource, song.pdfSource],
  );
  const resolvedSourceView = useMemo(
    () =>
      resolveSongSourceView(
        currentSourceView,
        preferences.sourcePriority,
        availableSources,
      ),
    [availableSources, currentSourceView, preferences.sourcePriority],
  );
  const hasAvailableSource = availableSources.length > 0;
  const lockedScoreLabels = !canAccessScores
    ? [
        ...(song.pdfSource ? ["PDF"] : []),
        ...(song.musicXmlSource ? ["Partition"] : []),
      ]
    : [];
  const shouldOfferScoreLogin =
    !hasAvailableSource && lockedScoreLabels.length > 0;
  const scoreLoginHref = getLoginHref(
    loginRedirectTo ?? `/chants/${song.slug}`,
  );
  const collectionLabel = formatSongCollectionLabel(
    song.collection,
    song.collectionNumber,
  );
  const musicXmlViewerRef = useRef<MusicXmlScoreViewerHandle>(null);
  const pdfViewerRef = useRef<SongPdfViewerHandle>(null);
  const textViewerRef = useRef<TransposableSongSheetHandle>(null);
  const focusPinchGestureRef = useRef<FocusPinchGesture | null>(null);
  const resolvedSourceViewRef = useRef(resolvedSourceView);
  const preferencesRef = useRef(preferences);
  const focusZoomValueRef = useRef(1);
  const setFocusZoomValueRef = useRef<(nextZoom: number) => void>(
    () => undefined,
  );
  const [areSettingsVisible, setAreSettingsVisible] = useState(false);
  const [areDetailsVisible, setAreDetailsVisible] = useState(false);
  const [areNotesVisible, setAreNotesVisible] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [musicXmlZoom, setMusicXmlZoom] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(1);

  useEffect(() => {
    if (currentSourceView !== resolvedSourceView) {
      setCurrentSourceView(resolvedSourceView);
    }
  }, [currentSourceView, resolvedSourceView, setCurrentSourceView]);

  useEffect(() => {
    function handleFullscreenChange() {
      const isActive = document.fullscreenElement === containerRef.current;
      setIsFocusMode(isActive);

      if (!isActive) {
        setAreDetailsVisible(false);
        setAreSettingsVisible(false);
        setAreNotesVisible(false);
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!isFocusMode || !container) {
      return;
    }

    function getFocusViewport() {
      const currentContainer = containerRef.current;

      if (!currentContainer) {
        return null;
      }

      if (resolvedSourceViewRef.current === "pdf") {
        return currentContainer.querySelector<HTMLElement>(
          ".song-pdf-viewer__viewport",
        );
      }

      if (resolvedSourceViewRef.current === "musicxml") {
        return currentContainer.querySelector<HTMLElement>(
          ".song-score-viewer__viewport",
        );
      }

      return currentContainer.querySelector<HTMLElement>(
        ".song-document-viewer__stage--text",
      );
    }

    function startPinch(event: TouchEvent) {
      if (event.touches.length !== 2) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        target.closest(".song-document-viewer__focus-controls")
      ) {
        return;
      }

      const viewport = getFocusViewport();

      if (
        !viewport ||
        !(target instanceof Node) ||
        !viewport.contains(target)
      ) {
        return;
      }

      const distance = getTouchDistance(event.touches);
      const center = getTouchCenter(event.touches);

      if (!distance || !center) {
        return;
      }

      event.preventDefault();

      const viewportBounds = viewport.getBoundingClientRect();
      const focalX = viewport.scrollLeft + center.x - viewportBounds.left;
      const focalY = viewport.scrollTop + center.y - viewportBounds.top;
      const viewportStyle = getComputedStyle(viewport);
      const paddingLeft = Number.parseFloat(viewportStyle.paddingLeft) || 0;
      const paddingTop = Number.parseFloat(viewportStyle.paddingTop) || 0;
      const zoom = focusZoomValueRef.current;

      focusPinchGestureRef.current = {
        contentX: (focalX - paddingLeft) / zoom,
        contentY: (focalY - paddingTop) / zoom,
        distance,
        focalX,
        focalY,
        paddingLeft,
        paddingTop,
        zoom,
      };
    }

    function updatePinch(event: TouchEvent) {
      const gesture = focusPinchGestureRef.current;

      if (!gesture || event.touches.length !== 2) {
        return;
      }

      const viewport = getFocusViewport();
      const distance = getTouchDistance(event.touches);
      const center = getTouchCenter(event.touches);

      if (!viewport || !distance || !center) {
        return;
      }

      event.preventDefault();

      const bounds = getFocusZoomBoundsForSource(
        resolvedSourceViewRef.current,
      );
      const nextZoom = clamp(
        gesture.zoom * (distance / gesture.distance),
        bounds.min,
        bounds.max,
      );
      const viewportBounds = viewport.getBoundingClientRect();
      const localCenterX = center.x - viewportBounds.left;
      const localCenterY = center.y - viewportBounds.top;

      setFocusZoomValueRef.current(nextZoom);

      window.requestAnimationFrame(() => {
        viewport.scrollLeft =
          gesture.paddingLeft + gesture.contentX * nextZoom - localCenterX;
        viewport.scrollTop =
          gesture.paddingTop + gesture.contentY * nextZoom - localCenterY;
      });
    }

    function stopPinch(event: TouchEvent) {
      if (event.touches.length < 2) {
        focusPinchGestureRef.current = null;
        const source = resolvedSourceViewRef.current;

        if (source === "pdf") {
          const nextZoom = pdfViewerRef.current?.commitZoom();

          if (nextZoom !== null && nextZoom !== undefined) {
            setPdfZoom(nextZoom);
          }

          return;
        }

        if (source === "musicxml") {
          musicXmlViewerRef.current?.commitZoom();
          return;
        }

        const nextZoom = textViewerRef.current?.commitZoom();

        if (nextZoom === null || nextZoom === undefined) {
          return;
        }

        const currentPreferences = preferencesRef.current;
        const previousLyricsFontScale = currentPreferences.lyricsFontScale;

        setPreferences({
          chordFontScale:
            source === "chordpro"
              ? clamp(
                  currentPreferences.chordFontScale +
                    nextZoom -
                    previousLyricsFontScale,
                  TEXT_CHORD_MIN_ZOOM,
                  TEXT_CHORD_MAX_ZOOM,
                )
              : currentPreferences.chordFontScale,
          lyricsFontScale: nextZoom,
        });
      }
    }

    container.addEventListener("touchstart", startPinch, { passive: false });
    container.addEventListener("touchmove", updatePinch, { passive: false });
    container.addEventListener("touchend", stopPinch);
    container.addEventListener("touchcancel", stopPinch);

    return () => {
      focusPinchGestureRef.current = null;
      container.removeEventListener("touchstart", startPinch);
      container.removeEventListener("touchmove", updatePinch);
      container.removeEventListener("touchend", stopPinch);
      container.removeEventListener("touchcancel", stopPinch);
    };
  }, [isFocusMode, setPreferences]);

  function getDownloadHref(sourceUrl: string) {
    const separator = sourceUrl.includes("?") ? "&" : "?";
    return `${sourceUrl}${separator}download=1`;
  }

  const hasDisplaySettings =
    resolvedSourceView === "chordpro" || resolvedSourceView === "musicxml";

  async function downloadActiveDocument() {
    if (resolvedSourceView === "pdf" && song.pdfSource) {
      const link = document.createElement("a");
      link.href = getDownloadHref(song.pdfSource.downloadUrl);
      link.click();
      return;
    }

    if (resolvedSourceView === "musicxml") {
      await musicXmlViewerRef.current?.downloadPdf();
      return;
    }

    await textViewerRef.current?.downloadPdf();
  }

  async function enterFocusMode() {
    if (!containerRef.current?.requestFullscreen) {
      return;
    }

    setAreDetailsVisible(false);
    setAreSettingsVisible(false);
    setAreNotesVisible(false);
    await containerRef.current.requestFullscreen();
  }

  async function exitFocusMode() {
    if (!document.fullscreenElement) {
      return;
    }

    await document.exitFullscreen();
  }

  function getFocusZoomValue() {
    if (resolvedSourceView === "pdf") {
      return pdfZoom;
    }

    if (resolvedSourceView === "musicxml") {
      return musicXmlZoom;
    }

    return preferences.lyricsFontScale;
  }


  function setFocusZoomValue(nextZoom: number) {
    const source = resolvedSourceViewRef.current;
    const bounds = getFocusZoomBoundsForSource(source);
    const clampedZoom = clamp(nextZoom, bounds.min, bounds.max);

    if (source === "pdf") {
      pdfViewerRef.current?.previewZoom(clampedZoom);
      return;
    }

    if (source === "musicxml") {
      musicXmlViewerRef.current?.previewZoom(clampedZoom);
      return;
    }

    textViewerRef.current?.previewZoom(clampedZoom);
  }


  const focusZoomValue = getFocusZoomValue();

  useEffect(() => {
    resolvedSourceViewRef.current = resolvedSourceView;
  }, [resolvedSourceView]);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    focusZoomValueRef.current = focusZoomValue;
  }, [focusZoomValue]);

  useEffect(() => {
    setFocusZoomValueRef.current = setFocusZoomValue;
  });

  return (
    <section
      className={`song-detail-view${isFocusMode ? " song-detail-view--focus" : ""}`}
      ref={containerRef}
    >
      <section
        className={`song-document-viewer song-document-viewer--${resolvedSourceView}`}
      >
        <header className="song-document-viewer__toolbar">
          <div className="song-document-viewer__source">
            {availableSources.length > 1 ? (
              <>
                <label className="sr-only" htmlFor={`song-source-${song.id}`}>
                  Source du chant
                </label>
                <select
                  id={`song-source-${song.id}`}
                  onChange={(event) => {
                    setCurrentSourceView(
                      event.target.value as SongSourceView,
                    );
                  }}
                  value={resolvedSourceView}
                >
                  {availableSources.map((source) => (
                    <option key={source} value={source}>
                      {sourceLabels[source]}
                    </option>
                  ))}
                </select>
              </>
            ) : availableSources.length === 1 ? (
              <span
                aria-disabled="true"
                aria-label={`Source unique disponible : ${sourceLabels[availableSources[0]]}`}
                className="song-document-viewer__source-label song-document-viewer__source-label--single"
                title="Une seule source est disponible pour ce chant."
              >
                <span>{sourceLabels[availableSources[0]]}</span>
                <small>source unique</small>
              </span>
            ) : !shouldOfferScoreLogin ? (
              <span className="song-document-viewer__source-label">
                Aucune source
              </span>
            ) : null}
            {shouldOfferScoreLogin ? (
              <Link
                className="song-document-viewer__locked-source"
                href={scoreLoginHref}
              >
                {lockedScoreLabels.join(" + ")} · Se connecter
              </Link>
            ) : null}
            {actions ? (
              <div className="song-detail-view__actions">{actions}</div>
            ) : null}
          </div>
          <div className="song-document-viewer__actions">
            <button
              aria-expanded={areDetailsVisible}
              aria-pressed={areDetailsVisible}
              aria-label={
                areDetailsVisible
                  ? "Masquer les informations du chant"
                  : "Afficher les informations du chant"
              }
              className="icon-button song-document-viewer__icon-button"
              onClick={() => setAreDetailsVisible((current) => !current)}
              title="Informations"
              type="button"
            >
              <InfoIcon />
            </button>
            {hasDisplaySettings ? (
              <button
                aria-pressed={areSettingsVisible}
                aria-label={
                  areSettingsVisible
                    ? "Masquer les réglages d’affichage"
                    : "Afficher les réglages d’affichage"
                }
                className="icon-button song-document-viewer__icon-button"
                onClick={() => setAreSettingsVisible((current) => !current)}
                title={
                  areSettingsVisible
                    ? "Masquer les réglages"
                    : "Afficher les réglages"
                }
                type="button"
              >
                <SettingsIcon />
              </button>
            ) : null}
            {notesPanel ? (
              <button
                aria-expanded={areNotesVisible}
                aria-pressed={areNotesVisible}
                aria-label={areNotesVisible ? "Masquer les notes" : "Afficher les notes"}
                className="icon-button song-document-viewer__icon-button"
                onClick={() => setAreNotesVisible((current) => !current)}
                title={areNotesVisible ? "Masquer les notes" : "Afficher les notes"}
                type="button"
              >
                <NotesIcon />
              </button>
            ) : null}
            <button
              aria-label="Activer le mode focus"
              className="icon-button song-document-viewer__icon-button"
              onClick={() => void enterFocusMode()}
              title="Mode focus"
              type="button"
            >
              <FullscreenIcon />
            </button>
            <button
              aria-label="Télécharger le document"
              className="icon-button song-document-viewer__icon-button"
              disabled={!hasAvailableSource}
              onClick={() => void downloadActiveDocument()}
              title="Télécharger"
              type="button"
            >
              <DownloadIcon />
            </button>
          </div>
          {areDetailsVisible ? (
            <aside
              aria-label="Informations du chant"
              className="song-document-viewer__details"
            >
              <strong>{song.title}</strong>
              <dl>
                {collectionLabel ? (
                  <div>
                    <dt>Recueil</dt>
                    <dd>{collectionLabel}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Auteur</dt>
                  <dd>{song.author ?? "Non renseigné"}</dd>
                </div>
                {song.defaultKey ? (
                  <div>
                    <dt>Tonalité</dt>
                    <dd>
                      <MusicalKeyText musicalKey={song.defaultKey} />
                    </dd>
                  </div>
                ) : null}
              </dl>
              {song.sourcePageUrl || song.youtubeUrl || song.spotifyUrl ? (
                <div
                  aria-label="Liens externes"
                  className="song-document-viewer__external-links"
                >
                  {song.sourcePageUrl ? (
                    <a
                      href={song.sourcePageUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Source officielle
                    </a>
                  ) : null}
                  {song.youtubeUrl ? (
                    <a
                      href={song.youtubeUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      YouTube
                    </a>
                  ) : null}
                  {song.spotifyUrl ? (
                    <a
                      href={song.spotifyUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Spotify
                    </a>
                  ) : null}
                </div>
              ) : null}
              {"isEditable" in song && !song.isEditable ? (
                <small>Source officielle</small>
              ) : null}
            </aside>
          ) : null}
          {areNotesVisible && notesPanel ? (
            <aside
              aria-label="Notes du chant dans la setlist"
              className="song-document-viewer__notes"
            >
              {notesPanel}
            </aside>
          ) : null}
        </header>

        {isFocusMode ? (
          <div className="song-document-viewer__focus-controls">
            <button
              aria-label="Quitter le mode focus"
              className="icon-button song-document-viewer__focus-exit-button"
              onClick={() => void exitFocusMode()}
              type="button"
            >
              <ExitFullscreenIcon />
            </button>
          </div>
        ) : null}

        {!hasAvailableSource ? (
          <div className="empty-state">
            <p>
              {shouldOfferScoreLogin
                ? "Connecte-toi pour consulter la partition de ce chant."
                : "Aucun contenu de lecture disponible pour ce chant."}
            </p>
            {shouldOfferScoreLogin ? (
              <Link
                className="admin-button admin-button--primary"
                href={scoreLoginHref}
              >
                Se connecter
              </Link>
            ) : null}
          </div>
        ) : canAccessScores &&
          resolvedSourceView === "pdf" &&
          song.pdfSource ? (
          <Suspense fallback={<DocumentViewerLoadingState />}>
            <SongPdfViewer
              ref={pdfViewerRef}
              copyright={song.copyright}
              sourceUrl={song.pdfSource.downloadUrl}
              title={song.title}
              zoom={pdfZoom}
            />
          </Suspense>
        ) : canAccessScores &&
          resolvedSourceView === "musicxml" &&
          song.musicXmlSource ? (
          <Suspense fallback={<DocumentViewerLoadingState />}>
            <MusicXmlScoreViewer
              ref={musicXmlViewerRef}
              key={song.id}
              collection={song.collection}
              collectionNumber={song.collectionNumber}
              copyright={song.copyright}
              defaultKey={song.defaultKey}
              onZoomChange={setMusicXmlZoom}
              showSettings={areSettingsVisible}
              sourceUrl={song.musicXmlSource.downloadUrl}
              title={song.title}
            />
          </Suspense>
        ) : (
          <TransposableSongSheet
            ref={textViewerRef}
            content={song.chordProContent ?? ""}
            copyright={song.copyright}
            defaultKey={song.defaultKey}
            displayMode={
              resolvedSourceView === "lyrics" || !hasChords
                ? "lyrics"
                : "chords"
            }
            showSettings={areSettingsVisible}
            title={song.title}
          />
        )}
      </section>

    </section>
  );
}
