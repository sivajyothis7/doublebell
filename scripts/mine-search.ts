#!/usr/bin/env tsx
/**
 * `npm run mine-search`
 *
 * Sources the playlist from one place: the YouTube search
 * `https://www.youtube.com/results?search_query=bus+hits+malayalam`, plus every
 * playlist that search surfaces. That pool is dumped to `.harvest/ytpool.txt` by
 * `.harvest/ytsearch.sh`; this script turns it into ranked, metadata-complete
 * candidates.
 *
 * What it has to throw away, and why the filtering is the whole job:
 *
 *  · **jukeboxes** — more than a third of that search is 20-to-60-minute
 *    "non-stop bus playlist" uploads. Real listening, useless as tracks: one
 *    entry, no per-song metadata, no seek that means anything.
 *  · **not-Malayalam** — the same search returns Tamil and Hindi, because the
 *    playlists it surfaces drift.
 *  · **not-the-song** — remixes, DJ edits, covers, karaoke, status clips.
 *  · **metadata-less** — an upload whose title and description cannot yield a film
 *    and a singer is not a track this playlist can honestly carry.
 *
 * Output: `.harvest/mined.json`, ranked best-first, for a human to promote into
 * `src/content/tracks.ts`. Nothing here writes the playlist: Malayalam titles are
 * typed by hand, and a machine's guess at one is worse than no entry.
 */

import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const POOL = join(ROOT, ".harvest/ytpool.txt");
const OUT = join(ROOT, ".harvest/mined.json");
/**
 * One JSON file per inspected video.
 *
 * Without this the script is not resumable, and it needs to be: YouTube rate-limits
 * a few hundred metadata fetches in, so the first run over an 865-video pool came
 * back with 267 inspected and the rest silently empty. Re-running redid all 267 and
 * hit the same wall. Now a re-run only asks about what it has never seen.
 */
const CACHE = join(ROOT, ".harvest/inspected");

const CONCURRENCY = 4;
/** Small pause between fetches. Politeness, and it is what keeps the wall further off. */
const THROTTLE_MS = 250;
/** A single film song. Below is a clip, above is a jukebox. */
const MIN_SECONDS = 100;
const MAX_SECONDS = 600;

const TRUSTED = [
  "sony music",
  "manorama music",
  "muzik247",
  "east coast",
  "millennium",
  "saregama",
  "think music",
  "satyam audios",
  "aditya music",
  "goodwill",
  "saina music",
  "aashirvad",
  "magic frames",
  "central talkies",
  "kappa tv",
  "mathrubhumi",
  "vevo",
  // YouTube's auto-generated artist channels are label-fed audio, and they are the
  // most durable source there is for a 1985 song.
  "- topic",
];

const REJECT_TITLE = [
  "remix",
  "dj ",
  " dj",
  "mashup",
  "cover",
  "karaoke",
  "rendition",
  "unplugged",
  "reaction",
  "whatsapp status",
  "status video",
  "8d audio",
  "slowed",
  "reverb",
  "nonstop",
  "non stop",
  "jukebox",
  "medley",
  "playlist",
  "instrumental",
  "bgm",
  "flute",
  "violin",
  "mix ",
  "trance",
  "edm",
  "lofi",
  "lo-fi",
  "shorts",
  "full movie",
  "trailer",
  "teaser",
  "making",
  "interview",
  "live show",
  "stage show",
];

/** Malayalam block, and the Tamil / Devanagari blocks that mean "not this". */
const MALAYALAM = /[ഀ-ൿ]/;
const TAMIL = /[஀-௿]/;
const DEVANAGARI = /[ऀ-ॿ]/;

type PoolEntry = { id: string; duration: number; title: string };

type Mined = {
  id: string;
  title: string;
  channel: string;
  duration: number;
  views: number;
  score: number;
  malayalamInTitle: string | null;
  film: string | null;
  /** The clean song title, when the upload carries one as music metadata. */
  trackName: string | null;
  year: number | null;
  composer: string | null;
  singer: string | null;
  /** Why it was kept or dropped, so a curation decision can be argued with. */
  verdict: string;
};

async function pool(): Promise<PoolEntry[]> {
  const raw = await readFile(POOL, "utf8");
  const seen = new Map<string, PoolEntry>();
  for (const line of raw.split("\n")) {
    const [id, duration, , title] = line.split("|");
    if (!id || !title) continue;
    const seconds = Number(duration) || 0;
    if (seconds < MIN_SECONDS || seconds > MAX_SECONDS) continue;
    if (!seen.has(id)) seen.set(id, { id, duration: seconds, title });
  }
  return [...seen.values()];
}

const FIELDS: { key: "film" | "composer" | "singer"; re: RegExp }[] = [
  { key: "film", re: /(?:^|\n)\s*(?:film|movie|album|picture)\s*[:\-–]\s*(.+)/i },
  { key: "composer", re: /(?:^|\n)\s*(?:music|composer|music director)\s*[:\-–]\s*(.+)/i },
  { key: "singer", re: /(?:^|\n)\s*(?:singer|singers|vocals|sung by)\s*[:\-–]\s*(.+)/i },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Everything yt-dlp will tell us about one upload, in one call. */
async function inspect(entry: PoolEntry): Promise<Mined | null> {
  const { stdout } = await run(
    "yt-dlp",
    [
      "--no-warnings",
      "--skip-download",
      "--print",
      // The music fields matter as much as the description. YouTube's
      // auto-generated artist channels ("… - Topic") carry no prose at all but do
      // carry proper `track` / `artist` / `album` / `release_year` metadata,
      // straight from the label's delivery — and for a 1985 song those art tracks
      // are often the only upload that will still be there next year.
      "%(title)s@@%(channel)s@@%(duration)s@@%(view_count)s@@%(track)s@@%(artist)s@@%(album)s@@%(release_year)s@@%(description)s",
      `https://youtu.be/${entry.id}`,
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  ).catch(() => ({ stdout: "" }));

  const [title, channel, duration, views, track, artist, album, releaseYear, ...rest] =
    stdout.split("@@");
  if (!title) return null;
  const description = rest.join("@@");
  const na = (value: string | undefined) =>
    !value || value === "NA" ? null : value.trim() || null;
  const haystack = `${title}\n${description}`;
  const lower = title.toLowerCase();

  const mined: Mined = {
    id: entry.id,
    title: title.trim(),
    channel: (channel ?? "").trim(),
    duration: Number(duration) || entry.duration,
    views: Number(views) || 0,
    score: 0,
    malayalamInTitle: title.match(/[ഀ-ൿ][ഀ-ൿ\s‌‍]{3,}/)?.[0]?.trim() ?? null,
    film: null,
    trackName: null,
    year: null,
    composer: null,
    singer: null,
    verdict: "",
  };

  // The music fields first — they are structured. The description is the fallback.
  mined.film = na(album);
  mined.singer = na(artist);
  if (na(releaseYear)) mined.year = Number(releaseYear);
  if (na(track)) mined.trackName = na(track);

  for (const { key, re } of FIELDS) {
    if (mined[key]) continue;
    const value = haystack.match(re)?.[1]?.split(/[|·]/)[0]?.trim().slice(0, 80);
    if (value) mined[key] = value;
  }
  if (mined.year === null) {
    const year = haystack.match(/\b(19[7-9]\d|20[0-2]\d)\b/)?.[1];
    if (year) mined.year = Number(year);
  }

  /* ── the filters ── */
  const reject = REJECT_TITLE.find((bad) => lower.includes(bad));
  if (reject) {
    mined.verdict = `dropped: title says "${reject}"`;
    return mined;
  }
  if (TAMIL.test(haystack) && !MALAYALAM.test(haystack)) {
    mined.verdict = "dropped: Tamil script";
    return mined;
  }
  if (DEVANAGARI.test(haystack) && !MALAYALAM.test(haystack)) {
    mined.verdict = "dropped: Devanagari script";
    return mined;
  }
  /*
   * Script alone is not enough. A Tamil upload's title is Latin, so "Mersal",
   * "Bigil" and "Vettaikaaran" all sailed through a script test — they are in this
   * pool because the playlists that surface for this search drift. So require
   * positive Malayalam evidence: Malayalam script anywhere, or a channel or
   * language field that says Malayalam, or a film we can name.
   */
  const evidence =
    MALAYALAM.test(haystack) ||
    /malayalam|mollywood|mlyalam/i.test(`${mined.channel} ${haystack}`);
  if (!evidence) {
    mined.verdict = "dropped: no Malayalam evidence";
    return mined;
  }
  if (/\b(tamil|telugu|kannada|hindi|bollywood|kollywood|tollywood)\b/i.test(title)) {
    mined.verdict = "dropped: title names another industry";
    return mined;
  }

  const channelLower = mined.channel.toLowerCase();
  const trusted = TRUSTED.some((name) => channelLower.includes(name));
  mined.score =
    (trusted ? 40 : 0) +
    (mined.film ? 14 : 0) +
    (mined.singer ? 14 : 0) +
    (mined.composer ? 10 : 0) +
    (mined.year ? 8 : 0) +
    (mined.malayalamInTitle ? 10 : 0) +
    (mined.trackName ? 6 : 0) +
    Math.min(10, Math.log10(Math.max(mined.views, 1)));

  mined.verdict = mined.score >= 45 ? "keep" : "thin: metadata or source too weak";
  return mined;
}

async function main() {
  const entries = await pool();
  console.log(`\n${entries.length} single-song candidates in the pool\n`);

  await mkdir(CACHE, { recursive: true });
  const cached = new Set((await readdir(CACHE)).map((name) => name.replace(/\.json$/, "")));
  const todo = entries.filter((entry) => !cached.has(entry.id));
  console.log(`${cached.size} already inspected · ${todo.length} to go\n`);

  const results: Mined[] = [];
  let cursor = 0;
  let done = 0;
  let failed = 0;

  const worker = async () => {
    while (cursor < todo.length) {
      const entry = todo[cursor++];
      if (!entry) continue;
      const mined = await inspect(entry);
      done++;
      if (mined) {
        // Cache the answer, not the attempt: a failed fetch stays un-cached so the
        // next run asks again rather than remembering a hole.
        await writeFile(join(CACHE, `${entry.id}.json`), JSON.stringify(mined));
        results.push(mined);
      } else {
        failed++;
      }
      if (done % 40 === 0) {
        console.log(`  ${done}/${todo.length} (${failed} no answer)`);
      }
      await sleep(THROTTLE_MS);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Everything ever inspected, this run and every previous one.
  const all: Mined[] = [];
  for (const name of await readdir(CACHE)) {
    if (!name.endsWith(".json")) continue;
    all.push(JSON.parse(await readFile(join(CACHE, name), "utf8")) as Mined);
  }

  all.sort((a, b) => b.score - a.score);
  await writeFile(OUT, `${JSON.stringify(all, null, 2)}\n`);

  const keep = all.filter((entry) => entry.verdict === "keep");
  const dropped = all.filter((entry) => entry.verdict.startsWith("dropped"));

  console.log(
    `\n✓ ${all.length} inspected in total: ${keep.length} keep · ` +
      `${all.length - keep.length - dropped.length} thin · ${dropped.length} dropped` +
      (failed ? `\n  ${failed} gave no answer this run — re-run to retry just those` : "") +
      `\n  → ${OUT}\n`,
  );
}

await main();
