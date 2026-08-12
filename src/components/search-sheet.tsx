"use client";

import { Link2, Loader2, Play, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveLink, type SearchHit } from "@/adapters/youtube";
import { tracks, vibeCounts } from "@/content";
import {
  cleanUploadTitle,
  coverUrl,
  looksLikeLink,
  parseYoutubeId,
  searchTracks,
  thumbnailUrl,
  type Track,
  type Vibe,
} from "@/engine";
import { ADD_LINK_EVENT, SELECT_TRACK_EVENT } from "./events";

/**
 * The vibe filter, in the words a bus sorts songs into. Labelled in Malayalam where
 * Malayalam is the word people actually use — nobody says "folk".
 */
const VIBES: { vibe: Vibe; label: string; labelMl?: string }[] = [
  { vibe: "mass", label: "Mass" },
  { vibe: "melody", label: "Melody" },
  { vibe: "nadan", label: "Nadan", labelMl: "നാടൻ" },
  { vibe: "mappila", label: "Mappila", labelMl: "മാപ്പിള" },
];

/** Long enough to be a search rather than a keystroke. */
const MIN_QUERY = 2;
/** Long enough that a fast typist makes one request, not eight. */
const DEBOUNCE_MS = 350;

type LinkState = { kind: "idle" } | { kind: "resolving" } | { kind: "failed"; reason: string };
type YouTubeState =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "done"; hits: SearchHit[]; degraded: boolean };

/**
 * Search, over a native `<dialog>`.
 *
 * `showModal()` brings the focus trap, the Escape handler and the top layer with it —
 * three bugs not written and a dependency not installed.
 *
 * Three ways to get to a song, in the order they are worth trying:
 *
 *  1. **the playlist** — 49 songs, ranked by `searchTracks` in the engine, matched in
 *     Malayalam or Latin across song, film, singer and composer. Instant, offline.
 *  2. **YouTube, in here** — the same query goes to `/api/search`, and any result
 *     plays in this deck without leaving the page. No redirect.
 *  3. **a pasted link** — for when you already know the one you want.
 *
 * Anything from 2 or 3 joins the queue as a guest: it plays next and the playlist
 * resumes right after it, but it never joins the playlist, which is authored in git.
 */
export default function SearchSheet({ className = "" }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [link, setLink] = useState<LinkState>({ kind: "idle" });
  const [youtube, setYouTube] = useState<YouTubeState>({ kind: "idle" });
  const counts = useMemo(() => vibeCounts(), []);

  const trimmed = query.trim();
  /** A pasted link is a different intent from a search, so it gets its own row. */
  const pastedId = useMemo(
    () => (looksLikeLink(trimmed) ? parseYoutubeId(trimmed) : null),
    [trimmed],
  );

  const results = useMemo(() => {
    const pool = vibe ? tracks.filter((track) => track.vibe === vibe) : tracks;
    // A link in the box is not a search term; searching for it would return nothing
    // and read as "no results" when the answer is actually "press play".
    return searchTracks(pool, pastedId ? "" : query, 80);
  }, [query, vibe, pastedId]);

  /**
   * The YouTube half. Debounced, and every request aborts the one before it — the
   * answer to "jimikk" is worthless the moment "jimikki" is typed, and a slow one
   * arriving late would otherwise overwrite a fast one that is correct.
   */
  useEffect(() => {
    if (pastedId || trimmed.length < MIN_QUERY) {
      setYouTube({ kind: "idle" });
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setYouTube({ kind: "searching" });
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as { results?: SearchHit[]; degraded?: boolean };
        setYouTube({ kind: "done", hits: body.results ?? [], degraded: body.degraded === true });
      } catch {
        // An abort lands here too, and an abort must not paint an error: the next
        // request is already in flight and will set the state.
        if (!controller.signal.aborted) setYouTube({ kind: "done", hits: [], degraded: true });
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, pastedId]);

  const open = () => {
    setQuery("");
    setLink({ kind: "idle" });
    setYouTube({ kind: "idle" });
    dialogRef.current?.showModal();
    // Focus after the dialog is in the top layer, or iOS Safari scrolls the page.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const close = () => dialogRef.current?.close();

  const pick = (youtubeId: string) => {
    window.dispatchEvent(new CustomEvent(SELECT_TRACK_EVENT, { detail: youtubeId }));
    close();
  };

  /** A guest track built from what a search result or a resolved link already told us. */
  const playGuest = (youtubeId: string, rawTitle: string, channel: string) => {
    const known = tracks.find((track) => track.youtubeId === youtubeId);
    if (known) {
      pick(known.youtubeId);
      return;
    }

    // Uploads are titled for search, so the raw string is a paragraph. Kept in
    // whatever script it was uploaded in, which here is very often Malayalam already.
    const name = cleanUploadTitle(rawTitle);
    const guest: Track = {
      youtubeId,
      title: name,
      titleMl: name,
      // The uploading channel is all the provenance a guest has, and for a label
      // upload that is the label. Said once, not three times.
      movie: channel,
      composer: channel,
      singer: channel,
      vibe: "mass",
      adhoc: true,
    };

    window.dispatchEvent(new CustomEvent(ADD_LINK_EVENT, { detail: guest }));
    close();
  };

  /** A pasted link has no metadata yet, so it is resolved before it is played. */
  const playPastedLink = async () => {
    if (!pastedId || link.kind === "resolving") return;

    const known = tracks.find((track) => track.youtubeId === pastedId);
    if (known) {
      pick(known.youtubeId);
      return;
    }

    setLink({ kind: "resolving" });
    const info = await resolveLink(pastedId);
    if (!info) {
      setLink({
        kind: "failed",
        reason: "YouTube will not play that one here — it may be private or blocked.",
      });
      return;
    }

    setLink({ kind: "idle" });
    playGuest(info.youtubeId, info.title, info.author);
  };

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

  const searchingYouTube = youtube.kind === "searching";
  const youtubeHits = youtube.kind === "done" ? youtube.hits : [];

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Search songs, search YouTube, or paste a link"
        className={`grid size-9 place-items-center rounded-full text-[color:var(--db-cream)]/80 transition-colors hover:text-[color:var(--db-amber)] focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2 ${className}`}
      >
        <Search className="size-[1.1rem] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
      </button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape is the dialog's own */}
      <dialog
        ref={dialogRef}
        className="sheet"
        aria-label="Search songs, search YouTube, or paste a link"
        onClick={close}
      >
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: stops backdrop clicks only */}
        <div className="sheet-panel" onClick={(event) => event.stopPropagation()}>
          <div className="sheet-grip" aria-hidden="true" />

          <form
            onSubmit={(event) => {
              event.preventDefault();
              // Enter takes the most specific thing on offer: a pasted link, then the
              // playlist's best match, then YouTube's.
              if (pastedId) void playPastedLink();
              else if (results[0]) pick(results[0].track.youtubeId);
              else if (youtubeHits[0]) {
                playGuest(youtubeHits[0].youtubeId, youtubeHits[0].title, youtubeHits[0].channel);
              }
            }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLink({ kind: "idle" });
              }}
              placeholder="Any Malayalam song — or paste a YouTube link"
              className="field"
              aria-label="Search the playlist and YouTube, or paste a YouTube link"
              autoComplete="off"
              // A link is not a sentence; stop phones capitalising and autocorrecting
              // a URL into something unparseable.
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint={pastedId ? "go" : "search"}
            />
          </form>

          {/* ── a pasted link ─────────────────────────────────────────────── */}
          {pastedId && (
            <button
              type="button"
              onClick={() => void playPastedLink()}
              disabled={link.kind === "resolving"}
              className="mt-2.5 flex w-full items-center gap-3 rounded-2xl border border-[color:var(--db-amber)]/35 bg-[color:oklch(0.83_0.145_76/0.1)] px-2.5 py-2.5 text-left transition-colors hover:bg-[color:oklch(0.83_0.145_76/0.18)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnailUrl(pastedId, "mqdefault")}
                alt=""
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                className="size-10 shrink-0 rounded-md object-cover"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[0.92rem] text-[color:var(--db-cream)]">
                  {link.kind === "resolving" ? "Checking the link…" : "Play this link"}
                </span>
                <span className="truncate font-mono text-[0.7rem] opacity-60">{pastedId}</span>
              </span>
              {link.kind === "resolving" ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-[color:var(--db-amber)]" />
              ) : (
                <Link2 className="size-4 shrink-0 text-[color:var(--db-amber)]" />
              )}
            </button>
          )}

          {!pastedId && looksLikeLink(trimmed) && (
            <p className="mt-2.5 px-1 text-[0.78rem] text-[color:var(--db-muted)]">
              That looks like a YouTube link, but there is no video ID in it.
            </p>
          )}

          {link.kind === "failed" && (
            <p className="mt-2 px-1 text-[0.78rem] text-[color:var(--db-amber)]">{link.reason}</p>
          )}

          {/* ── the playlist, then YouTube ────────────────────────────────── */}
          {!pastedId && (
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
          )}

          {!pastedId && (
            <div className="-mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
              {/* On this bus */}
              {results.length > 0 && (
                <>
                  <p className="px-1 pt-1 pb-1 text-[0.62rem] text-[color:var(--db-muted)]/70 uppercase tracking-[0.14em]">
                    On this bus
                  </p>
                  <ul>
                    {results.map(({ track, matchedOn }) => (
                      <li key={track.youtubeId}>
                        <button
                          type="button"
                          onClick={() => pick(track.youtubeId)}
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
                              {track.year !== undefined ? ` · ${track.year}` : ""}
                              {track.singer !== undefined ? ` · ${track.singer}` : ""}
                            </span>
                          </span>
                          {matchedOn !== "title" && matchedOn !== "titleMl" && (
                            <span className="shrink-0 text-[0.6rem] uppercase tracking-[0.12em] opacity-45">
                              {matchedOn}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* On YouTube — plays right here, no redirect. */}
              {trimmed.length >= MIN_QUERY && (
                <>
                  <p className="flex items-center gap-2 px-1 pt-3 pb-1 text-[0.62rem] text-[color:var(--db-muted)]/70 uppercase tracking-[0.14em]">
                    On YouTube
                    {searchingYouTube && <Loader2 className="size-3 animate-spin" />}
                  </p>

                  {youtube.kind === "done" && youtubeHits.length === 0 && (
                    <p className="px-2 py-4 text-[0.82rem] text-[color:var(--db-muted)]">
                      {youtube.degraded
                        ? "Could not reach YouTube just now."
                        : "Nothing on YouTube for that either."}
                    </p>
                  )}

                  <ul>
                    {youtubeHits.map((hit) => (
                      <li key={hit.youtubeId}>
                        <button
                          type="button"
                          onClick={() => playGuest(hit.youtubeId, hit.title, hit.channel)}
                          className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-[color:oklch(0.96_0.017_90/0.09)] focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2"
                        >
                          <span className="relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumbnailUrl(hit.youtubeId, "mqdefault")}
                              alt=""
                              width={56}
                              height={40}
                              loading="lazy"
                              decoding="async"
                              className="h-10 w-14 rounded-md object-cover"
                            />
                            {hit.length && (
                              <span className="absolute right-0.5 bottom-0.5 rounded bg-black/75 px-1 font-mono text-[0.58rem] text-white tabular-nums">
                                {hit.length}
                              </span>
                            )}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[0.9rem]">{hit.title}</span>
                            <span className="truncate text-[0.72rem] opacity-60">
                              {hit.channel}
                            </span>
                          </span>
                          <Play
                            className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70"
                            fill="currentColor"
                            strokeWidth={0}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {trimmed.length < MIN_QUERY && results.length === 0 && (
                <p className="px-2 py-8 text-center text-[0.85rem] text-[color:var(--db-muted)]">
                  Type a song, a film, a singer — or paste a YouTube link.
                </p>
              )}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
