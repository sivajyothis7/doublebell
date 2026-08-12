"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { type RefObject, useId, useState } from "react";
import { COVER_SIZE, coverUrl, formatTime, progressRatio, thumbnailUrl, type Track } from "@/engine";
import { SHOW_PLAYER } from "@/lib/site";
import type { Radio } from "./use-radio";

type Props = { radio: Radio; deckRef: RefObject<HTMLDivElement | null> };

/**
 * The deck. A single floating capsule rather than a docked bar — the painted plate
 * is the page, and the player is a thing sitting on top of it.
 */
export default function PlayerCard({ radio, deckRef }: Props) {
  const seekId = useId();

  return (
    /*
     * A grid, not a flex row, because the phone layout is genuinely a different
     * arrangement rather than a squeezed one: on a 375px screen the transport drops
     * to its own row under the record and the title, which is the only way the
     * Malayalam title gets enough width to be worth reading. From `sm` up the same
     * four cells sit in one line and the card becomes a capsule.
     *
     * `rounded-full` on a fixed-height row resolves to half the height, which is a
     * true capsule rather than a rectangle with big corners.
     */
    <section
      className="card relative mx-auto grid w-full max-w-[42rem] grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 rounded-[1.6rem] p-2.5 backdrop-blur-2xl backdrop-saturate-[1.7] sm:grid-cols-[auto_1fr_auto_auto] sm:gap-x-4 sm:rounded-full sm:py-3.5 sm:pr-5 sm:pl-4"
      aria-label="Now playing"
    >
      <Record track={radio.track} spinning={radio.isPlaying} />

      <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1.5">
        <Meta track={radio.track} />
        <Seek radio={radio} id={seekId} />
      </div>

      <Transport radio={radio} />
      <Deck deckRef={deckRef} />
    </section>
  );
}

/**
 * The cover as a record on a deck, turning while the track plays.
 *
 * The art is served from our own origin: `npm run covers` bakes a true square
 * crop per track at build time, which is both a better shape for a disc than a
 * 4:3 thumbnail and about a fifth the bytes of hotlinking `i.ytimg.com`.
 */
function Record({ track, spinning }: { track: Track | null; spinning: boolean }) {
  // Keyed on the ID so one missing cover does not leave every later track showing
  // the placeholder.
  const [failed, setFailed] = useState<string | null>(null);
  const broken = !track || failed === track.youtubeId;

  if (!track) return <div className="record size-[3.25rem] sm:size-[4.75rem]" data-blank="true" />;

  return (
    <div
      className="record size-[3.25rem] sm:size-[4.75rem]"
      data-spinning={spinning}
      data-blank={broken || undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // Keyed so a new track always gets a fresh element, and a previously
        // failed one retries rather than inheriting the broken state.
        key={track.youtubeId}
        /*
         * A guest track from a pasted link has no baked cover — `npm run covers`
         * only ever saw the playlist — so it reads from ytimg. Without this the
         * disc silently falls back to the blank-vinyl placeholder for exactly the
         * track the listener just chose.
         */
        src={track.adhoc ? thumbnailUrl(track.youtubeId, "mqdefault") : coverUrl(track.youtubeId)}
        alt={`${track.title} — ${track.movie}`}
        width={COVER_SIZE}
        height={COVER_SIZE}
        loading="eager"
        decoding="async"
        onError={() => setFailed(track.youtubeId)}
        style={broken ? { visibility: "hidden" } : undefined}
      />
    </div>
  );
}

/**
 * The YouTube player, dressed as the screen bolted above the windscreen of every
 * Kerala tourist bus — visible and unobscured, which is what YouTube's terms ask
 * for, and a piece of the subject rather than a compliance tax.
 *
 * `YT.Player` replaces the element it is handed, so the adapter appends its own
 * mount node inside this div rather than consuming the div React rendered.
 */
function Deck({ deckRef }: { deckRef: RefObject<HTMLDivElement | null> }) {
  if (!SHOW_PLAYER) {
    return (
      // Off-screen, not `display: none` and not 1×1: the player still needs real
      // dimensions and a live layout box, or browsers throttle or refuse to decode
      // it and playback stalls on exactly the devices that matter. Positioned
      // inline because `.deck` sets `position: relative` and lands after
      // Tailwind's utilities, so an `absolute` class here would lose on order.
      <div
        className="deck"
        style={{
          position: "absolute",
          left: "-10000px",
          top: 0,
          width: 320,
          height: 180,
          opacity: 0,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <div ref={deckRef} />
      </div>
    );
  }

  return (
    <div
      className="deck col-start-3 row-start-1 aspect-video w-[4.25rem] shrink-0 rounded-lg sm:col-start-4 sm:w-[6rem]"
      title="Playing from YouTube"
    >
      <div ref={deckRef} />
    </div>
  );
}

function Meta({ track }: { track: Track | null }) {
  if (!track) {
    return <p className="text-[0.85rem] text-[color:var(--db-muted)]">No songs in the playlist.</p>;
  }

  return (
    <div className="min-w-0">
      {/*
        Malayalam first, Latin under it — that order is half the point. Set in the
        body face, not the display one: that belongs to the logo, and a song title
        wearing it reads as a second logo.
      */}
      <h2
        className="truncate font-semibold text-[0.95rem] text-[color:var(--db-cream)] leading-snug sm:text-[1.18rem]"
        title={track.titleMl}
        lang="ml"
      >
        {track.titleMl}
      </h2>
      {/*
        The metadata is added back a field at a time as the screen widens, so each
        breakpoint shows what fits whole rather than truncating a longer line. On a
        375px phone that is the transliteration and the film, nothing dangling
        behind an ellipsis.
      */}
      {/*
        A guest track — searched for on YouTube, or pasted as a link — has one piece
        of provenance, the channel that uploaded it, so it gets said once. An authored track has a film, a year
        and a singer, added back a field at a time as the screen widens, so each
        breakpoint shows what fits whole rather than truncating a longer line.
      */}
      <p className="truncate text-[0.66rem] text-[color:var(--db-muted)] sm:text-[0.78rem]">
        {track.adhoc ? (
          <>
            <span className="text-[color:var(--db-amber)]/75">from YouTube</span>
            <span className="text-[color:var(--db-muted)]/70">
              {" · "}
              {track.movie}
            </span>
          </>
        ) : (
          <>
            {track.title}
            <span className="text-[color:var(--db-muted)]/70">
              {" · "}
              {track.movie}
              {track.year !== undefined && (
                <span className="hidden sm:inline"> · {track.year}</span>
              )}
            </span>
            {track.singer !== undefined && (
              <span className="hidden text-[color:var(--db-muted)]/70 lg:inline">
                {" · "}
                {track.singer}
              </span>
            )}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Transport. 44px on every target — these get pressed on a moving bus — so on a
 * phone the icon shrinks rather than the hit area.
 */
const BUTTON =
  "grid size-11 place-items-center rounded-full text-[color:var(--db-cream)]/80 transition-colors hover:text-[color:var(--db-cream)] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2";

const SKIP_ICON = "size-4 sm:size-[1.15rem]";

function Transport({ radio }: { radio: Radio }) {
  const disabled = !radio.ready || radio.playable === 0;

  return (
    <div className="col-span-3 row-start-2 flex shrink-0 items-center justify-center sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:mr-0">
      <button
        type="button"
        onClick={radio.skipPrev}
        disabled={disabled}
        className={BUTTON}
        aria-label="Previous song"
      >
        <SkipBack className={SKIP_ICON} fill="currentColor" strokeWidth={0} />
      </button>

      <button
        type="button"
        onClick={radio.toggle}
        disabled={disabled}
        className="grid size-11 place-items-center rounded-full bg-[color:var(--db-cream)] text-[color:var(--db-night-deep)] shadow-[0_6px_18px_-6px_oklch(0.05_0.02_250/0.9)] transition-transform hover:scale-[1.04] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-3 sm:size-12"
        aria-label={radio.isPlaying ? "Pause" : "Ring the bell and play"}
        aria-pressed={radio.isPlaying}
      >
        {radio.isPlaying ? (
          <Pause className="size-[1.05rem] sm:size-[1.15rem]" fill="currentColor" strokeWidth={0} />
        ) : (
          <Play
            className="size-[1.05rem] translate-x-[1px] sm:size-[1.15rem]"
            fill="currentColor"
            strokeWidth={0}
          />
        )}
      </button>

      <button
        type="button"
        onClick={radio.skipNext}
        disabled={disabled}
        className={BUTTON}
        aria-label="Next song"
      >
        <SkipForward className={SKIP_ICON} fill="currentColor" strokeWidth={0} />
      </button>
    </div>
  );
}

function Seek({ radio, id }: { radio: Radio; id: string }) {
  const { elapsed, duration } = radio;
  const percent = progressRatio(elapsed, duration) * 100;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <input
        id={id}
        type="range"
        min={0}
        max={Math.max(duration, 1)}
        step={1}
        value={Math.min(elapsed, duration || 1)}
        disabled={!radio.ready || duration === 0}
        onPointerDown={() => radio.setScrubbing(true)}
        onPointerUp={() => radio.setScrubbing(false)}
        onKeyDown={() => radio.setScrubbing(true)}
        onKeyUp={() => radio.setScrubbing(false)}
        onChange={(event) => radio.seek(Number(event.target.value))}
        className="seek"
        style={{ ["--seek-progress" as string]: `${percent}%` }}
        aria-label="Seek"
      />
      <span className="whitespace-nowrap font-mono text-[0.64rem] text-[color:var(--db-muted)] tabular-nums sm:text-[0.66rem]">
        {formatTime(elapsed)} / {formatTime(duration)}
      </span>
    </div>
  );
}
