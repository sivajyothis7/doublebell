"use client";

import { useEffect, useState } from "react";
import RouteBoard from "./route-board";
import SearchSheet from "./search-sheet";
import SettingsSheet from "./settings-sheet";

/** IST wall clock — the page is set in Kerala wherever it is opened from. */
function istClock(now: Date): string {
  return now
    .toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
}

/**
 * Clock, route board, search and settings.
 *
 * The clock renders empty on the server and fills on mount: a static export is
 * built once, so anything time-dependent has to arrive after hydration or the
 * markup and the browser disagree.
 */
export default function TopBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    // Three columns rather than `justify-between`: the clock and the controls are
    // different widths, so space-between would leave the board off-centre.
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3.5 sm:gap-4 sm:px-7 sm:py-5">
      <span
        className="justify-self-start font-mono text-[0.7rem] text-[color:var(--db-cream)]/70 tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:text-[0.8rem]"
        suppressHydrationWarning
      >
        {now ? istClock(now) : " "}
      </span>

      <RouteBoard />

      <div className="flex items-center justify-self-end sm:gap-1">
        <SearchSheet />
        <SettingsSheet />
      </div>
    </div>
  );
}
