import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    /*
     * The engine, because it is pure — no network, no DOM, no framework — and the
     * adapters' own pure parts: the YouTube search-page walk is the fragile seam in
     * this codebase, so it gets tested against a synthetic blob rather than a live
     * request. Anything that needs a browser lives in a component and is not here.
     */
    include: ["src/engine/**/*.test.ts", "src/adapters/**/*.test.ts"],
    environment: "node",
  },
});
