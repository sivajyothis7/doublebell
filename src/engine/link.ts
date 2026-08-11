/**
 * Reading a YouTube link.
 *
 * The playlist is 49 songs and somebody will always want the fiftieth. So the search
 * box takes a YouTube link too — paste one and it plays here, on this bus, without
 * joining the playlist. This module is the parsing half of that, and it is pure: no
 * network, no DOM, so every shape of URL people actually paste is a test case rather
 * than a surprise.
 *
 * The shapes that turn up in practice, all handled below: a bare ID copied out of
 * an address bar, `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`, the
 * `music.youtube.com` variants, anything with a `&t=90s` or an `?si=` tracking
 * parameter hanging off it, and a `watch?v=` where `v` is not the first parameter.
 */

import { isValidYoutubeId } from "./track";

/** Path prefixes that carry the video ID as the next path segment. */
const PATH_FORMS = ["/shorts/", "/embed/", "/live/", "/v/"];

/**
 * The 11-character video ID in `input`, or null.
 *
 * Deliberately strict about the ID itself — `isValidYoutubeId` — because a lenient
 * parse here becomes a player error 2 later, which surfaces to the listener as
 * nothing happening at all.
 */
export function parseYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  // A bare ID, which is what you get from a right-click "copy video ID" and from
  // anyone who has done this before.
  if (isValidYoutubeId(trimmed)) return trimmed;

  // Tolerate a pasted link with no scheme: `youtu.be/xyz` on its own is common.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const isYouTube =
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "youtu.be";
  if (!isYouTube) return null;

  // `youtu.be/<id>` — the ID is the whole path.
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    return isValidYoutubeId(id) ? id : null;
  }

  // `?v=<id>`, wherever in the query string it sits.
  const v = url.searchParams.get("v");
  if (v && isValidYoutubeId(v)) return v;

  for (const form of PATH_FORMS) {
    if (!url.pathname.startsWith(form)) continue;
    const id = url.pathname.slice(form.length).split("/")[0] ?? "";
    if (isValidYoutubeId(id)) return id;
  }

  return null;
}

/** Does this look like an attempt at a link rather than a song title? */
export function looksLikeLink(input: string): boolean {
  const trimmed = input.trim();
  return /youtu\.?be|youtube\.com/i.test(trimmed) || isValidYoutubeId(trimmed);
}

/**
 * A YouTube search URL for `query`.
 *
 * The site searches YouTube in-page now (`/api/search`), so this is no longer how
 * anyone gets to a song — it is kept for linking *out* to the source search, and for
 * anywhere a plain shareable URL is more useful than an in-page result.
 */
export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
}

/**
 * A YouTube upload title, cut down to the song.
 *
 * Uploads are titled for search, not for a player: "Entammede Jimikki Kammal Video
 * Song | Velipadinte Pusthakam | Mohanlal | Lal Jose | Shaan Rahman". Rendered
 * whole, that is a paragraph in a pill. The song is almost always the first
 * pipe-separated segment, with a descriptor stuck on the end of it.
 *
 * Deliberately conservative: if the result would be empty, the original comes back.
 * A long title is bad; a blank one is worse.
 */
export function cleanUploadTitle(raw: string): string {
  const first = raw.split(/[|｜]/)[0] ?? raw;

  const stripped = first
    // The descriptors uploaders append, in any order and any case.
    .replace(
      /\b(?:official\s+)?(?:full\s+)?(?:video|audio|lyric|lyrical|music)\s*(?:song|video)?\b/gi,
      " ",
    )
    .replace(/\b(?:4k|hd|hq|1080p|720p|remastered|official|promo|teaser)\b/gi, " ")
    // Leftover brackets and separators once their contents are gone.
    .replace(/[([{][^)\]}]*[)\]}]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—·:,]+|[\s\-–—·:,]+$/g, "")
    .trim();

  return stripped === "" ? raw.trim() : stripped;
}
