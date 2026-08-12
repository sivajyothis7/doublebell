import { describe, expect, it } from "vitest";
import { makeTrack } from "./fixtures";
import {
  containsMalayalam,
  EARLIEST_YEAR,
  eraForYear,
  isValidYoutubeId,
  LATEST_YEAR,
  validateTracks,
} from "./track";

describe("isValidYoutubeId", () => {
  it("accepts an 11-char id with the full alphabet", () => {
    expect(isValidYoutubeId("L-kKWXZ5wwc")).toBe(true);
    expect(isValidYoutubeId("aB3_-9xyzQw")).toBe(true);
  });

  it("rejects wrong lengths and stray characters", () => {
    expect(isValidYoutubeId("short")).toBe(false);
    expect(isValidYoutubeId("twelvechars1")).toBe(false);
    expect(isValidYoutubeId("has spaces1")).toBe(false);
    expect(isValidYoutubeId("")).toBe(false);
  });
});

describe("containsMalayalam", () => {
  it("sees Malayalam script", () => {
    expect(containsMalayalam("ഡബിൾ ബെൽ")).toBe(true);
    expect(containsMalayalam("Ente ഖൽബിലെ")).toBe(true);
  });

  it("does not mistake other Indic scripts for it", () => {
    // Tamil and Devanagari sit either side of the Malayalam block; a range that
    // was one codepoint out would pass one of these.
    expect(containsMalayalam("டவுன் பஸ்")).toBe(false);
    expect(containsMalayalam("नमस्ते")).toBe(false);
    expect(containsMalayalam("Double Bell")).toBe(false);
  });
});

describe("eraForYear", () => {
  it("buckets on the decade boundaries", () => {
    expect(eraForYear(1984)).toBe("80s");
    expect(eraForYear(1989)).toBe("80s");
    expect(eraForYear(1990)).toBe("90s");
    expect(eraForYear(1999)).toBe("90s");
    expect(eraForYear(2000)).toBe("2000s");
    expect(eraForYear(2009)).toBe("2000s");
    expect(eraForYear(2010)).toBe("2010s");
    expect(eraForYear(2019)).toBe("2010s");
  });
});

describe("validateTracks", () => {
  it("passes a well-formed list", () => {
    expect(validateTracks([makeTrack({ youtubeId: "aaaaaaaaaa1" })])).toEqual([]);
  });

  it("flags a bad id", () => {
    const problems = validateTracks([makeTrack({ youtubeId: "nope" })]);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.field).toBe("youtubeId");
  });

  it("flags duplicates and names the first index", () => {
    const problems = validateTracks([
      makeTrack({ youtubeId: "aaaaaaaaaa1" }),
      makeTrack({ youtubeId: "aaaaaaaaaa1" }),
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.index).toBe(1);
    expect(problems[0]?.message).toContain("index 0");
  });

  it("requires a Malayalam title in Malayalam script", () => {
    const blank = validateTracks([makeTrack({ youtubeId: "aaaaaaaaaa1", titleMl: "   " })]);
    expect(blank[0]?.field).toBe("titleMl");

    const latin = validateTracks([makeTrack({ youtubeId: "aaaaaaaaaa1", titleMl: "Ente Khalbile" })]);
    expect(latin[0]?.field).toBe("titleMl");
    expect(latin[0]?.message).toContain("no Malayalam script");
  });

  it("requires a singer — the field Malayalis actually search by", () => {
    const problems = validateTracks([makeTrack({ youtubeId: "aaaaaaaaaa1", singer: "" })]);
    expect(problems.map((problem) => problem.field)).toContain("singer");
  });

  it("rejects years outside the era scope", () => {
    for (const year of [EARLIEST_YEAR - 1, LATEST_YEAR + 1]) {
      const problems = validateTracks([makeTrack({ youtubeId: "aaaaaaaaaa1", year })]);
      expect(problems[0]?.field).toBe("year");
    }
  });

  it("accepts an undated track — the folk albums genuinely have no release year", () => {
    const problems = validateTracks([makeTrack({ youtubeId: "aaaaaaaaaa1", year: undefined })]);
    expect(problems).toEqual([]);
  });

  it("still rejects a year that is present and out of scope", () => {
    // Asserted against the constants, not against literals: the scope is a sanity
    // check that has moved before and will move again, and a test that hardcodes it
    // fails for the wrong reason every time it does.
    for (const year of [EARLIEST_YEAR - 1, LATEST_YEAR + 1]) {
      const problems = validateTracks([makeTrack({ youtubeId: "aaaaaaaaaa1", year })]);
      expect(problems[0]?.field).toBe("year");
    }
  });

  it("accepts a track with no composer or singer credited", () => {
    // Both were required once. That did not improve the data, it only ever dropped
    // songs whose credits are not written down anywhere findable.
    const bare = makeTrack({ youtubeId: "aaaaaaaaaa1" });
    delete (bare as { composer?: string }).composer;
    delete (bare as { singer?: string }).singer;
    expect(validateTracks([bare])).toEqual([]);
  });

  it("still rejects a credit that is present but blank", () => {
    const blank = validateTracks([makeTrack({ youtubeId: "aaaaaaaaaa1", singer: "  " })]);
    expect(blank[0]?.field).toBe("singer");
  });
});
