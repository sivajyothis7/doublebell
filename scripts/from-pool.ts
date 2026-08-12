#!/usr/bin/env tsx
/**
 * `npm run from-pool`
 *
 * Turns harvested pool rows into draft playlist entries **without touching the network**.
 *
 * This exists because the per-video metadata pass does not scale. YouTube rate-limits a
 * few hundred `yt-dlp` metadata fetches in — on a 2,774-video run it answered 9 of the
 * first 160 — so any approach that needs one request per song caps out at a couple of
 * hundred songs no matter how patient it is.
 *
 * The pool rows already carry what matters: the video id, the duration, the channel and
 * the upload's own title. A Malayalam upload's title is usually the whole credit roll —
 * "കാറ്റാടി | Kaattadi | Classmates | Vidhu Prathap | Alex Paul" — so the song name, the
 * Malayalam spelling and often the film are all sitting there already.
 *
 * The one thing this will not do is invent a Malayalam title. `titleMl` has to be real
 * Malayalam, and a machine transliteration of a Latin name produces spellings a Malayali
 * reads as wrong — worse than no entry. So a row only qualifies if **the upload itself
 * carries Malayalam script**. That is the filter doing the work here, and it is a fact
 * about the source rather than a rule about taste.
 *
 * Output: `.harvest/from-pool.json`, for review before anything is promoted. Junk still
 * gets through — jukeboxes that lie about their duration, devotional albums, comedy
 * skits — and pruning that is a human's job.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { cleanUploadTitle } from "../src/engine/link";
import type { Track, Vibe } from "../src/engine/track";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const POOL = join(ROOT, ".harvest/ytpool.txt");
const TRACKS = join(ROOT, "src/content/tracks.ts");
const OUT = join(ROOT, ".harvest/from-pool.json");

const MIN_SECONDS = 100;
const MAX_SECONDS = 600;

const MALAYALAM = /[ഀ-ൿ]/;
/** A run of Malayalam long enough to be a song title rather than a stray word. */
const MALAYALAM_RUN = /[ഀ-ൿ][ഀ-ൿ\s‌‍.,'-]{3,}/;

/**
 * Malayalam that is a *description* rather than a title. Compilation uploads title
 * themselves things like "മണിച്ചേട്ടന്റെ അടിപൊളി നാടൻപാട്ടുകൾ" — "Manichettan's cracking
 * folk songs", plural — and "പ്രസീതാചാലക്കുടി പാടിഅഭിനയിച്ച", "sung and acted by". Those
 * are blurbs, and using one as a song title puts a sentence in the deck.
 */
const ML_BLURB =
  /പാട്ടുകൾ|ഗാനങ്ങൾ|ഗാനമേള|അടിപൊളി|സൂപ്പർഹിറ്റ|തകർപ്പൻ|ഓർമ്മയ്|പാടി\s*അഭിനയി|പാടിഅഭിനയി|നോൺസ്റ്റോപ്പ്|ഹിറ്റുകൾ|സ്പെഷ്യൽ/;

/** Latin that is a descriptor, not a song name. */
const LATIN_BLURB =
  /^(?:album|audio|video|lyric(?:al)?|full|official)?\s*(?:song|songs|video|audio|jukebox|ganamela|gaanamela|live|hits?|special|nonstop|non stop|mix)\s*$/i;

/** Not the song, or not a song at all. */
const REJECT = [
  "remix",
  "dj ",
  " dj",
  "mashup",
  "cover version",
  "karaoke",
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
  "cover song",
  "trailer",
  "teaser",
  "making",
  "interview",
  "full movie",
  "comedy",
  "kadha prasangam",
  "kathaprasangam",
  "speech",
  "prayer",
  "devotional",
  "bhakthi",
  "bhajan",
  "christian",
  "holy mass",
  "qurbana",
  "ayyappa",
  "sabarimala",
  "shorts",
  "trolls",
  "troll",
  "mimicry",
  "tutorial",
  "lyrics only",
  // Not bus songs at all, and all of these turned up in the harvest.
  "rhymes",
  "kids",
  "infobells",
  "kavitha",
  "കവിത",
  "nursery",
  "school bus",
  "സ്കൂൾ ബസ്",
  "friendship day",
  "album promo",
];

/**
 * Vibe from the words the upload uses about itself. A guess, and a cheap one — but the
 * filter chips are a convenience, not a claim, and "mass" is the honest default for a
 * bus.
 */
function guessVibe(haystack: string): Vibe {
  const text = haystack.toLowerCase();
  if (/mappila|മാപ്പിള|oppana|ഒപ്പന|dile|khalb|ഖൽബ്/.test(text)) return "mappila";
  if (/nadan|നാടൻ|naadan|folk|vanchi|വഞ്ചി|thiruvathira|കൈകൊട്ടി/.test(text)) return "nadan";
  if (/melody|മെലഡി|sad|romantic|love song/.test(text)) return "melody";
  return "mass";
}

/**
 * The film, if the title names one. Uploads put it in a later pipe segment, so this
 * takes the first segment that looks like a title rather than a credit: no personal
 * name markers, not a descriptor, short enough to be a film.
 */
function guessFilm(segments: string[]): string | null {
  const CREDIT = /singer|music|lyric|director|composer|ft\.|feat|official|records|audios?|media|entertainment|movies?$|songs?$|hd|4k/i;
  for (const raw of segments.slice(1)) {
    const segment = raw.trim();
    if (segment.length < 3 || segment.length > 40) continue;
    if (CREDIT.test(segment)) continue;
    if (MALAYALAM.test(segment)) continue;
    // A year in brackets is a strong signal this is the film.
    return segment.replace(/\s*\(?(19|20)\d\d\)?\s*$/, "").trim() || null;
  }
  return null;
}

function guessYear(haystack: string): number | undefined {
  const match = haystack.match(/\b(19[7-9]\d|20[0-2]\d)\b/);
  if (!match?.[1]) return undefined;
  const year = Number(match[1]);
  return year >= 1975 && year <= 2027 ? year : undefined;
}

async function main() {
  const have = new Set(
    [...(await readFile(TRACKS, "utf8")).matchAll(/youtubeId: "([\w-]{11})"/g)].map((m) => m[1]),
  );

  const seen = new Set<string>();
  const drafts: (Track & { channel: string; rawTitle: string })[] = [];

  for (const line of (await readFile(POOL, "utf8")).split("\n")) {
    const parts = line.split("|");
    if (parts.length < 4) continue;
    const [id, duration, channel, ...titleParts] = parts;
    const rawTitle = titleParts.join("|");
    if (!id || !rawTitle || have.has(id) || seen.has(id)) continue;

    const seconds = Number(duration) || 0;
    if (seconds < MIN_SECONDS || seconds > MAX_SECONDS) continue;

    const lower = rawTitle.toLowerCase();
    if (REJECT.some((bad) => lower.includes(bad))) continue;

    // The load-bearing filter: the upload has to carry its own Malayalam.
    const malayalam = rawTitle.match(MALAYALAM_RUN)?.[0]?.trim();
    if (!malayalam || malayalam.length < 4) continue;
    // …and it has to be a title, not a blurb about a compilation.
    if (ML_BLURB.test(malayalam)) continue;

    const titleMl = cleanUploadTitle(malayalam);
    if (titleMl.length < 4 || titleMl.length > 44) continue;

    const segments = rawTitle.split(/[|｜]/).map((segment) => cleanUploadTitle(segment.trim()));

    /*
     * One exact shape, and nothing else.
     *
     *     ചെന്താർമിഴി | Chentharmizhi | Perumazhakkalam | …
     *     Malayalam   | its Latin     | the film
     *
     * Every looser rule tried here mislabelled songs, because the segment order in a
     * YouTube title is not a standard — the first Latin run is as likely to be the film
     * ("Bharatham"), the singer ("Afsal") or a descriptor ("AUDIO SONG") as the song.
     * Requiring this shape throws away plenty of real songs; what survives is right,
     * which matters more on a page whose whole job is naming them.
     */
    const first = segments[0] ?? "";
    const second = segments[1] ?? "";
    const third = segments[2] ?? "";
    if (!MALAYALAM.test(first)) continue;

    const looksLikeName = (segment: string) =>
      /^[A-Za-z][A-Za-z\s.'&-]{3,43}$/.test(segment) &&
      !LATIN_BLURB.test(segment) &&
      segment.split(/\s+/).length <= 6;

    if (!looksLikeName(second)) continue;
    // The film is optional; the channel stands in when the third segment is a credit.
    const film = looksLikeName(third) ? third.replace(/\s*\(?(19|20)\d\d\)?\s*$/, "").trim() : "";

    seen.add(id);
    drafts.push({
      youtubeId: id,
      title: second,
      titleMl,
      movie: film && film.toLowerCase() !== second.toLowerCase() ? film : (channel === "NA" ? "—" : channel || "—"),
      year: guessYear(rawTitle),
      vibe: guessVibe(rawTitle),
      channel: channel === "NA" ? "" : (channel ?? ""),
      rawTitle,
    });
  }

  drafts.sort((a, b) => a.title.localeCompare(b.title));
  await writeFile(OUT, `${JSON.stringify(drafts, null, 2)}\n`);
  console.log(`\n✓ ${drafts.length} drafts (Malayalam-titled, not already on the playlist)`);
  console.log(`  → ${OUT}\n  Review before promoting: junk still gets through.\n`);
}

await main();
