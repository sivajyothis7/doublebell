import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { istHour, type Period, periodScript, resolveMode, resolvePeriod } from "./period";

/** An instant whose IST wall clock is `hour`, built from UTC so the host TZ never matters. */
function atIstHour(hour: number, minute = 0): Date {
  const utcMinutes = hour * 60 + minute - (5 * 60 + 30);
  return new Date(Date.UTC(2026, 7, 10, 0, utcMinutes));
}

const CASES: [number, Period][] = [
  [0, "night"],
  [4, "night"],
  [5, "morning"],
  [6, "morning"],
  [12, "morning"],
  [17, "morning"],
  [18, "night"],
  [21, "night"],
  [23, "night"],
];

describe("istHour", () => {
  it("reads the IST wall clock, not the host's", () => {
    for (const [hour] of CASES) expect(istHour(atIstHour(hour, 30))).toBe(hour);
  });

  it("handles instants before the epoch without going negative", () => {
    expect(istHour(new Date("1969-12-31T00:00:00Z"))).toBe(5);
  });
});

describe("resolvePeriod", () => {
  it("switches at 05:00 and 18:00 IST", () => {
    for (const [hour, period] of CASES) expect(resolvePeriod(atIstHour(hour))).toBe(period);
  });
});

describe("resolveMode", () => {
  it("follows the clock on system and pins otherwise", () => {
    const noon = atIstHour(12);
    expect(resolveMode("system", noon)).toBe("morning");
    expect(resolveMode("night", noon)).toBe("night");
    expect(resolveMode("morning", atIstHour(23))).toBe("morning");
  });
});

/**
 * The inline snippet is a second implementation of the same rule, shipped as a
 * string so it can run in <head> before the bundle. Left untested it would
 * drift, and the symptom — a backdrop that swaps after first paint — is exactly
 * what it exists to prevent. So it is executed here, in a real VM context with
 * a stubbed browser, against the same cases as the resolver above.
 */
describe("periodScript", () => {
  type Sandbox = {
    period?: string;
    run(stored: string | null, now: number, storageThrows?: boolean): string | undefined;
  };

  const sandbox: Sandbox = {
    run(stored, now, storageThrows = false) {
      const dataset: Record<string, string> = {};
      runInNewContext(periodScript(), {
        localStorage: {
          getItem: () => {
            if (storageThrows) throw new Error("SecurityError");
            return stored;
          },
        },
        document: { documentElement: { dataset } },
        Date: { now: () => now },
      });
      return dataset.period;
    },
  };

  it("agrees with resolvePeriod at every boundary", () => {
    for (const [hour, period] of CASES) {
      expect(sandbox.run(null, atIstHour(hour).getTime())).toBe(period);
    }
  });

  it("honours a pinned mode over the clock", () => {
    expect(sandbox.run("night", atIstHour(12).getTime())).toBe("night");
    expect(sandbox.run("morning", atIstHour(23).getTime())).toBe("morning");
  });

  it("falls back to the clock for junk in storage", () => {
    expect(sandbox.run("evening", atIstHour(12).getTime())).toBe("morning");
  });

  it("swallows a storage failure instead of throwing, leaving the CSS default", () => {
    let period: string | undefined = "unset";
    expect(() => {
      period = sandbox.run(null, atIstHour(12).getTime(), true);
    }).not.toThrow();
    expect(period).toBeUndefined();
  });
});
