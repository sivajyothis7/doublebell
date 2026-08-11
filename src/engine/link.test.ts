import { describe, expect, it } from "vitest";
import { cleanUploadTitle, looksLikeLink, parseYoutubeId, youtubeSearchUrl } from "./link";

const ID = "aceDEQpRnZE";

describe("parseYoutubeId", () => {
  it("takes a bare ID", () => {
    expect(parseYoutubeId(ID)).toBe(ID);
    expect(parseYoutubeId(`  ${ID}  `)).toBe(ID);
  });

  it("reads every link shape people actually paste", () => {
    const cases = [
      `https://www.youtube.com/watch?v=${ID}`,
      `http://youtube.com/watch?v=${ID}`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://music.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube.com/live/${ID}`,
      `https://www.youtube-nocookie.com/embed/${ID}`,
      // no scheme, which is what a copy out of a chat message looks like
      `youtu.be/${ID}`,
      `www.youtube.com/watch?v=${ID}`,
    ];
    for (const input of cases) expect(parseYoutubeId(input), input).toBe(ID);
  });

  it("survives the junk that rides along on a shared link", () => {
    const cases = [
      `https://www.youtube.com/watch?v=${ID}&t=90s`,
      `https://youtu.be/${ID}?si=AbCdEf12345`,
      `https://youtu.be/${ID}?t=42`,
      // `v` is not always the first parameter
      `https://www.youtube.com/watch?app=desktop&feature=share&v=${ID}`,
      `https://www.youtube.com/watch?v=${ID}&list=PLabcdef&index=3`,
      `https://www.youtube.com/shorts/${ID}?feature=share`,
    ];
    for (const input of cases) expect(parseYoutubeId(input), input).toBe(ID);
  });

  it("refuses anything that is not a YouTube video", () => {
    const cases = [
      "",
      "   ",
      "not a link",
      "https://vimeo.com/123456",
      // Right host, no video: a channel, a playlist, a search.
      "https://www.youtube.com/@somechannel",
      "https://www.youtube.com/playlist?list=PLabcdef",
      "https://www.youtube.com/results?search_query=bus+hits+malayalam",
      // Right shape, wrong length — this is the one that would become player
      // error 2 if the ID check were lenient.
      "https://www.youtube.com/watch?v=tooshort",
      "https://youtu.be/waytoolongtobeanid",
      "https://evil.example.com/watch?v=aceDEQpRnZE",
    ];
    for (const input of cases) expect(parseYoutubeId(input), input).toBeNull();
  });

  it("is not fooled by a youtube-lookalike host", () => {
    expect(parseYoutubeId(`https://notyoutube.com/watch?v=${ID}`)).toBeNull();
    expect(parseYoutubeId(`https://youtube.com.evil.test/watch?v=${ID}`)).toBeNull();
  });
});

describe("looksLikeLink", () => {
  it("recognises an attempt at a link, so the UI can offer to play it", () => {
    expect(looksLikeLink(`https://youtu.be/${ID}`)).toBe(true);
    expect(looksLikeLink("youtube.com/watch?v=nope")).toBe(true);
    expect(looksLikeLink(ID)).toBe(true);
  });

  it("leaves an ordinary search alone", () => {
    expect(looksLikeLink("kuttanadan")).toBe(false);
    expect(looksLikeLink("ഖൽബിലെ")).toBe(false);
  });
});

describe("youtubeSearchUrl", () => {
  it("escapes the query", () => {
    expect(youtubeSearchUrl("bus hits malayalam")).toBe(
      "https://www.youtube.com/results?search_query=bus%20hits%20malayalam",
    );
  });

  it("carries Malayalam through", () => {
    expect(youtubeSearchUrl("നാടൻ പാട്ട്")).toContain(encodeURIComponent("നാടൻ പാട്ട്"));
  });

  it("trims", () => {
    expect(youtubeSearchUrl("  yesudas  ")).toBe(
      "https://www.youtube.com/results?search_query=yesudas",
    );
  });
});

describe("cleanUploadTitle", () => {
  it("keeps the song and drops the rest of the search-bait", () => {
    const cases: [string, string][] = [
      [
        "Entammede Jimikki Kammal Video Song | Velipadinte Pusthakam | Mohanlal | Shaan Rahman",
        "Entammede Jimikki Kammal",
      ],
      ["Maanathe Manichithathe | Video Song | Bus Conductor | Mammootty", "Maanathe Manichithathe"],
      ["Kuttanadan Punjayile Audio Song | Kaavalam Chundan | K.J. Yesudas", "Kuttanadan Punjayile"],
      ["Pavizha Mazha | Athiran | Video | Fahad Faasil", "Pavizha Mazha"],
      ["Dooreyo - 4K Video Song | Aanandam | Vineeth Sreenivasan", "Dooreyo"],
      ["Malare Official Lyrical Video | Premam", "Malare"],
      ["Thumbi Vaa (Original) HD | Olangal", "Thumbi Vaa"],
    ];
    for (const [raw, want] of cases) expect(cleanUploadTitle(raw), raw).toBe(want);
  });

  it("carries Malayalam through untouched", () => {
    expect(cleanUploadTitle("മാനത്തെ മണിച്ചിത്തത്തേ Video Song | Bus Conductor")).toBe(
      "മാനത്തെ മണിച്ചിത്തത്തേ",
    );
  });

  it("leaves a title that is already clean alone", () => {
    expect(cleanUploadTitle("Melooru Shaappilu")).toBe("Melooru Shaappilu");
    expect(cleanUploadTitle("ഡബിൾ ബെൽ")).toBe("ഡബിൾ ബെൽ");
  });

  it("returns the original rather than nothing when stripping would empty it", () => {
    // A title that is *only* descriptors: better long than blank.
    expect(cleanUploadTitle("Official Video Song HD")).toBe("Official Video Song HD");
    expect(cleanUploadTitle("| | |")).toBe("| | |");
  });
});
