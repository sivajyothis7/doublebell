/**
 * Seeded shuffle. The seed is explicit so the running order is reproducible in
 * tests, and so a shared link could later reproduce someone else's queue.
 */

/** mulberry32 — small, fast, and plenty for shuffling a 50-song playlist. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates against a seeded PRNG. Returns a new array; input untouched. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const random = createRandom(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}
