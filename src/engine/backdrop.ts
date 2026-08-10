/**
 * Resolves which of the four painted plates to serve. The matrix is
 * period × orientation; the encoding lives in `scripts/build-art.ts` and the
 * filenames here are the contract between that script and the renderer.
 */

import type { Period } from "./period";

export type Orientation = "landscape" | "portrait";
export type BackdropSize = "full" | "half";
/**
 * WebP and JPEG. AVIF was in here and came out again.
 *
 * These plates are flat vector art, not photographs, so they were already tiny:
 * AVIF saved about 7 KB on a 26 KB file. Against that, a third format is a third
 * `<source>` in the `<picture>`, eight more files in the repo, and one more thing
 * to be wrong about per browser. WebP is supported everywhere that can run the
 * rest of this page, and the JPEG is the floor.
 */
export type BackdropFormat = "webp" | "jpg";

export const BACKDROP_FORMATS: readonly BackdropFormat[] = ["webp", "jpg"];
export const BACKDROP_SIZES: readonly BackdropSize[] = ["full", "half"];

export const BACKDROP_VARIANTS: readonly { period: Period; orientation: Orientation }[] = [
  { period: "morning", orientation: "landscape" },
  { period: "morning", orientation: "portrait" },
  { period: "night", orientation: "landscape" },
  { period: "night", orientation: "portrait" },
];

/** e.g. `bg-night-portrait-half.avif` */
export function backdropFile(
  period: Period,
  orientation: Orientation,
  size: BackdropSize,
  format: BackdropFormat,
): string {
  return `bg-${period}-${orientation}-${size}.${format}`;
}

export function backdropUrl(
  period: Period,
  orientation: Orientation,
  size: BackdropSize,
  format: BackdropFormat,
  base = "/assets",
): string {
  return `${base}/${backdropFile(period, orientation, size, format)}`;
}

/** Source name of the authored SVG plate, keyed the same way. */
export function backdropSourceName(period: Period, orientation: Orientation): string {
  return `bg-${period}-${orientation}`;
}
