"use client";

import { useEffect } from "react";
import { coverUrl, thumbnailUrl, type Track } from "@/engine";

type Controls = {
  play: () => void;
  pause: () => void;
  skipNext: () => void;
  skipPrev: () => void;
  seek: (seconds: number) => void;
  elapsed: number;
  duration: number;
};

/**
 * Publishes what is playing to the operating system.
 *
 * This is what puts the song on a lock screen, in a notification shade, on a watch, and
 * under the media keys — with artwork, and with working previous/play/next. It costs
 * nothing and makes the page behave like a music player instead of a web page that
 * happens to make noise.
 *
 * **What it does not do is keep the audio alive when the phone locks.** Nothing here
 * can: the sound comes from a YouTube embed, and both mobile platforms suspend a
 * backgrounded iframe's media — background YouTube playback is a Premium feature of
 * their app, not something a web page can opt into. `useWakeLock` is the honest answer
 * to that, and it works by stopping the phone from locking at all.
 *
 * One more caveat worth knowing rather than discovering: an iframe can claim the
 * session for itself. Where the YouTube embed does that, the controls shown are the
 * embed's and this metadata is ignored; where it does not, this is what appears. Either
 * way the page is better off having set it.
 */
export function useMediaSession(track: Track | null, isPlaying: boolean, controls: Controls) {
  const { play, pause, skipNext, skipPrev, seek } = controls;

  /* ── the metadata ── */
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !track) return;

    // Malayalam first, because that is the name of the song. The Latin
    // transliteration goes in as part of the artist line where it differs, so a lock
    // screen that cannot render Malayalam still says something useful.
    const artist = [track.singer, track.title !== track.titleMl ? track.title : null]
      .filter(Boolean)
      .join(" · ");

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.titleMl,
      artist: artist || "ഡബിൾ ബെൽ",
      album: track.movie,
      artwork: [
        {
          // A guest track from a pasted link has no baked cover, so it reads from
          // ytimg — the same fallback the deck's record uses.
          src: track.adhoc ? thumbnailUrl(track.youtubeId, "mqdefault") : coverUrl(track.youtubeId),
          sizes: track.adhoc ? "320x180" : "256x256",
          type: track.adhoc ? "image/jpeg" : "image/webp",
        },
      ],
    });
  }, [track]);

  /* ── the buttons ── */
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => play()],
      ["pause", () => pause()],
      ["previoustrack", () => skipPrev()],
      ["nexttrack", () => skipNext()],
      // "stop" is a pause here on purpose: there is nothing to stop — the bus keeps
      // going — and a handler that tears the player down would need a rebuild to
      // resume from.
      ["stop", () => pause()],
      ["seekbackward", () => seek(Math.max(0, controls.elapsed - 10))],
      ["seekforward", () => seek(controls.elapsed + 10)],
      [
        "seekto",
        (details) => {
          if (typeof details.seekTime === "number") seek(details.seekTime);
        },
      ],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Older browsers throw on an action they do not know. Skip it and keep the
        // ones they do.
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Same.
        }
      }
    };
  }, [play, pause, skipNext, skipPrev, seek, controls.elapsed]);

  /* ── the state, so the OS shows the right button ── */
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  /* ── the scrubber on the lock screen ── */
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!("setPositionState" in navigator.mediaSession)) return;
    // A duration of 0 is "not known yet"; reporting it throws a RangeError, and an
    // elapsed time past the end throws too — which happens for a frame at every
    // track change, before the new duration arrives.
    if (controls.duration <= 0) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: controls.duration,
        position: Math.min(controls.elapsed, controls.duration),
        playbackRate: 1,
      });
    } catch {
      // Nothing worth reporting: the scrubber is a nicety and the numbers move on.
    }
  }, [controls.elapsed, controls.duration]);
}
