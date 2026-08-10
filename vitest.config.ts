import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only the engine is tested here, and only because it is pure: no network,
    // no DOM, no framework. Anything that needs a browser lives in a component.
    include: ["src/engine/**/*.test.ts"],
    environment: "node",
  },
});
