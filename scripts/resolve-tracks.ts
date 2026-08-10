#!/usr/bin/env tsx
/**
 * `npm run resolve-tracks`
 *
 * Turns the curation list in `scripts/candidates.ts` into real YouTube uploads,
 * with the metadata read off the upload rather than off anyone's memory.
 *
 * For each candidate it searches YouTube, scores the results, and keeps the best
 * one — heavily preferring the label and studio channels, because those are the
 * uploads that stay up and stay embeddable. It then prints the film, year,
 * composer and singer it could parse out of the description, which is the raw
 * material for authoring `src/content/tracks.ts` by hand.
 *
 * Output: `.harvest/resolved.json`. Nothing here writes to the playlist — the
 * playlist is authored, reviewed and committed by a human, and this is a
 * research tool that saves that human from typing eleven-character IDs.
 */

import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { CANDIDATES, type Candidate } from "./candidates";

const run = promisify(execFile);

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const OUT = join(ROOT, ".harvest/resolved.json");

const RESULTS_PER_QUERY = 6;
const CONCURRENCY = 5;

/**
 * Channels whose uploads are worth trusting: the labels that actually hold the
 * Malayalam catalogue, plus the studio and production channels. An upload from
 * one of these is far less likely to vanish or have embedding switched off
 * mid-year than a fan re-rip of the same song.
 */
const TRUSTED = [
  "satyam audios",
  "manorama music",
  "muzik247",
  "east coast",
  "millennium audios",
  "saregama",
  "think music",
  "sony music",
  "aditya music",
  "goodwill entertainments",
  "mathrubhumi",
  "kappa tv",
  "wayfarer films",
  "friday",
  "ananya audios",
  "johnson",
  "central talkies",
  "silver stone",
  "sangeetha",
  "magic frames",
  "lal media",
  "confident group",
  "urvasi theatres",
];

/** Fan and jukebox channels — usable, and often the only source for the 80s. */
const TOLERATED = [
  "evergreen film songs",
  "malayalam cassettes",
  "matinee now",
  "musiczone",
  "saina",
  "chalakkudikkaran changathi",
  "cinema paattu",
  "kairali",
];

/** Things that are not the song: re-cuts, covers, and other people's versions. */
const REJECT = [
  "remix",
  "dj ",
  " dj",
  "mashup",
  "cover",
  "rendition",
  "music mojo",
  "unplugged",
  "recreated",
  "karaoke",
  "reaction",
  "lyrics video by",
  "trailer",
  "making",
  "teaser",
  "whatsapp status",
  "status video",
  "8d audio",
  "slowed",
  "reverb",
  "nonstop",
  "jukebox",
  "medley",
  "instrumental",
  "bgm",
  "flute",
  "violin",
  "dance performance",
  "dance cover",
  "tribute",
  "live show",
  "stage show",
  "sung by",
];

type SearchHit = {
  id: string;
  title: string;
  channel: string;
  duration: number;
  views: number;
  uploaded: string;
  description: string;
};

type Resolved = {
  candidate: Candidate;
  chosen: (SearchHit & { score: number; parsed: Parsed }) | null;
  runnersUp: { id: string; title: string; channel: string; score: number }[];
};

/** What the description of a label upload usually gives away, when it does. */
type Parsed = {
  film?: string;
  year?: number;
  composer?: string;
  singer?: string;
  lyricist?: string;
  malayalamTitle?: string;
};

function lower(value: string): string {
  return value.toLowerCase();
}

/**
 * How much this hit looks like the actual song, on the upload people would
 * actually find. Channel trust dominates: a slightly-worse title on a label
 * channel beats a perfect title on an account that reposts other people's rips.
 */
function score(hit: SearchHit, candidate: Candidate): number {
  const title = lower(hit.title);
  const channel = lower(hit.channel);
  let total = 0;

  if (TRUSTED.some((name) => channel.includes(name))) total += 40;
  else if (TOLERATED.some((name) => channel.includes(name))) total += 12;

  // Every word of the song title that survives in the upload's own title.
  const words = lower(candidate.song)
    .split(/\s+/)
    .filter((word) => word.length > 2);
  const matched = words.filter((word) => title.includes(word)).length;
  total += words.length === 0 ? 0 : Math.round((matched / words.length) * 30);

  if (candidate.film && title.includes(lower(candidate.film).split(" ")[0] ?? "")) total += 10;

  // A single song, not a two-second Short and not a 40-minute jukebox.
  if (hit.duration >= 140 && hit.duration <= 480) total += 15;
  else if (hit.duration > 480 || hit.duration < 100) total -= 40;

  // Popularity as a weak tie-break — the version everyone has heard.
  total += Math.min(10, Math.log10(Math.max(hit.views, 1)));

  for (const bad of REJECT) if (title.includes(bad)) total -= 35;
  // "Video Song" / "Official" are what the real uploads call themselves.
  if (/official|video song|full song|audio song/.test(title)) total += 6;
  if (/\b4k\b|remastered/.test(title)) total += 3;

  return total;
}

const PATTERNS: { key: keyof Parsed; re: RegExp }[] = [
  { key: "film", re: /(?:^|\n)\s*(?:film|movie|album|padam)\s*[:\-–]\s*(.+)/i },
  { key: "composer", re: /(?:^|\n)\s*(?:music|composer|music director|sangeetham)\s*[:\-–]\s*(.+)/i },
  { key: "singer", re: /(?:^|\n)\s*(?:singer|singers|vocals|sung by|gaanam)\s*[:\-–]\s*(.+)/i },
  { key: "lyricist", re: /(?:^|\n)\s*(?:lyric|lyrics|lyricist|rachana)\s*[:\-–]\s*(.+)/i },
];

function parseDescription(hit: SearchHit): Parsed {
  const parsed: Parsed = {};
  for (const { key, re } of PATTERNS) {
    const match = hit.description.match(re);
    if (match?.[1]) {
      const value = match[1].split(/[|·]/)[0]?.trim().slice(0, 80);
      if (value) Object.assign(parsed, { [key]: value });
    }
  }

  // A year in the description beats the upload date, which for a 1985 song is
  // whenever the label got round to digitising it.
  const year = `${hit.title}\n${hit.description}`.match(/\b(19[8-9]\d|20[0-2]\d)\b/);
  if (year?.[1]) parsed.year = Number(year[1]);

  // Malayalam runs in the upload's own title — free, correct orthography.
  const malayalam = hit.title.match(/[ഀ-ൿ][ഀ-ൿ\s‌‍]{3,}/);
  if (malayalam?.[0]) parsed.malayalamTitle = malayalam[0].trim();

  return parsed;
}

async function search(candidate: Candidate): Promise<SearchHit[]> {
  const query = [candidate.song, candidate.film, candidate.hint, "malayalam song"]
    .filter(Boolean)
    .join(" ");

  const { stdout } = await run(
    "yt-dlp",
    [
      "--flat-playlist",
      "--no-warnings",
      "--print",
      // A single line per hit, delimited by a sequence no title contains.
      "%(id)s@@%(title)s@@%(channel)s@@%(duration)s@@%(view_count)s@@%(upload_date)s@@%(description)s",
      `ytsearch${RESULTS_PER_QUERY}:${query}`,
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  ).catch(() => ({ stdout: "" }));

  const hits: SearchHit[] = [];
  // `--flat-playlist` gives no description, so each record is one line; the
  // fields are split back out here rather than parsed out of JSON, which for a
  // search of six results is a great deal less output to move around.
  for (const line of stdout.split("\n")) {
    const parts = line.split("@@");
    if (parts.length < 6) continue;
    const [id, title, channel, duration, views, uploaded, description] = parts;
    if (!id || id === "NA" || !title) continue;
    hits.push({
      id,
      title,
      channel: channel === "NA" ? "" : (channel ?? ""),
      duration: Number(duration) || 0,
      views: Number(views) || 0,
      uploaded: uploaded ?? "",
      description: description ?? "",
    });
  }
  return hits;
}

/** The description is not in the flat search output, so fetch it per winner. */
async function describe(id: string): Promise<string> {
  const { stdout } = await run(
    "yt-dlp",
    ["--no-warnings", "--skip-download", "--print", "%(description)s", `https://youtu.be/${id}`],
    { maxBuffer: 32 * 1024 * 1024 },
  ).catch(() => ({ stdout: "" }));
  return stdout.trim();
}

async function resolve(candidate: Candidate): Promise<Resolved> {
  const hits = await search(candidate);
  const ranked = hits
    .map((hit) => ({ hit, score: score(hit, candidate) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return { candidate, chosen: null, runnersUp: [] };

  const withDescription: SearchHit = { ...best.hit, description: await describe(best.hit.id) };

  return {
    candidate,
    chosen: {
      ...withDescription,
      score: best.score,
      parsed: parseDescription(withDescription),
    },
    runnersUp: ranked.slice(1, 4).map(({ hit, score: value }) => ({
      id: hit.id,
      title: hit.title,
      channel: hit.channel,
      score: value,
    })),
  };
}

/** Cache key. Curation is iterative, and a re-run should only fetch what is new. */
function key(candidate: Candidate): string {
  return `${candidate.song}|${candidate.film ?? ""}|${candidate.hint ?? ""}`;
}

async function loadCache(): Promise<Map<string, Resolved>> {
  const cached = new Map<string, Resolved>();
  const raw = await readFile(OUT, "utf8").catch(() => null);
  if (!raw) return cached;
  try {
    for (const result of JSON.parse(raw) as Resolved[]) {
      if (result?.candidate) cached.set(key(result.candidate), result);
    }
  } catch {
    // A half-written cache is not worth recovering; re-resolve everything.
  }
  return cached;
}

async function main() {
  const force = process.argv.includes("--force");
  const cache = force ? new Map<string, Resolved>() : await loadCache();
  const todo = CANDIDATES.filter((candidate) => !cache.has(key(candidate)));

  console.log(
    `\n${CANDIDATES.length} candidates · ${cache.size} cached · resolving ${todo.length}\n`,
  );

  const results: Resolved[] = new Array(CANDIDATES.length);
  CANDIDATES.forEach((candidate, index) => {
    const hit = cache.get(key(candidate));
    if (hit) results[index] = hit;
  });

  let cursor = 0;
  let done = 0;

  const worker = async () => {
    while (cursor < CANDIDATES.length) {
      const index = cursor++;
      const candidate = CANDIDATES[index];
      if (!candidate || results[index]) continue;
      results[index] = await resolve(candidate);
      done++;
      if (done % 10 === 0) console.log(`  ${done}/${todo.length}`);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(results, null, 2)}\n`);

  const found = results.filter((result) => result?.chosen);
  const weak = found.filter((result) => (result.chosen?.score ?? 0) < 55);

  console.log(`\n✓ ${found.length}/${CANDIDATES.length} resolved → ${OUT}`);
  if (weak.length) {
    console.log(`\n${weak.length} low-confidence pick(s) — check these by hand:`);
    for (const result of weak) {
      console.log(
        `  ${result.chosen?.score.toFixed(0).padStart(3)}  ${result.candidate.song}` +
          `  →  ${result.chosen?.title.slice(0, 70)}  [${result.chosen?.channel}]`,
      );
    }
  }
  console.log();
}

await main();
