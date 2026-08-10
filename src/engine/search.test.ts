import { describe, expect, it } from "vitest";
import { makeTrack } from "./fixtures";
import { normalize, searchTracks } from "./search";

const TRACKS = [
  makeTrack({
    youtubeId: "aaaaaaaaaa0",
    title: "Ente Khalbile",
    titleMl: "എന്റെ ഖൽബിലെ",
    movie: "Classmates",
    year: 2006,
    composer: "Alex Paul",
    singer: "Vineeth Sreenivasan",
    vibe: "mass",
  }),
  makeTrack({
    youtubeId: "aaaaaaaaaa1",
    title: "Karutha Penne",
    titleMl: "കറുത്ത പെണ്ണെ",
    movie: "Thenmavin Kombath",
    year: 1994,
    composer: "Vidyasagar",
    singer: "M. G. Sreekumar",
    vibe: "nadan",
  }),
  makeTrack({
    youtubeId: "aaaaaaaaaa2",
    title: "Pattu Padi Urakkam Njan",
    titleMl: "പാട്ടു പാടി ഉറക്കാം ഞാൻ",
    movie: "Thenmavin Kombath",
    year: 1994,
    composer: "Vidyasagar",
    singer: "K. J. Yesudas",
    vibe: "melody",
  }),
];

describe("normalize", () => {
  it("drops case, punctuation and spacing", () => {
    expect(normalize("Thenmavin-Kombath")).toBe(normalize("thenmavin kombath"));
    expect(normalize("K. J. Yesudas")).toBe("kjyesudas");
  });

  it("keeps Malayalam vowel signs, which are combining marks not letters", () => {
    // Stripping marks would fold this to ഖലബല and break every Malayalam search.
    expect(normalize("ഖൽബിലെ")).toBe("ഖൽബിലെ");
  });

  it("still removes Latin diacritics", () => {
    expect(normalize("café")).toBe("cafe");
  });
});

describe("searchTracks", () => {
  it("returns everything for an empty query", () => {
    expect(searchTracks(TRACKS, "")).toHaveLength(3);
  });

  it("matches a Latin title and says so", () => {
    const [first] = searchTracks(TRACKS, "khalbile");
    expect(first?.track.youtubeId).toBe("aaaaaaaaaa0");
    expect(first?.matchedOn).toBe("title");
  });

  it("matches Malayalam typed in Malayalam", () => {
    const [first] = searchTracks(TRACKS, "ഖൽബിലെ");
    expect(first?.track.youtubeId).toBe("aaaaaaaaaa0");
    expect(first?.matchedOn).toBe("titleMl");
  });

  it("matches a film and a singer", () => {
    const film = searchTracks(TRACKS, "thenmavin");
    expect(film).toHaveLength(2);
    expect(film[0]?.matchedOn).toBe("movie");

    const singer = searchTracks(TRACKS, "yesudas");
    expect(singer[0]?.track.youtubeId).toBe("aaaaaaaaaa2");
    expect(singer[0]?.matchedOn).toBe("singer");
  });

  it("ranks a title hit above a film or singer hit", () => {
    const results = searchTracks(
      [
        ...TRACKS,
        makeTrack({
          youtubeId: "aaaaaaaaaa3",
          title: "Kombath Vazhiyil",
          titleMl: "കൊമ്പത്ത് വഴിയിൽ",
          movie: "Something Else",
        }),
      ],
      "kombath",
    );
    expect(results[0]?.track.youtubeId).toBe("aaaaaaaaaa3");
    expect(results[0]?.matchedOn).toBe("title");
  });

  it("finds a word in the middle of a title", () => {
    const [first] = searchTracks(TRACKS, "urakkam");
    expect(first?.track.youtubeId).toBe("aaaaaaaaaa2");
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(searchTracks(TRACKS, "qwertyuiop")).toEqual([]);
  });

  it("respects the limit", () => {
    expect(searchTracks(TRACKS, "", 2)).toHaveLength(2);
  });
});
