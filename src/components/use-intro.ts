"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { intro } from "@/content/intro";

export type IntroState = {
  /** Still owed a play this visit. Reset on every load, deliberately. */
  pending: boolean;
  /** Sounding right now. */
  playing: boolean;
  /** Start it, from a user gesture. Safe to call when already playing or done. */
  start: () => void;
  /** Cut it short and hand over to the playlist. */
  skip: () => void;
};

/**
 * The signature tune that opens every visit.
 *
 * One local file, played through a plain `<audio>` element, before the YouTube queue
 * gets to start. It is deliberately not part of the queue: the queue is a shuffled
 * radio of YouTube ids, and this is a fixed thing that happens first, every load.
 *
 * **On autoplay, honestly.** Every browser blocks audio that starts without a user
 * gesture, so "plays on every refresh" cannot be a promise. What this does is try
 * anyway — Chrome does allow it on a site you visit often, via its media engagement
 * score — and, when that is refused, arm the *first interaction anywhere on the page*
 * to start it. So on a phone the tune opens the moment you touch the screen rather
 * than only when you find the play button. That is as close to automatic as the web
 * gets without lying about it.
 *
 * Being a local `<audio>` rather than a YouTube embed, it also keeps playing with the
 * screen locked — which the rest of the deck cannot do.
 */
export function useIntro(onFinished: () => void): IntroState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const finishedRef = useRef(false);
  const [pending, setPending] = useState(true);
  const [playing, setPlaying] = useState(false);

  // Held in a ref so the element is built once and the callback can change under it.
  const finishRef = useRef(onFinished);
  finishRef.current = onFinished;

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPending(false);
    setPlaying(false);
    finishRef.current();
  }, []);

  const start = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || finishedRef.current) return;
    void audio.play().catch(() => {
      // Still refused even with a gesture — a codec the browser will not take, or
      // the file is missing. Do not strand the visit on it: hand over to the queue.
      finish();
    });
  }, [finish]);

  const skip = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    finish();
  }, [finish]);

  useEffect(() => {
    const audio = new Audio(intro.src);
    audio.preload = "auto";
    audioRef.current = audio;

    const onPlaying = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", finish);
    // A file that will not load must not hold the playlist hostage.
    audio.addEventListener("error", finish);

    /*
     * Try immediately. If the browser refuses — which it will on a first visit, and
     * always on a phone — take the very next interaction instead. `pointerdown`
     * covers mouse and touch; `keydown` covers a keyboard; `once` on each means the
     * listeners cost nothing after the first one fires.
     */
    let armed = false;
    const arm = () => {
      if (armed || finishedRef.current) return;
      armed = true;
      const kick = () => {
        window.removeEventListener("pointerdown", kick);
        window.removeEventListener("touchstart", kick);
        window.removeEventListener("keydown", kick);
        start();
      };
      window.addEventListener("pointerdown", kick, { once: true, passive: true });
      window.addEventListener("touchstart", kick, { once: true, passive: true });
      window.addEventListener("keydown", kick, { once: true });
    };

    void audio.play().catch(arm);

    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", finish);
      audio.removeEventListener("error", finish);
      audio.pause();
      audioRef.current = null;
    };
  }, [finish, start]);

  return { pending, playing, start, skip };
}
