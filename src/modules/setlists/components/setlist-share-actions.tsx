"use client";

import { useCallback, useState } from "react";

type SetlistShareActionsProps = {
  setlistId: string;
  setlistTitle: string;
};

type ShareData = {
  text: string;
  title: string;
  url: string;
};

export function createSetlistShareUrl(origin: string, setlistId: string) {
  return new URL(`/setlist/${encodeURIComponent(setlistId)}/play`, origin).toString();
}

export function createSetlistShareData(
  origin: string,
  setlistId: string,
  setlistTitle: string,
): ShareData {
  const url = createSetlistShareUrl(origin, setlistId);

  return {
    title: setlistTitle,
    text: `Voici la setlist « ${setlistTitle} » : ${url}`,
    url,
  };
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 12v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6" />
    </svg>
  );
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

export function SetlistShareActions({
  setlistId,
  setlistTitle,
}: SetlistShareActionsProps) {
  const [status, setStatus] = useState("");

  const shareSetlist = useCallback(async () => {
    const shareData = createSetlistShareData(window.location.origin, setlistId, setlistTitle);

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    const copied = await copyToClipboard(shareData.url);
    setStatus(copied ? "Lien de partage copié." : "Impossible de copier le lien.");
  }, [setlistId, setlistTitle]);

  return (
    <>
      <button
        aria-label={`Partager la setlist ${setlistTitle}`}
        className="icon-button"
        onClick={() => {
          void shareSetlist();
        }}
        title="Partager la setlist"
        type="button"
      >
        <ShareIcon />
        <span className="sr-only">Partager la setlist</span>
      </button>
      {status ? (
        <p className="setlist-share-status" role="status">
          {status}
        </p>
      ) : null}
    </>
  );
}
