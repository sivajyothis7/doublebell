#!/usr/bin/env tsx
/**
 * `npm run art`
 *
 * Rasterises the four painted plates from `scripts/art/scene.ts` into the matrix
 * the page actually serves: {full, half} × {avif, webp, jpg} per plate, in
 * `public/assets`.
 *
 * The source is code rather than a file, so there is nothing to keep in sync and
 * nothing large in the repo — the whole `public/assets` folder is reproducible
 * from `npm run art`. Quality is tuned down until the largest served variant
 * fits the budget below; these sit behind a scrim and can take the compression.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { BACKDROP_VARIANTS, backdropFile } from "../src/engine/backdrop";
import { sceneSvg } from "./art/scene";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const OUT_DIR = join(ROOT, "public/assets");
/** The plates are also written out as SVG, so a change can be diffed and eyeballed. */
const SVG_DIR = join(ROOT, "art");

/** Long edge in px. Half is what phones and mid-DPI laptops actually get. */
const SIZES = { full: 2560, half: 1280 } as const;

const QUALITY = {
  webp: { full: 72, half: 78 },
  jpg: { full: 76, half: 82 },
} as const;

/**
 * 350 KB for the largest variant. Flat vector art compresses far better than a
 * photograph would, so this is a ceiling the plates never come near — it is here
 * to catch a future change that quietly adds a gradient mesh.
 */
const BUDGET_BYTES = 350 * 1024;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(SVG_DIR, { recursive: true });

  const rows: { file: string; kb: number }[] = [];

  for (const { period, orientation } of BACKDROP_VARIANTS) {
    const svg = sceneSvg({ period, orientation });
    await writeFile(join(SVG_DIR, `bg-${period}-${orientation}.svg`), svg);
    console.log(`\nbg-${period}-${orientation}  (${(svg.length / 1024).toFixed(0)} KB of SVG)`);

    for (const size of ["full", "half"] as const) {
      const longEdge = SIZES[size];
      // The plate is authored 16:9 or 9:16, so the long edge is the width in
      // landscape and the height in portrait.
      const resize =
        orientation === "portrait" ? { height: longEdge } : { width: longEdge };

      for (const format of ["webp", "jpg"] as const) {
        // Re-rendered per size rather than resized once: rasterising the vector
        // at the target size keeps the palm fronds and the lane markings crisp,
        // where downsampling a 2560px bitmap would soften them.
        const pipeline = sharp(Buffer.from(svg), { density: 96 }).resize({
          ...resize,
          fit: "inside",
        });

        const buffer =
          format === "webp"
            ? await pipeline.webp({ quality: QUALITY.webp[size], effort: 5 }).toBuffer()
            : await pipeline
                .jpeg({ quality: QUALITY.jpg[size], mozjpeg: true, progressive: true })
                .toBuffer();

        const name = backdropFile(period, orientation, size, format);
        await writeFile(join(OUT_DIR, name), buffer);
        const kb = buffer.byteLength / 1024;
        rows.push({ file: name, kb });
        console.log(
          `  ${name.padEnd(34)} ${kb.toFixed(0).padStart(5)} KB` +
            (buffer.byteLength > BUDGET_BYTES ? "  ✗ over budget" : ""),
        );
      }
    }
  }

  const over = rows.filter((row) => row.kb * 1024 > BUDGET_BYTES);
  if (over.length > 0) {
    console.error(
      `\n✗ ${over.length} variant(s) over the ${BUDGET_BYTES / 1024} KB budget — lower QUALITY in this script\n`,
    );
    process.exit(1);
  }

  const total = rows.reduce((sum, row) => sum + row.kb, 0);
  console.log(
    `\n✓ ${rows.length} variants, ${(total / 1024).toFixed(1)} MB on disk, ` +
      `largest ${Math.max(...rows.map((row) => row.kb)).toFixed(0)} KB\n`,
  );
}

await main();
