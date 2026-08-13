"use client";

import { useEffect, useState } from "react";

/**
 * Keeps the screen awake while a song is playing.
 *
 * **Why this and not background playback.** Audio from a YouTube embed stops when the
 * phone locks, and no amount of code in this page changes that: playing YouTube
 * content with the screen off is a YouTube Premium feature, and both iOS and Android
 * suspend a backgrounded iframe's media regardless. The only honest fixes are to host
 * the audio ourselves — which this project deliberately does not do — or to stop the
 * phone locking in the first place. This is the second one.
 *
 * The lock is released the moment playback stops, so a paused page is not holding a
 * phone awake, and it is re-acquired when the tab comes back — the browser drops the
 * lock itself whenever the page is hidden, which means "reacquire on visibility" is
 * not belt-and-braces, it is the only reason the lock survives a task-switch.
 */
export function useWakeLock(active: boolean): { supported: boolean; held: boolean } {
  const [supported, setSupported] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "wakeLock" in navigator);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const release = () => {
      const current = sentinel;
      sentinel = null;
      setHeld(false);
      // `release()` rejects if the lock is already gone, which is not a problem worth
      // reporting — the desired state is "not held" either way.
      void current?.release().catch(() => {});
    };

    const acquire = async () => {
      // A request while hidden always rejects, so do not even ask.
      if (cancelled || !active || document.visibilityState !== "visible" || sentinel) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled || !active) {
          void lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
        setHeld(true);
        // The browser can take it back on its own — low battery, or the user
        // switching away — and then this has to stop claiming it holds one.
        lock.addEventListener("release", () => {
          if (sentinel === lock) {
            sentinel = null;
            setHeld(false);
          }
        });
      } catch {
        // Denied: unsupported, insecure context, or battery saver. Nothing to do but
        // let the phone behave normally.
      }
    };

    if (active) void acquire();
    else release();

    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [active]);

  return { supported, held };
}
