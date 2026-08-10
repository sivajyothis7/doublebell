"use client";

import { type Board, boardAt, ROUTE_ROTATE_MS } from "@/engine";
import { useEffect, useState } from "react";

/**
 * The route board above the windscreen.
 *
 * This slot is where the format usually puts a live listener count. There is no
 * backend here to count anything, and a number nobody is counting is a lie — so
 * it holds the one piece of information a bus actually displays instead: where it
 * is going, and what class of service it is running.
 *
 * Rendered empty on the server and filled on mount. A static export is built
 * once, so anything time-dependent has to arrive after hydration or the markup and
 * the browser disagree.
 */
export default function RouteBoard() {
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    const tick = () => setBoard(boardAt(new Date()));
    tick();
    const id = window.setInterval(tick, ROUTE_ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="board flex min-w-0 items-center gap-2 px-2.5 py-1 sm:gap-3 sm:px-3.5 sm:py-1.5"
      aria-live="off"
    >
      {board ? (
        <>
          <span className="flex min-w-0 flex-col leading-tight">
            <span
              className="truncate font-semibold text-[0.7rem] text-[color:var(--db-amber)] sm:text-[0.82rem]"
              lang="ml"
            >
              {board.fromMl} <span className="opacity-60">→</span> {board.toMl}
            </span>
            <span className="truncate text-[0.55rem] text-[color:var(--db-cream)]/55 uppercase tracking-[0.14em] sm:text-[0.6rem]">
              {board.from} — {board.to}
            </span>
          </span>
          <span className="hidden shrink-0 rounded-sm border border-[color:var(--db-led)]/30 px-1.5 py-0.5 text-[0.52rem] text-[color:var(--db-led)]/80 uppercase tracking-[0.12em] sm:block">
            {board.serviceClass}
          </span>
        </>
      ) : (
        // Same height as a filled board, so nothing shifts when it arrives.
        <span className="h-[1.85rem] w-[9rem] sm:h-[2.1rem] sm:w-[13rem]" />
      )}
    </div>
  );
}
