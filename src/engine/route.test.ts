import { describe, expect, it } from "vitest";
import { containsMalayalam } from "./track";
import { boardAt, ROUTE_ROTATE_MS, ROUTES, SERVICE_CLASSES } from "./route";

describe("ROUTES", () => {
  it("carries a Malayalam and a Latin name for both ends of every route", () => {
    for (const route of ROUTES) {
      expect(containsMalayalam(route.fromMl)).toBe(true);
      expect(containsMalayalam(route.toMl)).toBe(true);
      expect(route.from.trim()).not.toBe("");
      expect(route.to.trim()).not.toBe("");
    }
  });

  it("never terminates where it started", () => {
    for (const route of ROUTES) expect(route.from).not.toBe(route.to);
  });

  it("has enough boards that the same one does not come round in a session", () => {
    expect(ROUTES.length).toBeGreaterThanOrEqual(12);
  });
});

describe("boardAt", () => {
  const base = new Date("2026-08-10T06:00:00Z");
  const at = (offsetMs: number) => boardAt(new Date(base.getTime() + offsetMs));

  it("is stable within one rotation window", () => {
    expect(at(0)).toEqual(at(ROUTE_ROTATE_MS - 1));
  });

  it("changes route on the next window", () => {
    expect(at(0).from).not.toBe(at(ROUTE_ROTATE_MS).from);
  });

  it("walks the whole list before repeating", () => {
    const seen = new Set(
      Array.from({ length: ROUTES.length }, (_, i) => at(i * ROUTE_ROTATE_MS).from + "→" + at(i * ROUTE_ROTATE_MS).to),
    );
    expect(seen.size).toBe(ROUTES.length);
  });

  it("changes the service class once the route list has come round", () => {
    const first = at(0);
    const lap = at(ROUTES.length * ROUTE_ROTATE_MS);
    expect(lap.from).toBe(first.from);
    expect(lap.serviceClass).not.toBe(first.serviceClass);
  });

  it("only ever shows a class a private stage carriage actually runs", () => {
    for (let i = 0; i < ROUTES.length * 3; i++) {
      expect(SERVICE_CLASSES).toContain(at(i * ROUTE_ROTATE_MS).serviceClass);
    }
  });

  it("stays in range for instants before the epoch", () => {
    const board = boardAt(new Date("1969-01-01T00:00:00Z"));
    expect(ROUTES.map((route) => route.from)).toContain(board.from);
  });
});
