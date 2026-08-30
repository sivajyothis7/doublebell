"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { createPlayer, type PlaybackStatus, type Player } from "@/adapters/youtube";
import { tracks } from "@/content";
import {
  addTrack,
  createQueue,
  currentTrack,
  jumpToId,
  markUnavailable,
  next,
  playableCount,
  prev,
  type Queue,
  type Track,
} from "@/engine";
import { ringDoubleBell } from "@/lib/bell";
import { ADD_LINK_EVENT, AWAKE_EVENT, SELECT_TRACK_EVENT } from "./events";
import { useIntro } from "./use-intro";
import { useMediaSession } from "./use-media-session";
import { readAwake } from "./settings-store";
import { useWakeLock } from "./use-wake-lock";

const TICK_MS = 250;

export type Radio = ReturnType<typeof useRadio>;

/**
 * `?id={youtubeId}` — the shareable deep link.
 *
 * Two things want that parameter and they want opposite behaviour. A link somebody
 * *shared* has to open on that song, or the share is worthless. A reload has to start
 * somewhere new, because this is a radio and the whole point is that you get a
 * different song — and the address bar is full of an id we wrote there ourselves one
 * track ago.
 *
 * Telling them apart needs one bit of memory: whichever id this tab last wrote is
 * remembered in `sessionStorage`, and an id that matches it is ours, not a share, so
 * it is ignored. `sessionStorage` is exactly the right lifetime — it survives a
 * reload in this tab and does not exist in a new one, which is where a shared link
 * gets opened.
 */
const WROTE_KEY = "doublebell:wrote-id";

function readLinkedId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const linked = new URLSearchParams(window.location.search).get("id");
  if (!linked) return undefined;

  try {
    // Our own id from a moment ago: this is a refresh, so shuffle afresh.
    if (window.sessionStorage.getItem(WROTE_KEY) === linked) return undefined;
  } catch {
    // Private mode with storage blocked: honour the id. Replaying one song on
    // refresh is a worse bug than a broken share, but it is the safer default —
    // a share that silently ignores its id is unfixable from the outside.
  }

  return linked;
}

/**
 * `replace`, not `push`, on purpose: an entry per track change would turn the
 * browser's back button into a rewind button, which is not what it means anywhere
 * else on the web.
 */
function writeLinkedId(youtubeId: string) {
  try {
    window.sessionStorage.setItem(WROTE_KEY, youtubeId);
  } catch {
    // Nothing to do; `readLinkedId` fails open.
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get("id") === youtubeId) return;
  url.searchParams.set("id", youtubeId);
  window.history.replaceState(null, "", url);
}

/**
 * Binds the pure queue in `@/engine` to the YouTube adapter.
 *
 * All the playlist logic lives in the engine and all the YouTube logic lives in
 * the adapter; this hook only owns React state and the wiring between them.
 */
export function useRadio(deckRef: RefObject<HTMLDivElement | null>) {
  /**
   * The first render matches the server-rendered card exactly — unshuffled, first
   * track — so hydration is clean. The shuffle happens on mount, below.
   */
  const [queue, setQueue] = useState<Queue>(() => createQueue(tracks, { shuffle: false }));
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  /** Set by the first play. Track changes only auto-play after that. */
  const [started, setStarted] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

  const playerRef = useRef<Player | null>(null);
  const startedRef = useRef(false);
  const track = currentTrack(queue);

  /**
   * The id this visit *arrived* with, captured once.
   *
   * It has to be read before anything writes to the URL, and exactly once — the
   * shuffle effect below can run more than once (React's development double-invoke is
   * the everyday case), and by its second run the address bar already holds an id
   * this hook wrote itself. Re-reading then compares our own id against our own
   * marker, they match, and the deep link is thrown away: a shared link silently
   * opens on a random song. Ask the question once, before the first answer changes it.
   *
   * A `useState` initialiser is the right place: it runs during the first render,
   * ahead of every effect, and returns undefined on the server where there is no URL.
   */
  const [arrivedId] = useState<string | undefined>(() => readLinkedId());

  /**
   * Shuffle on mount, not during render: the seed is clock-derived, so doing it in
   * render would make the client's first HTML disagree with the build output.
   */
  useEffect(() => {
    setQueue(createQueue(tracks, { seed: Date.now() >>> 0, shuffle: true, startId: arrivedId }));
  }, [arrivedId]);

  /** Keep the address bar pointing at whatever is playing. */
  useEffect(() => {
    if (track) writeLinkedId(track.youtubeId);
  }, [track]);

  /** Callbacks the player closes over — kept in a ref so it is created once. */
  const handlers = useRef({
    onEnded: () => setQueue((current) => next(current)),
    onUnavailable: (youtubeId: string) =>
      setQueue((current) => markUnavailable(current, youtubeId)),
  });

  useEffect(() => {
    const container = deckRef.current;
    if (!container) return;

    let disposed = false;
    let player: Player | null = null;

    createPlayer({
      container,
      // The unshuffled first track, which is what the server rendered — cueing
      // the shuffled one here would fetch a video the card is not showing yet.
      initialVideoId: currentTrack(createQueue(tracks, { shuffle: false }))?.youtubeId,
      onReady: () => {
        if (!disposed) setReady(true);
      },
      onStatusChange: (value) => {
        if (!disposed) setStatus(value);
      },
      onEnded: () => handlers.current.onEnded(),
      onUnavailable: (youtubeId) => handlers.current.onUnavailable(youtubeId),
    })
      .then((created) => {
        if (disposed) {
          created.destroy();
          return;
        }
        player = created;
        playerRef.current = created;
      })
      .catch((error) => {
        // The page keeps its artwork and its playlist; the card just never
        // becomes interactive.
        console.error("[doublebell] player unavailable", error);
      });

    return () => {
      disposed = true;
      player?.destroy();
      playerRef.current = null;
    };
  }, [deckRef]);

  /** Load whatever the queue points at; auto-play only once started. */
  useEffect(() => {
    if (!ready || !track) return;
    const player = playerRef.current;
    if (!player || player.currentVideoId() === track.youtubeId) return;
    player.load(track.youtubeId, { autoplay: startedRef.current });
    setElapsed(0);
    setDuration(0);
  }, [ready, track]);

  /** Seek-bar clock. Only runs while something is actually playing. */
  useEffect(() => {
    if (status !== "playing") return;
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      if (!scrubbing) setElapsed(player.elapsed());
      setDuration(player.duration());
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [status, scrubbing]);

  /**
   * The signature tune runs first, on every load, and the queue starts when it ends.
   *
   * `startedRef` is set here too, so that whatever happens — the tune autoplayed, or
   * it waited for a tap, or the file failed to load — the playlist picks up by itself
   * afterwards instead of needing a second press.
   */
  const introFinished = useCallback(() => {
    /*
     * Only hand over to the player if this document has actually been interacted
     * with. The tune can autoplay without a gesture — some browsers allow a local
     * `<audio>` on a site you visit often — but the YouTube embed never can, so
     * calling `play()` there would start the song, have the autoplay policy stop it
     * a second later, and leave the deck sitting at 0:01 looking broken. Which is
     * exactly what it did.
     *
     * With no activation the track stays cued and the play button means what it says.
     * On a phone this branch is rare anyway: nothing autoplays there, so the first
     * touch starts the tune and that same touch is the activation this checks for.
     */
    const activated =
      typeof navigator === "undefined" ||
      !("userActivation" in navigator) ||
      navigator.userActivation.hasBeenActive;

    if (!activated) return;

    startedRef.current = true;
    setStarted(true);
    playerRef.current?.play();
  }, []);

  const intro = useIntro(introFinished);
  const introRef = useRef(intro);
  introRef.current = intro;

  const play = useCallback(() => {
    startedRef.current = true;
    setStarted(true);

    // Still owed the opening tune: this press is the gesture that lets it sound, and
    // the queue follows when it ends. No bell — the tune is the bell.
    if (introRef.current.pending) {
      introRef.current.start();
      return;
    }

    // Two bells means go. The click is the gesture the browser wants for audio, so
    // this is also the moment the bell is allowed to make a sound at all.
    if (status === "idle" && elapsed === 0) ringDoubleBell();
    playerRef.current?.play();
  }, [status, elapsed]);

  const pause = useCallback(() => {
    // Pausing during the opening tune stops the tune, not a player that is not
    // playing yet.
    if (introRef.current.playing) {
      introRef.current.skip();
      return;
    }
    playerRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (intro.playing || status === "playing" || status === "buffering") pause();
    else play();
  }, [intro.playing, status, play, pause]);

  /** Skipping during the opening tune means "get on with it", not "next song". */
  const skipNext = useCallback(() => {
    if (introRef.current.pending) {
      introRef.current.skip();
      return;
    }
    setQueue((current) => next(current));
  }, []);
  const skipPrev = useCallback(() => setQueue((current) => prev(current)), []);

  /**
   * Picking a song from search should start it, not queue it silently. The click
   * is the gesture the browser wants, so marking playback as started here means
   * the load effect above auto-plays it.
   */
  const playTrack = useCallback((youtubeId: string) => {
    if (!startedRef.current) ringDoubleBell();
    startedRef.current = true;
    setStarted(true);
    setQueue((current) => jumpToId(current, youtubeId));
  }, []);

  /**
   * A guest track from a pasted link: plays now, and the playlist resumes right
   * after it. It never joins the playlist, which is authored in git.
   *
   * Already resolved by the time it gets here — the sheet does that, so anything
   * arriving on this event is something YouTube confirmed it will serve.
   */
  const addLink = useCallback((guest: Track) => {
    if (!startedRef.current) ringDoubleBell();
    startedRef.current = true;
    setStarted(true);
    setQueue((current) => addTrack(current, guest));
  }, []);

  useEffect(() => {
    const onAdd = (event: Event) => {
      const guest = (event as CustomEvent<Track>).detail;
      if (guest?.youtubeId) addLink(guest);
    };
    window.addEventListener(ADD_LINK_EVENT, onAdd);
    return () => window.removeEventListener(ADD_LINK_EVENT, onAdd);
  }, [addLink]);

  /** Search lives in the header; the queue lives here. */
  useEffect(() => {
    const onSelect = (event: Event) => {
      const youtubeId = (event as CustomEvent<string>).detail;
      if (typeof youtubeId === "string") playTrack(youtubeId);
    };
    window.addEventListener(SELECT_TRACK_EVENT, onSelect);
    return () => window.removeEventListener(SELECT_TRACK_EVENT, onSelect);
  }, [playTrack]);

  const seek = useCallback((seconds: number) => {
    setElapsed(seconds);
    playerRef.current?.seekTo(seconds);
  }, []);

  /**
   * Keyboard transport, desktop only — `pointer: fine` is the proxy for "has a
   * keyboard", and it keeps the space bar off touch devices where it means scroll.
   */
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Never steal keys from a control the user is actually operating.
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === "Space" || event.key === "k") {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        skipNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        skipPrev();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle, skipNext, skipPrev]);

  /**
   * Keep the screen awake while something is playing, unless the viewer turned that
   * off. This is the answer to "it stops when the phone locks": the audio comes from
   * a YouTube embed, which every mobile platform suspends once the screen is off, so
   * the only thing this page can do is stop the screen going off.
   */
  const [awake, setAwake] = useState(true);
  useEffect(() => {
    setAwake(readAwake());
    const onChange = () => setAwake(readAwake());
    window.addEventListener(AWAKE_EVENT, onChange);
    return () => window.removeEventListener(AWAKE_EVENT, onChange);
  }, []);

  const wakeLock = useWakeLock(awake && (status === "playing" || intro.playing));

  /** Put the song on the lock screen, the notification shade and the media keys. */
  useMediaSession(track, status === "playing", {
    play,
    pause,
    skipNext,
    skipPrev,
    seek,
    elapsed,
    duration,
  });

  return {
    track,
    queue,
    status,
    ready,
    started,
    elapsed,
    duration,
    playable: playableCount(queue),
    // The opening tune counts as playing: the button should show pause, the record
    // should turn, and the screen should stay awake while it sounds.
    isPlaying: status === "playing" || intro.playing,
    isBusy: status === "buffering",
    play,
    pause,
    toggle,
    skipNext,
    skipPrev,
    playTrack,
    addLink,
    seek,
    setScrubbing,
    /** Whether the screen is currently being held awake, and whether it can be. */
    wakeLock,
    /** The opening tune: pending until it has had its turn, playing while it sounds. */
    intro,
  };
}
