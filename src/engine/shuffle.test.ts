import { describe, expect, it } from "vitest";
import { createRandom, shuffle } from "./shuffle";

describe("createRandom", () => {
  it("is deterministic per seed", () => {
    const a = createRandom(1234);
    const b = createRandom(1234);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("stays in [0, 1)", () => {
    const random = createRandom(99);
    for (let i = 0; i < 500; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("shuffle", () => {
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  it("does not mutate the input", () => {
    const copy = [...items];
    shuffle(items, 5);
    expect(items).toEqual(copy);
  });

  it("is a permutation", () => {
    expect([...shuffle(items, 5)].sort((a, b) => a - b)).toEqual(items);
  });

  it("is reproducible per seed and differs across seeds", () => {
    expect(shuffle(items, 5)).toEqual(shuffle(items, 5));
    expect(shuffle(items, 6)).not.toEqual(shuffle(items, 5));
  });

  it("handles empty and single-item lists", () => {
    expect(shuffle([], 1)).toEqual([]);
    expect(shuffle(["only"], 1)).toEqual(["only"]);
  });

  it("actually reorders — a no-op shuffle would be a silent bug", () => {
    // Over a 10-item list, at least one of a handful of seeds must move things.
    const moved = [1, 2, 3, 4, 5].some(
      (seed) => shuffle(items, seed).join() !== items.join(),
    );
    expect(moved).toBe(true);
  });
});
