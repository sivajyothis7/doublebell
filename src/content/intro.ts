/**
 * The signature tune.
 *
 * One local audio file that opens every visit, before the YouTube playlist starts —
 * the way a bus starts moving before anyone picks a song. Unlike everything else on
 * this page it is served from our own origin, because it is ours to serve.
 *
 * To change it: drop a new file at `public/audio/`, point `src` at it, and rename it
 * here. Nothing else reads these values.
 */
export const intro = {
  /** Served from `public/`, so this is a plain path and not a YouTube id. */
  src: "/audio/intro.m4a",
  title: "Double Bell",
  titleMl: "ഡബിൾ ബെൽ",
  /** Shown where a track would show its film. */
  note: "Signature tune",
} as const;
