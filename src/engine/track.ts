/**
 * The track model. Content-as-code: every field is authored by hand in
 * `src/content/tracks.ts` and reviewed in a commit. Nothing here touches the
 * network.
 */

export type Era = "80s" | "90s" | "2000s" | "2010s";

/**
 * What kind of song it is, in the terms a Kerala bus actually sorts them into:
 *
 * · `mass`    — the back-seat song. Tempo, dance, the one the driver turns up.
 * · `melody`  — the long-route song, for the stretch after the last town.
 * · `nadan`   — നാടൻ പാട്ട്. Folk, toddy-shop, Kalabhavan Mani territory.
 * · `mappila` — മാപ്പിളപ്പാട്ട്. Malabar's own metre; its own bus route too.
 */
export type Vibe = "mass" | "melody" | "nadan" | "mappila";

export type Track = {
  /** 11-char YouTube video ID. Also keys cover art at i.ytimg.com/vi/{id}/… */
  youtubeId: string;
  /** Latin transliteration of the song title. */
  title: string;
  /** മലയാളം title — required. Half the emotional payload of the page. */
  titleMl: string;
  /** Film, or the album for a nadan / mappila track that never had one. */
  movie: string;
  /**
   * Release year — optional, and that is not laziness.
   *
   * Every film song has one. The nadan and mappila albums do not: Kalabhavan
   * Mani's folk records are the spine of this playlist and no public source
   * agrees on when any individual one came out, so those tracks carry an `era`
   * and no year rather than a confident invention. The UI shows the year when
   * there is one and the era when there is not.
   */
  year?: number;
  composer: string;
  /**
   * Required, unlike the reference product's model. A Malayali names the singer
   * before the composer — "Yesudas paattu", "Manichettan paattu" — so leaving
   * it optional would lose the field people actually search by.
   */
  singer: string;
  vibe: Vibe;
  /**
   * Set on a guest track — one found through the in-site YouTube search or pasted as
   * a link — and never on an authored one. It exists so the UI can label it honestly
   * ("from YouTube") and pull cover art from ytimg instead of `/covers`, where no
   * file was ever baked for it. `validateTracks` is a build-time check over the
   * authored list, which guests never join, so nothing has to be relaxed for them.
   */
  adhoc?: true;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function isValidYoutubeId(id: string): boolean {
  return YOUTUBE_ID.test(id);
}

/** Malayalam Unicode block: U+0D00–U+0D7F. */
const MALAYALAM_RANGE = /[ഀ-ൿ]/;

export function containsMalayalam(value: string): boolean {
  return MALAYALAM_RANGE.test(value);
}

/**
 * The decade bucket for a release year.
 *
 * Derived, never authored: an `era` field next to `year` would be a second
 * source of truth for the same fact, and for the undated folk albums it would be
 * an invention. Undated tracks simply have no era.
 */
export function eraForYear(year: number): Era {
  if (year < 1990) return "80s";
  if (year < 2000) return "90s";
  if (year < 2010) return "2000s";
  return "2010s";
}

/**
 * Era scope. The floor is 1980 because the Ilaiyaraaja- and Johnson-era songs
 * that opened those routes never stopped playing on them; the ceiling is 2019
 * because that is where the sound this page is about ends — after it, the bus
 * speaker is a Bluetooth speaker and the song is whatever is trending.
 */
export const EARLIEST_YEAR = 1980;
export const LATEST_YEAR = 2019;

export type TrackProblem = {
  index: number;
  youtubeId: string;
  field: string;
  message: string;
};

/**
 * Structural validation of an authored track list. Pure — no network, so this
 * runs in unit tests and in `check-tracks` before the oEmbed pass.
 */
export function validateTracks(tracks: readonly Track[]): TrackProblem[] {
  const problems: TrackProblem[] = [];
  const seen = new Map<string, number>();

  tracks.forEach((track, index) => {
    const at = (field: string, message: string) => {
      problems.push({ index, youtubeId: track.youtubeId, field, message });
    };

    if (!isValidYoutubeId(track.youtubeId)) {
      at("youtubeId", `"${track.youtubeId}" is not an 11-char YouTube video ID`);
    }

    const duplicateOf = seen.get(track.youtubeId);
    if (duplicateOf !== undefined) at("youtubeId", `duplicate of track at index ${duplicateOf}`);
    else seen.set(track.youtubeId, index);

    if (track.title.trim() === "") at("title", "missing");
    if (track.titleMl.trim() === "") at("titleMl", "missing Malayalam title");
    else if (!containsMalayalam(track.titleMl)) {
      at("titleMl", `"${track.titleMl}" contains no Malayalam script`);
    }
    if (track.movie.trim() === "") at("movie", "missing");
    if (track.composer.trim() === "") at("composer", "missing");
    if (track.singer.trim() === "") at("singer", "missing");

    if (
      track.year !== undefined &&
      (!Number.isInteger(track.year) || track.year < EARLIEST_YEAR || track.year > LATEST_YEAR)
    ) {
      at("year", `${track.year} is outside the ${EARLIEST_YEAR}–${LATEST_YEAR} era scope`);
    }
  });

  return problems;
}
