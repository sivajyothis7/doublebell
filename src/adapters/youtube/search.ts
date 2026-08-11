/**
 * Searching YouTube, from the server, without an API key.
 *
 * **Why not the Data API.** `search.list` costs 100 quota units and the free daily
 * allowance is 10,000 — a hundred searches a day for the whole site, after which
 * every visitor gets an error. For a page whose entire purpose is "type a song and
 * hear it", that ceiling is the feature breaking. A key would also have to live
 * somewhere: in the bundle it is published to everyone who opens the page, and in an
 * env var it still runs out at a hundred.
 *
 * **So this reads the search page.** YouTube's results page carries its own data as
 * a JSON blob (`ytInitialData`) in a script tag; this walks it. No key, no quota, no
 * secret to leak. The trade is fragility: it is YouTube's private shape and they can
 * change it whenever they like.
 *
 * That trade is made survivable rather than ignored:
 *   · every step of the walk is optional-chained, so a shape change yields zero
 *     results instead of a 500
 *   · `parseSearchHtml` is pure and tested against a synthetic blob, so the walk can
 *     be re-pointed without a live request
 *   · the route caches on Vercel's CDN, so a popular query hits YouTube once
 *   · the UI treats an empty result as "nothing found", which is also what a broken
 *     parse looks like — the playlist and the paste-a-link box keep working either way
 */

export type SearchHit = {
  youtubeId: string;
  title: string;
  channel: string;
  /** As YouTube prints it, e.g. "3:15". Absent on a live stream. */
  length: string | null;
};

/** Shape of the fragment of `ytInitialData` this walk cares about. */
type Renderer = {
  videoId?: string;
  title?: { runs?: { text?: string }[] };
  ownerText?: { runs?: { text?: string }[] };
  longBylineText?: { runs?: { text?: string }[] };
  lengthText?: { simpleText?: string };
};

const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The video results inside a YouTube search page's `ytInitialData`.
 *
 * Pure: hand it a string, get hits back. Never throws — a shape it does not
 * recognise is an empty list, which the caller already has to handle.
 */
export function parseSearchHtml(html: string, limit = 20): SearchHit[] {
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!match?.[1]) return [];

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const sections =
    (
      data as {
        contents?: {
          twoColumnSearchResultsRenderer?: {
            primaryContents?: { sectionListRenderer?: { contents?: unknown[] } };
          };
        };
      }
    ).contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];

  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  for (const section of sections) {
    const items =
      (section as { itemSectionRenderer?: { contents?: unknown[] } }).itemSectionRenderer
        ?.contents ?? [];

    for (const item of items) {
      const video = (item as { videoRenderer?: Renderer }).videoRenderer;
      const youtubeId = video?.videoId;
      if (!youtubeId || !ID.test(youtubeId) || seen.has(youtubeId)) continue;

      const title = video?.title?.runs?.[0]?.text?.trim();
      if (!title) continue;

      seen.add(youtubeId);
      hits.push({
        youtubeId,
        title,
        channel:
          video?.ownerText?.runs?.[0]?.text?.trim() ??
          video?.longBylineText?.runs?.[0]?.text?.trim() ??
          "YouTube",
        // No `lengthText` means a live stream or a premiere — worth showing as such
        // rather than pretending a duration.
        length: video?.lengthText?.simpleText?.trim() ?? null,
      });

      if (hits.length >= limit) return hits;
    }
  }

  return hits;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

/**
 * Runs the search. Server-side only — the results page does not answer
 * cross-origin, which is the whole reason there is a route handler at all.
 */
export async function searchYouTube(query: string, limit = 20): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (trimmed === "") return [];

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
  const response = await fetch(url, {
    headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return [];

  return parseSearchHtml(await response.text(), limit);
}
