import { describe, expect, it } from "vitest";
import { COVER_SIZE, coverFile, coverSources, coverUrl, thumbnailUrl, watchUrl } from "./media";
import { backdropFile, backdropSourceName, backdropUrl, BACKDROP_VARIANTS } from "./backdrop";

const ID = "L-kKWXZ5wwc";

describe("thumbnails", () => {
  it("builds the canonical ytimg URL", () => {
    expect(thumbnailUrl(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
    expect(thumbnailUrl(ID, "maxresdefault")).toBe(
      `https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`,
    );
  });

  it("falls back from maxres to hq, not the other way round", () => {
    // hqdefault always exists; maxresdefault only for uploads above 720p, which
    // plenty of 90s Malayalam rips are not.
    const { primary, fallback } = coverSources(ID);
    expect(primary).toContain("maxresdefault");
    expect(fallback).toContain("hqdefault");
  });
});

describe("covers", () => {
  it("keys one WebP per video id", () => {
    expect(coverFile(ID)).toBe(`${ID}.webp`);
    expect(coverUrl(ID)).toBe(`/covers/${ID}.webp`);
  });

  it("is square, and big enough for the disc at 3x", () => {
    expect(COVER_SIZE).toBeGreaterThanOrEqual(192);
  });
});

describe("watchUrl", () => {
  it("points at the video people can go and find", () => {
    expect(watchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });
});

describe("backdrop naming", () => {
  it("is the contract between the encoder and the renderer", () => {
    expect(backdropFile("night", "portrait", "half", "webp")).toBe("bg-night-portrait-half.webp");
    expect(backdropUrl("morning", "landscape", "full", "jpg")).toBe(
      "/assets/bg-morning-landscape-full.jpg",
    );
    expect(backdropSourceName("night", "landscape")).toBe("bg-night-landscape");
  });

  it("covers both periods in both orientations, with no duplicates", () => {
    const keys = BACKDROP_VARIANTS.map((v) => `${v.period}-${v.orientation}`);
    expect(new Set(keys).size).toBe(4);
  });
});
