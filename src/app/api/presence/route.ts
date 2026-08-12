/**
 * `POST /api/presence` — how many people are on the bus right now.
 *
 * **What this counts, exactly.** Every open page sends a heartbeat carrying a random
 * id it made up for the tab. This route keeps those ids in memory with the time each
 * was last heard, forgets anything older than `WINDOW_MS`, and answers with the size
 * of what is left. So the number is real: it is a count of pages that spoke to *this
 * function instance* in the last minute.
 *
 * **And what it cannot see.** There is no shared store on this project, so the count
 * lives in one lambda's memory. While Vercel keeps a single instance warm — which on
 * a site this size is nearly always — the number is simply correct. If traffic ever
 * warrants a second instance, each one counts only its own visitors, so the figure
 * *undercounts*. It never invents anybody.
 *
 * That distinction is the whole reason this route exists rather than a nice curve:
 * the reference product this site is modelled on shows a fabricated listener count,
 * and an earlier version of this page did too before it was taken out. A number that
 * might be low is a measurement. A number nobody is counting is a lie.
 *
 * To make it exact, add a Redis/KV store in the Vercel dashboard and swap the `Map`
 * below for `SETEX`/`SCAN` against it. Nothing else has to change.
 *
 * **Privacy.** The id is a random string the browser generates for the tab; it is
 * never persisted past the session and is not derived from anything about the person.
 * No IP, no cookie, no fingerprint, nothing written to disk.
 *
 * The window and ceiling rules live in `@/engine/presence`, pure and unit-tested —
 * the expiry is the part that rots silently, because a sweep that removes nothing
 * looks identical to a popular page.
 */

import { pruneStale, recordBeat } from "@/engine";

export const runtime = "nodejs";
/** Never cached: a count that is a minute stale is not a count of who is here. */
export const dynamic = "force-dynamic";

/**
 * Module scope, so it survives between invocations of a warm instance — which is the
 * only reason an in-memory count works at all.
 */
const seen = new Map<string, number>();

export async function POST(request: Request) {
  const now = Date.now();

  let id: unknown;
  try {
    ({ id } = (await request.json()) as { id?: unknown });
  } catch {
    // A malformed body still deserves the current count — the page should show a
    // number even if its own heartbeat was rejected.
  }

  pruneStale(seen, now);
  recordBeat(seen, id, now);

  return Response.json(
    { online: seen.size },
    { headers: { "cache-control": "no-store" } },
  );
}

/** The count without joining it — for a check, or a page that only wants to look. */
export async function GET() {
  pruneStale(seen, Date.now());
  return Response.json({ online: seen.size }, { headers: { "cache-control": "no-store" } });
}
