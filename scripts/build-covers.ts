#!/usr/bin/env tsx
/**
 * `npm run covers`
 *
 * Pulls the thumbnail YouTube already serves for every track and bakes it into
 * one square cover per track at `public/covers/{youtubeId}.webp`.
 *
 * Local rather than hotlinking `i.ytimg.com`, for four reasons:
 *   · one origin, so no third-party connection opens before first paint
 *   · a real square crop instead of a 4:3 thumbnail squeezed into a circle
 *   · one small WebP we control instead of ~30 KB of JPEG we do not
 *   · immune to ytimg URL changes, and cached at the edge with the rest of the site
 *
 * These are the thumbnails for the exact videos the page embeds, fetched once at
 * build time — not scraped artwork.
 *
 * Idempotent and resumable: raw downloads are cached under `.cache/covers/`, so a
 * re-run after adding a few tracks only fetches the new ones.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { tracks } from "../src/content";
import { COVER_SIZE, coverFile } from "../src/engine";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const OUT_DIR = join(ROOT, "public/covers");
const CACHE_DIR = join(ROOT, ".cache/covers");

const CONCURRENCY = 6;

/**
 * Thumbnail qualities, best first. `maxresdefault` is a clean 16:9 frame but only
 * exists for uploads above 720p, which plenty of 80s and 90s Malayalam rips are
 * not. `sddefault` and `hqdefault` always exist but are 4:3 — a 16:9 picture with
 * letterbox bars — so the bars come off before the square crop, or every cover
 * would be a black-banded stripe.
 */
const SOURCES = ["maxresdefault", "sddefault", "hqdefault"] as const;

/**
 * The 16:9 picture inside a thumbnail, derived from the actual dimensions rather
 * than hard-coded per quality — YouTube has changed thumbnail sizes before, and a
 * wrong constant is an `extract` crash at best and a silently mis-cropped cover
 * at worst. Anything already 16:9 or wider comes back untouched.
 */
function innerFrame(width: number, height: number) {
  const target = Math.round((width * 9) / 16);
  if (height <= target + 2) return null;
  return { left: 0, width, top: Math.round((height - target) / 2), height: target };
}

async function download(youtubeId: string): Promise<{ buffer: Buffer; source: string } | null> {
  for (const source of SOURCES) {
    const cached = join(CACHE_DIR, `${youtubeId}-${source}.jpg`);
    let buffer = await readFile(cached).catch(() => null);

    if (!buffer) {
      const response = await fetch(`https://i.ytimg.com/vi/${youtubeId}/${source}.jpg`, {
        signal: AbortSignal.timeout(15_000),
      }).catch(() => null);
      // A missing maxres is a 404; YouTube also serves a 120×90 grey placeholder
      // for some misses, which the size check below catches.
      if (!response?.ok) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength < 2_000) continue;
      await writeFile(cached, bytes);
      buffer = bytes;
    }

    const { width = 0, height = 0 } = await sharp(buffer).metadata();
    if (width < 320) continue;

    const frame = innerFrame(width, height);
    const cropped = frame ? await sharp(buffer).extract(frame).toBuffer() : buffer;
    return { buffer: cropped, source };
  }

  return null;
}

/**
 * One square WebP per track. `position: "attention"` picks the busiest region,
 * which on a film-song thumbnail is almost always the faces rather than the
 * channel bug in the corner.
 */
async function encode(youtubeId: string, buffer: Buffer): Promise<number> {
  const encoded = await sharp(buffer)
    .resize(COVER_SIZE, COVER_SIZE, { fit: "cover", position: "attention" })
    .webp({ quality: 76, effort: 5 })
    .toBuffer();

  await writeFile(join(OUT_DIR, coverFile(youtubeId)), encoded);
  return encoded.byteLength;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });

  console.log(`\nbuilding covers for ${tracks.length} tracks\n`);

  const missing: string[] = [];
  const bySource = new Map<string, number>();
  let totalBytes = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < tracks.length) {
      const track = tracks[cursor++];
      if (!track) continue;

      const fetched = await download(track.youtubeId);
      if (!fetched) {
        missing.push(`${track.youtubeId}  ${track.title} — ${track.movie}`);
        continue;
      }

      totalBytes += await encode(track.youtubeId, fetched.buffer);
      bySource.set(fetched.source, (bySource.get(fetched.source) ?? 0) + 1);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  for (const [source, count] of [...bySource].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(4)} from ${source}`);
  }

  if (missing.length > 0) {
    console.error(`\n✗ no usable thumbnail for ${missing.length} track(s):`);
    for (const line of missing) console.error(`  ${line}`);
    process.exit(1);
  }

  const files = (await readdir(OUT_DIR)).length;
  console.log(
    `\n✓ ${files} covers, ${(totalBytes / 1024).toFixed(0)} KB total ` +
      `(~${Math.round(totalBytes / tracks.length / 1024)} KB each)\n`,
  );
}

await main();
