import { describe, expect, it } from "vitest";
import { formatTime, progressRatio } from "./format";

describe("formatTime", () => {
  it("formats m:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(9)).toBe("0:09");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(599)).toBe("9:59");
  });

  it("formats h:mm:ss past the hour", () => {
    expect(formatTime(3600)).toBe("1:00:00");
    expect(formatTime(3725)).toBe("1:02:05");
  });

  it("floors fractional seconds", () => {
    expect(formatTime(65.9)).toBe("1:05");
  });

  it("returns 0:00 for nonsense the player can hand back mid-teardown", () => {
    expect(formatTime(Number.NaN)).toBe("0:00");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("0:00");
    expect(formatTime(-5)).toBe("0:00");
  });
});

describe("progressRatio", () => {
  it("is the fraction elapsed", () => {
    expect(progressRatio(30, 120)).toBe(0.25);
  });

  it("is 0 before the duration is known", () => {
    expect(progressRatio(30, 0)).toBe(0);
    expect(progressRatio(30, Number.NaN)).toBe(0);
  });

  it("clamps both ends", () => {
    expect(progressRatio(-10, 120)).toBe(0);
    expect(progressRatio(500, 120)).toBe(1);
  });
});
