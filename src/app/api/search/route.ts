import { searchYouTube } from "@/adapters/youtube";

/**
 * `GET /api/search?q=…` — YouTube search, run on the server.
 *
 * This route is the reason the site is no longer a pure static export. It exists
 * because the results page does not answer cross-origin, so the search cannot happen
 * in the browser, and because doing it with YouTube's Data API would cap the whole
 * site at a hundred searches a day (see `adapters/youtube/search.ts`).
 *
 * Node runtime, not edge: the parse walks a 1 MB JSON blob, which wants a real heap
 * more than it wants to be close to the user.
 */
export const runtime = "nodejs";

/** Longest query worth honouring. Anything past this is not a song title. */
const MAX_QUERY = 120;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.slice(0, MAX_QUERY).trim() ?? "";

  if (query === "") {
    return Response.json({ query, results: [] }, { headers: { "cache-control": "no-store" } });
  }

  try {
    const results = await searchYouTube(query);
    return Response.json(
      { query, results },
      {
        headers: {
          /*
           * Cached at the edge, keyed by the query string: the same search runs
           * against YouTube once an hour however many people type it, and a stale
           * answer keeps being served for a day while a fresh one is fetched. Both
           * halves matter — the first is politeness, the second is what keeps the box
           * responsive when YouTube is slow.
           */
          "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    /*
     * 200 with an empty list, not a 5xx. A failed search and a search with no matches
     * look identical to the person typing, and the UI already handles the empty case;
     * an error status would only add a console error and a retry loop to a page whose
     * playlist is still working perfectly.
     */
    return Response.json(
      { query, results: [], degraded: true },
      { headers: { "cache-control": "no-store" } },
    );
  }
}
