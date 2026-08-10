import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Pin the workspace root. Without it, Turbopack walks up looking for a lockfile,
   * finds a stray one in the home directory, and infers a root that would include
   * everything under it — which it then warns about and ignores.
   */
  turbopack: { root: import.meta.dirname },
  // The whole site is HTML/CSS/JS on a CDN. There is no backend: the playlist is
  // a TypeScript file in git and playback goes straight to YouTube.
  output: "export",
  images: {
    // A static export has no image optimiser. The backdrop matrix is pre-encoded
    // by `npm run art` and the covers by `npm run covers`.
    unoptimized: true,
  },
};

export default nextConfig;
