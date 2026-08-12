/**
 * The presence window.
 *
 * Pure, and separated from the route that uses it for one reason: the expiry is the
 * part that rots silently. A sweep that never removes anything looks exactly like a
 * working counter — the number goes up and stays up, which reads as popularity rather
 * than as a bug. So the rule lives here, with an injected clock, and is tested.
 */

/** How long since a heartbeat before a tab is assumed gone. */
export const PRESENCE_WINDOW_MS = 60_000;

/**
 * Ceiling on remembered ids, so a loop pointed at the route cannot grow the map until
 * the function runs out of heap. Well past any real audience for a bus playlist.
 */
export const PRESENCE_MAX_TRACKED = 5_000;

/** A tab id is a short random string; anything else did not come from our client. */
const TAB_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidTabId(value: unknown): value is string {
  return typeof value === "string" && TAB_ID.test(value);
}

/**
 * Drops every id last heard from more than `windowMs` ago. Mutates in place — this is
 * called on a map that lives for the life of the process — and returns how many went,
 * which is the number a test can assert on.
 */
export function pruneStale(
  seen: Map<string, number>,
  now: number,
  windowMs = PRESENCE_WINDOW_MS,
): number {
  let removed = 0;
  for (const [id, last] of seen) {
    if (now - last > windowMs) {
      seen.delete(id);
      removed++;
    }
  }
  return removed;
}

/**
 * Records a heartbeat. Returns whether it was counted.
 *
 * An id already being tracked always refreshes, even at the ceiling — otherwise a
 * busy moment would freeze out the very people already on the page and their entries
 * would expire while they sat there reading.
 */
export function recordBeat(
  seen: Map<string, number>,
  id: unknown,
  now: number,
  maxTracked = PRESENCE_MAX_TRACKED,
): boolean {
  if (!isValidTabId(id)) return false;
  if (!seen.has(id) && seen.size >= maxTracked) return false;
  seen.set(id, now);
  return true;
}
