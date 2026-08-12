import { describe, expect, it } from "vitest";
import {
  isValidTabId,
  PRESENCE_WINDOW_MS,
  pruneStale,
  recordBeat,
} from "./presence";

const T0 = 1_700_000_000_000;

describe("isValidTabId", () => {
  it("takes the ids the client actually generates", () => {
    expect(isValidTabId("a".repeat(32))).toBe(true);
    expect(isValidTabId("abc-DEF_123456789")).toBe(true);
  });

  it("refuses everything else", () => {
    for (const bad of ["", "short", "a".repeat(65), "has spaces here", "!!bad!!", 42, null, {}]) {
      expect(isValidTabId(bad), String(bad)).toBe(false);
    }
  });
});

describe("recordBeat", () => {
  it("counts a valid id and refuses an invalid one", () => {
    const seen = new Map<string, number>();
    expect(recordBeat(seen, "tabAAAAAAAA", T0)).toBe(true);
    expect(recordBeat(seen, "!!bad!!", T0)).toBe(false);
    expect(seen.size).toBe(1);
  });

  it("refreshes rather than duplicating a tab it already knows", () => {
    const seen = new Map<string, number>();
    recordBeat(seen, "tabAAAAAAAA", T0);
    recordBeat(seen, "tabAAAAAAAA", T0 + 20_000);
    expect(seen.size).toBe(1);
    expect(seen.get("tabAAAAAAAA")).toBe(T0 + 20_000);
  });

  it("stops accepting new ids at the ceiling", () => {
    const seen = new Map<string, number>();
    for (let i = 0; i < 3; i++) recordBeat(seen, `tab${String(i).padStart(8, "0")}`, T0, 3);
    expect(seen.size).toBe(3);
    expect(recordBeat(seen, "tabZZZZZZZZ", T0, 3)).toBe(false);
    expect(seen.size).toBe(3);
  });

  it("still refreshes a known tab once the ceiling is reached", () => {
    // Otherwise a busy moment freezes out the people already reading the page, and
    // their entries expire while they sit there.
    const seen = new Map<string, number>();
    for (let i = 0; i < 3; i++) recordBeat(seen, `tab${String(i).padStart(8, "0")}`, T0, 3);
    expect(recordBeat(seen, "tab00000000", T0 + 20_000, 3)).toBe(true);
    expect(seen.get("tab00000000")).toBe(T0 + 20_000);
  });
});

describe("pruneStale", () => {
  it("keeps a tab that beat inside the window", () => {
    const seen = new Map([["tabAAAAAAAA", T0]]);
    expect(pruneStale(seen, T0 + PRESENCE_WINDOW_MS - 1)).toBe(0);
    expect(seen.size).toBe(1);
  });

  it("drops a tab that went quiet", () => {
    const seen = new Map([["tabAAAAAAAA", T0]]);
    expect(pruneStale(seen, T0 + PRESENCE_WINDOW_MS + 1)).toBe(1);
    expect(seen.size).toBe(0);
  });

  it("is exact on the boundary — equal to the window is still here", () => {
    const seen = new Map([["tabAAAAAAAA", T0]]);
    pruneStale(seen, T0 + PRESENCE_WINDOW_MS);
    expect(seen.size).toBe(1);
  });

  /**
   * The bug this file exists for. A count that only ever rises reads as a popular
   * page rather than a broken sweep, so it has to be proven that leaving makes the
   * number go down.
   */
  it("makes the count fall when people leave", () => {
    const seen = new Map<string, number>();
    recordBeat(seen, "stayingAAAA", T0);
    recordBeat(seen, "leavingBBBB", T0);
    expect(seen.size).toBe(2);

    // One keeps beating, the other closed its tab.
    const later = T0 + 40_000;
    recordBeat(seen, "stayingAAAA", later);
    pruneStale(seen, later);
    expect(seen.size).toBe(2);

    const muchLater = T0 + 90_000;
    recordBeat(seen, "stayingAAAA", muchLater);
    pruneStale(seen, muchLater);
    expect([...seen.keys()]).toEqual(["stayingAAAA"]);
  });

  it("empties completely when everybody has gone", () => {
    const seen = new Map<string, number>();
    for (let i = 0; i < 5; i++) recordBeat(seen, `tab${String(i).padStart(8, "0")}`, T0);
    pruneStale(seen, T0 + 10 * PRESENCE_WINDOW_MS);
    expect(seen.size).toBe(0);
  });

  it("survives a clock that jumps backwards", () => {
    // A negative age must not be treated as stale, or an NTP correction would empty
    // the bus.
    const seen = new Map([["tabAAAAAAAA", T0]]);
    pruneStale(seen, T0 - 30_000);
    expect(seen.size).toBe(1);
  });
});
