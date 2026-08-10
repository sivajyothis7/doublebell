"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { tracks, vibeCounts } from "@/content";
import { coverUrl, searchTracks, type Vibe } from "@/engine";
import { SELECT_TRACK_EVENT } from "./events";

/**
 * The vibe filter, in the words a bus sorts songs into. Labelled in Malayalam
 * where Malayalam is the word people actually use — nobody says "folk".
 */
const VIBES: { vibe: Vibe; label: string; labelMl?: string }[] = [
  { vibe: "mass", label: "Mass" },
  { vibe: "melody", label: "Melody" },
  { vibe: "nadan", label: "Nadan", labelMl: "നാടൻ" },
  { vibe: "mappila", label: "Mappila", labelMl: "മാപ്പിള" },
];

/**
 * Song search, over a native `<dialog>`.
 *
 * `showModal()` brings the focus trap, the Escape handler and the top layer with
 * it — three bugs not written and a dependency not installed. Ranking lives in
 * `searchTracks` in the engine, where it is pure and tested; this only renders the
 * result and adds the vibe filter on top of it.
 */
export default function SearchSheet({ className = "" }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const counts = useMemo(() => vibeCounts(), []);

  const results = useMemo(() => {
    const pool = vibe ? tracks.filter((track) => track.vibe === vibe) : tracks;
    return searchTracks(pool, query, 80);
  }, [query, vibe]);

  const open = () => {
    setQuery("");
    dialogRef.current?.showModal();
    // Focus after the dialog is in the top layer, or iOS Safari scrolls the page.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const close = () => dialogRef.current?.close();

  // ⌘K / Ctrl-K to open, and "/" as the plain-keyboard shortcut people expect.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, [contenteditable=true]");
      const isOpen = dialogRef.current?.open ?? false;

      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (isOpen) close();
        else open();
      } else if (event.key === "/" && !typing && !isOpen) {
        event.preventDefault();
        open();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Search songs"
        className={`grid size-9 place-items-center rounded-full text-[color:var(--db-cream)]/80 transition-colors hover:text-[color:var(--db-amber)] focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2 ${className}`}
      >
        <Search className="size-[1.1rem] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
      </button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape is the dialog's own */}
      <dialog
        ref={dialogRef}
        className="sheet"
        aria-label="Search songs"
        // Clicking the backdrop closes it. The panel stops the bubble below, so a
        // click inside never counts as a click outside.
        onClick={close}
      >
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: stops backdrop clicks only */}
        <div className="sheet-panel" onClick={(event) => event.stopPropagation()}>
          <div className="sheet-grip" aria-hidden="true" />

          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Song, film, singer — മലയാളത്തിലും തിരയാം"
            className="field"
            aria-label="Search by song, film, singer or composer"
            autoComplete="off"
            enterKeyHint="search"
          />

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {VIBES.map((entry) => {
              const active = vibe === entry.vibe;
              return (
                <button
                  key={entry.vibe}
                  type="button"
                  onClick={() => setVibe(active ? null : entry.vibe)}
                  aria-pressed={active}
                  className={`rounded-full px-2.5 py-1 text-[0.72rem] transition-colors focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2 ${
                    active
                      ? "bg-[color:var(--db-amber)] text-[color:var(--db-night-deep)]"
                      : "bg-[color:oklch(0.96_0.017_90/0.09)] text-[color:var(--db-cream)]/80 hover:bg-[color:oklch(0.96_0.017_90/0.16)]"
                  }`}
                >
                  {entry.labelMl ? <span lang="ml">{entry.labelMl}</span> : entry.label}
                  <span className="ml-1.5 opacity-55 tabular-nums">{counts[entry.vibe]}</span>
                </button>
              );
            })}
          </div>

          <ul className="-mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
            {results.length === 0 && (
              <li className="px-2 py-8 text-center text-[0.85rem] text-[color:var(--db-muted)]">
                Nothing here by that name.
              </li>
            )}
            {results.map(({ track, matchedOn }) => (
              <li key={track.youtubeId}>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent(SELECT_TRACK_EVENT, { detail: track.youtubeId }),
                    );
                    close();
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-[color:oklch(0.96_0.017_90/0.09)] focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl(track.youtubeId)}
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className="size-10 shrink-0 rounded-md object-cover"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[0.92rem]" lang="ml">
                      {track.titleMl}
                    </span>
                    <span className="truncate text-[0.72rem] opacity-60">
                      {track.title} · {track.movie}
                      {track.year !== undefined ? ` · ${track.year}` : ""} · {track.singer}
                    </span>
                  </span>
                  {/* Say why a row is here when the song title was not the match. */}
                  {matchedOn !== "title" && matchedOn !== "titleMl" && (
                    <span className="shrink-0 text-[0.6rem] uppercase tracking-[0.12em] opacity-45">
                      {matchedOn}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
