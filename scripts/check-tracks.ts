#!/usr/bin/env tsx
/**
 * `npm run check-tracks`
 *
 * Three passes over the playlist:
 *
 *   1. structure — shape, Malayalam titles, duplicates, year scope (offline)
 *   2. liveness  — every ID still resolves via YouTube's oEmbed endpoint
 *   3. embedding — best-effort, and honest about being best-effort
 *
 * The third pass is the one that would matter most and the one that no longer
 * works from outside a browser. An upload can answer oEmbed with a cheerful 200
 * and still have embedding switched off, which surfaces at runtime as player
 * error 101/150 — a track nobody hears and nobody notices, because the queue
 * politely skips it. The `playableInEmbed` flag used to be readable in the watch
 * page's bootstrap JSON; as of this writing YouTube no longer serves it to a
 * plain fetch, and neither does /embed/. So this pass reports *unknown* rather
 * than pretending, and the real guard is the queue's error-skip at runtime.
 *
 * Two things it never could catch anyway: rights-holders who allow embedding in
 * general but refuse specific referrers (a localhost origin gets a 150 the
 * production domain does not), and region blocks.
 *
 * Exits non-zero on any problem, so this can gate a deploy.
 */

import { tracks } from "../src/content";
import { type Track, validateTracks } from "../src/engine";

const OEMBED = "https://www.youtube.com/oembed";
const CONCURRENCY = 6;
const TIMEOUT_MS = 12_000;
const RETRIES = 2;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

type Result =
  | { ok: true; track: Track; author: string; embeddable: boolean | null }
  | { ok: false; track: Track; reason: string };

/**
 * The watch page carries `"playableInEmbed": true|false` in its bootstrap JSON.
 * Returns null when the flag cannot be read, so a YouTube layout change degrades
 * to "unknown" rather than failing the whole check.
 */
async function allowsEmbedding(youtubeId: string): Promise<boolean | null> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
      headers: { "user-agent": UA, "accept-language": "en-US,en" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const match = (await response.text()).match(/"playableInEmbed"\s*:\s*(true|false)/);
    return match ? match[1] === "true" : null;
  } catch {
    return null;
  }
}

async function probe(track: Track): Promise<Result> {
  const url = `${OEMBED}?format=json&url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${track.youtubeId}`,
  )}`;

  let lastReason = "unknown error";

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

      if (response.ok) {
        const body = (await response.json()) as { author_name?: string };
        const embeddable = await allowsEmbedding(track.youtubeId);
        if (embeddable === false) {
          return { ok: false, track, reason: "embedding disabled (would fail 101/150)" };
        }
        return { ok: true, track, author: body.author_name ?? "unknown", embeddable };
      }

      // 401/403/404 are verdicts, not transport failures — do not retry them.
      if ([401, 403, 404].includes(response.status)) {
        return { ok: false, track, reason: `video unavailable (HTTP ${response.status})` };
      }
      lastReason = `HTTP ${response.status}`;
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error);
    }

    if (attempt < RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  return { ok: false, track, reason: lastReason };
}

/** Bounded fan-out — YouTube rate-limits oEmbed if you hit it all at once. */
async function probeAll(list: readonly Track[]): Promise<Result[]> {
  const results: Result[] = new Array(list.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < list.length) {
      const index = cursor++;
      const track = list[index];
      if (!track) continue;
      results[index] = await probe(track);
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker));
  return results;
}

const MINIMUM = 40;

async function main() {
  const offlineOnly = process.argv.includes("--offline");
  console.log(`\nchecking ${tracks.length} tracks\n`);

  const problems = validateTracks(tracks);
  if (problems.length > 0) {
    console.error(`✗ ${problems.length} structural problem(s):\n`);
    for (const problem of problems) {
      console.error(`  [${problem.index}] ${problem.youtubeId} · ${problem.field}: ${problem.message}`);
    }
    process.exit(1);
  }
  console.log("✓ structure: shape, Malayalam titles, duplicates, year scope");

  if (tracks.length < MINIMUM) {
    console.error(`✗ only ${tracks.length} tracks — the playlist needs ${MINIMUM}+`);
    process.exit(1);
  }
  console.log(`✓ count: ${tracks.length} tracks`);

  if (offlineOnly) {
    console.log("\nskipping the network passes (--offline)\n");
    return;
  }

  const results = await probeAll(tracks);
  const dead = results.filter((result): result is Extract<Result, { ok: false }> => !result.ok);
  const unknown = results.filter((result) => result.ok && result.embeddable === null);

  if (dead.length > 0) {
    console.error(`\n✗ ${dead.length} track(s) will not play:\n`);
    for (const { track, reason } of dead) {
      console.error(`  ${track.youtubeId}  ${track.title} — ${track.movie}`);
      console.error(`    ${reason}`);
    }
    process.exit(1);
  }

  console.log(`✓ liveness: all ${tracks.length} IDs resolve via oEmbed`);
  if (unknown.length === results.length) {
    console.log(
      "· embedding: not verifiable from here — YouTube no longer serves the " +
        "playableInEmbed flag to a plain fetch. The queue's error-skip is the guard.",
    );
  } else {
    console.log(
      `✓ embedding: ${results.length - unknown.length} confirmed` +
        (unknown.length ? `, ${unknown.length} unknown` : ""),
    );
  }
  console.log();
}

await main();
