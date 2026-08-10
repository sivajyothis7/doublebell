#!/usr/bin/env tsx
/**
 * `npm run og`
 *
 * Composes the 1200×630 share card: the night plate, art-directed for the crop it
 * actually appears in, with the lockup laid over the darkened left half.
 *
 * The Malayalam here is real type rendered by librsvg through sharp. It is never
 * an image model's idea of Malayalam — those mangle the conjuncts and the vowel
 * signs, and a share card is the one image most people see before they see the
 * site.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { site } from "../src/lib/site";
import { ogSvg } from "./art/scene";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const FONT_DIR = join(ROOT, "art/fonts");
const OUT = join(ROOT, "public/assets/og.jpg");

const WIDTH = 1200;
const HEIGHT = 630;

/** Facebook, X and WhatsApp all re-encode above roughly 300 KB; stay under it. */
const BUDGET_BYTES = 300 * 1024;

/**
 * librsvg resolves `font-family` through fontconfig, which only sees fonts
 * installed on the machine. Pointing it at the repo's own copies (`npm run fonts`)
 * is what makes the card render the same here and on a CI box.
 */
async function registerRepoFonts() {
  const configDir = join(tmpdir(), "doublebell-fontconfig");
  await mkdir(configDir, { recursive: true });
  await writeFile(
    join(configDir, "fonts.conf"),
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>${FONT_DIR}</dir>
  <dir>/System/Library/Fonts</dir>
  <dir>/usr/share/fonts</dir>
  <cachedir>${join(configDir, "cache")}</cachedir>
</fontconfig>`,
  );
  process.env.FONTCONFIG_FILE = join(configDir, "fonts.conf");
  process.env.FONTCONFIG_PATH = configDir;
}

await registerRepoFonts();

// Imported after fontconfig is pointed at the repo fonts — sharp initialises
// librsvg, and its font set, on first load.
const sharp = (await import("sharp")).default;

/**
 * `paint-order: stroke` draws the outline *behind* the fill, so the stroke reads as
 * a dark keyline hugging the glyphs instead of eating into them. That is what keeps
 * the lockup legible at the thumbnail size a feed actually shows.
 */
const overlay = Buffer.from(
  `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .ml { font-family: "Baloo Chettan 2"; font-weight: 800; font-size: 132px; fill: #f8f4e8;
          paint-order: stroke; stroke: #7a1f1a; stroke-width: 7px; stroke-linejoin: round; }
    .la { font-family: "Anek Malayalam"; font-weight: 600; font-size: 30px; fill: #e8b04a;
          letter-spacing: 11px;
          paint-order: stroke; stroke: #08111c; stroke-width: 4px; stroke-linejoin: round; }
    .strap { font-family: "Anek Malayalam"; font-weight: 600; font-size: 26px; fill: #cfd8e4;
             paint-order: stroke; stroke: #08111c; stroke-width: 4px; stroke-linejoin: round; }
  </style>
  <text x="72" y="300" class="ml">${site.titleMl}</text>
  <text x="76" y="356" class="la">${site.titleLatin.toUpperCase()}</text>
  <text x="74" y="418" class="strap">${site.tagline} · ${site.trackCount} songs</text>
</svg>`,
);

async function main() {
  await mkdir(dirname(OUT), { recursive: true });

  const plate = await sharp(Buffer.from(ogSvg()), { density: 96 })
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
    .toBuffer();

  const buffer = await sharp(plate)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 84, mozjpeg: true, progressive: true })
    .toBuffer();

  await writeFile(OUT, buffer);

  const kb = buffer.byteLength / 1024;
  console.log(`\nog.jpg  ${kb.toFixed(0)} KB`);

  if (buffer.byteLength > BUDGET_BYTES) {
    console.error(`\n✗ over the ${BUDGET_BYTES / 1024} KB budget — lower the JPEG quality\n`);
    process.exit(1);
  }

  console.log(`✓ share card written to public/assets/og.jpg\n`);
}

await main();
