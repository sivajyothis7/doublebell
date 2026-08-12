"use client";

import { useEffect, useState } from "react";

/** Heartbeat interval. Comfortably inside the route's 60s window, twice over. */
const BEAT_MS = 20_000;
const STORAGE_KEY = "doublebell:tab-id";

/**
 * A random id for this tab.
 *
 * Kept in `sessionStorage` so a reload is recognised as the same visitor instead of
 * counting twice, and forgotten when the tab closes. It is not derived from anything
 * about the person — no cookie, no fingerprint, nothing that outlives the session.
 */
function tabId(): string {
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID().replace(/-/g, "");
    window.sessionStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Private mode with storage blocked: a fresh id per reload, which counts a
    // refresh as a new visitor. Being slightly generous here beats not counting.
    return crypto.randomUUID().replace(/-/g, "");
  }
}

/**
 * How many people are on the bus.
 *
 * Renders nothing until the first heartbeat comes back — the number arrives after
 * hydration, and a placeholder that says "1" before it knows would be a guess. If the
 * route cannot be reached at all, this stays invisible rather than showing a zero,
 * because zero is wrong: whoever is reading it is here.
 */
export default function Presence({ className = "" }: { className?: string }) {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    const id = tabId();
    let stopped = false;

    /**
     * `force` is what the first beat passes.
     *
     * The recurring beats skip a hidden tab — no point holding a slot open for a page
     * nobody is looking at, and no reason to spend a phone's battery on it. But the
     * *first* beat has to go out either way, or a page opened in a background tab
     * (⌘-clicked, or restored with the session) shows no count at all until it is
     * focused. Which is exactly what it did.
     */
    const beat = async (force = false) => {
      if (!force && document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/presence", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
          // The count must never come from a cache.
          cache: "no-store",
        });
        const body = (await response.json()) as { online?: number };
        if (!stopped && typeof body.online === "number") setOnline(body.online);
      } catch {
        // Offline, or the route is down. Keep the last number rather than blanking
        // it — the bus did not empty because a fetch failed.
      }
    };

    void beat(true);
    const timer = window.setInterval(() => void beat(), BEAT_MS);
    // Coming back to a backgrounded tab should refresh the number immediately, not
    // up to twenty seconds later.
    const onVisible = () => {
      if (document.visibilityState === "visible") void beat(true);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (online === null) return null;

  return (
    <span
      className={`flex items-center gap-1.5 whitespace-nowrap text-[0.7rem] text-[color:var(--db-cream)]/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:text-[0.78rem] ${className}`}
      // The number changes on its own; announce it politely rather than interrupting.
      aria-live="polite"
    >
      <span className="pulse-dot" aria-hidden="true" />
      <span className="tabular-nums">{online}</span>
      {/*
        "on the bus", not "online" — the count is people riding along, and the whole
        page is a bus. It reads correctly at one as well as at twenty, so there is no
        plural to switch. Hidden on the narrowest screens, where the dot and the
        number say it on their own.
      */}
      <span className="hidden text-[color:var(--db-cream)]/50 sm:inline">on the bus</span>
    </span>
  );
}
