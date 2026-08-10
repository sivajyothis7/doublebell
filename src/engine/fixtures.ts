/**
 * Test fixtures. Deliberately synthetic — the engine has to be provable without
 * reaching for the real playlist, which changes with every curation commit.
 */

import type { Track } from "./track";

export function makeTrack(overrides: Partial<Track> & { youtubeId: string }): Track {
  return {
    title: "Test Paattu",
    titleMl: "ടെസ്റ്റ് പാട്ട്",
    movie: "Test Cinema",
    year: 1995,
    composer: "Johnson",
    singer: "K. J. Yesudas",
    vibe: "mass",
    ...overrides,
  };
}

/** Six tracks with IDs `aaaaaaaaaa0`…`aaaaaaaaaa5` — 11 chars, so they validate. */
export const FIXTURE_TRACKS: readonly Track[] = Array.from({ length: 6 }, (_, i) =>
  makeTrack({ youtubeId: `aaaaaaaaaa${i}`, title: `Track ${i}` }),
);
