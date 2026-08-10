#!/usr/bin/env tsx
/**
 * `npm run fonts`
 *
 * Downloads the two faces the share card is set in into `art/fonts/`.
 *
 * The page itself gets its fonts through `next/font/google`, which is a build-time
 * fetch and a self-host — nothing to do there. The card is different: it is
 * rasterised by sharp, which renders SVG through librsvg, which resolves
 * `font-family` through fontconfig, which only sees fonts installed on the
 * machine. Pointing fontconfig at a copy in the repo is what keeps the card's
 * Malayalam identical on a Mac and on a Linux CI box — and keeps the Malayalam
 * real type rather than anything an image model drew.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
export const FONT_DIR = join(ROOT, "art/fonts");

/**
 * The static TTFs, straight off Google's CDN.
 *
 * These URLs are the `src` values inside the family's CSS. They are versioned and
 * do change, so this script re-fetches rather than assuming; if one 404s, open the
 * `css2` URL in the comment and take the new one.
 */
const FONTS: { file: string; url: string; note: string }[] = [
  {
    file: "BalooChettan2-ExtraBold.ttf",
    // https://fonts.googleapis.com/css2?family=Baloo+Chettan+2:wght@800
    url: "https://fonts.gstatic.com/s/baloochettan2/v23/vm8hdRbmXEva26PK-NtuX4ynWEzF69-L4gqgkIL5CWKUO1o.ttf",
    note: "display face — the lockup",
  },
  {
    file: "AnekMalayalam-SemiBold.ttf",
    // https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@600
    url: "https://fonts.gstatic.com/s/anekmalayalam/v18/6qLjKZActRTs_mZAJUZWWkhke0nYa_vC8_Azq3-gP1SReZeOtqQuDVUTUUW5HMo.ttf",
    note: "text face — the strap line",
  },
];

async function main() {
  await mkdir(FONT_DIR, { recursive: true });

  for (const { file, url, note } of FONTS) {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) {
      console.error(`✗ ${file}: HTTP ${response.status} from ${url}`);
      process.exit(1);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(join(FONT_DIR, file), bytes);
    console.log(`✓ ${file.padEnd(32)} ${(bytes.byteLength / 1024).toFixed(0).padStart(4)} KB  ${note}`);
  }

  console.log(`\nfonts in ${FONT_DIR}\n`);
}

await main();
