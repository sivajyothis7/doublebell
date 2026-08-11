import { describe, expect, it } from "vitest";
import { parseSearchHtml } from "./search";

/**
 * A synthetic `ytInitialData`, not a captured page. A real results page is 1.2 MB
 * and would be stale within the month; what needs testing is the walk and its
 * guards, and those are exercised better by a blob whose awkward cases are
 * deliberate.
 */
function page(data: unknown): string {
  return `<html><head><script>var ytInitialData = ${JSON.stringify(data)};</script></head></html>`;
}

const video = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  videoRenderer: {
    videoId: id,
    title: { runs: [{ text: title }] },
    ownerText: { runs: [{ text: "Sony Music Malayalam" }] },
    lengthText: { simpleText: "3:15" },
    ...extra,
  },
});

const results = (items: unknown[]) => ({
  contents: {
    twoColumnSearchResultsRenderer: {
      primaryContents: { sectionListRenderer: { contents: [{ itemSectionRenderer: { contents: items } }] } },
    },
  },
});

describe("parseSearchHtml", () => {
  it("reads the video results", () => {
    const hits = parseSearchHtml(
      page(results([video("FXiaIH49oAU", "Entammede Jimikki Kammal Video Song")])),
    );
    expect(hits).toEqual([
      {
        youtubeId: "FXiaIH49oAU",
        title: "Entammede Jimikki Kammal Video Song",
        channel: "Sony Music Malayalam",
        length: "3:15",
      },
    ]);
  });

  it("skips the ads, shelves and channel rows mixed in with them", () => {
    const hits = parseSearchHtml(
      page(
        results([
          { adSlotRenderer: { some: "ad" } },
          { channelRenderer: { channelId: "UC123" } },
          { shelfRenderer: { title: "People also watched" } },
          video("aceDEQpRnZE", "Maanathe Manichithathe"),
          { reelShelfRenderer: {} },
        ]),
      ),
    );
    expect(hits.map((h) => h.youtubeId)).toEqual(["aceDEQpRnZE"]);
  });

  it("de-duplicates, because YouTube repeats a video across sections", () => {
    const hits = parseSearchHtml(
      page(results([video("aceDEQpRnZE", "One"), video("aceDEQpRnZE", "One again")])),
    );
    expect(hits).toHaveLength(1);
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      video(`vid${String(i).padStart(8, "0")}`, `Song ${i}`),
    );
    expect(parseSearchHtml(page(results(many)), 5)).toHaveLength(5);
  });

  it("keeps a live stream, with no duration rather than a fake one", () => {
    const [hit] = parseSearchHtml(
      page(results([video("liveliveliv", "Live now", { lengthText: undefined })])),
    );
    expect(hit?.length).toBeNull();
  });

  it("falls back to the byline when ownerText is missing", () => {
    const [hit] = parseSearchHtml(
      page(
        results([
          video("aceDEQpRnZE", "Song", {
            ownerText: undefined,
            longBylineText: { runs: [{ text: "East Coast" }] },
          }),
        ]),
      ),
    );
    expect(hit?.channel).toBe("East Coast");
  });

  it("drops a row with no title or a malformed id rather than shipping a bad one", () => {
    const hits = parseSearchHtml(
      page(
        results([
          video("tooshort", "Bad id"),
          video("aceDEQpRnZE", ""),
          { videoRenderer: { videoId: "aceDEQpRnZE" } },
          video("goodgoodgo1", "Fine"),
        ]),
      ),
    );
    expect(hits.map((h) => h.youtubeId)).toEqual(["goodgoodgo1"]);
  });

  /*
   * The point of the guards: YouTube owns this shape and will change it. Every one
   * of these is an empty list, never an exception, because the caller's failure mode
   * has to stay "nothing found".
   */
  it("returns nothing instead of throwing when the shape is not what it was", () => {
    const cases = [
      "",
      "<html>no data here</html>",
      page({}),
      page({ contents: {} }),
      page({ contents: { twoColumnSearchResultsRenderer: {} } }),
      page(results([])),
      // A blob that is not JSON at all.
      "<script>var ytInitialData = {not json};</script>",
      // The renamed-key case, which is what an actual redesign looks like.
      page({ contents: { threeColumnSearchResultsRenderer: { stuff: [] } } }),
    ];
    for (const html of cases) {
      expect(() => parseSearchHtml(html)).not.toThrow();
      expect(parseSearchHtml(html), html.slice(0, 40)).toEqual([]);
    }
  });
});
