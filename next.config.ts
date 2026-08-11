import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Pin the workspace root. Without it, Turbopack walks up looking for a lockfile,
   * finds a stray one in the home directory, and infers a root that would include
   * everything under it — which it then warns about and ignores.
   */
  turbopack: { root: import.meta.dirname },
  /*
   * Not a static export any more.
   *
   * It was, and the playlist half still is: the page is prerendered, the plates and
   * covers are files on disk, and playback goes straight to YouTube. What broke the
   * export is in-site search — `/api/search` has to run somewhere, because YouTube's
   * results page does not answer cross-origin. One route handler, everything else
   * still static.
   */
  images: {
    // The plates are pre-encoded by `npm run art` and the covers by `npm run
    // covers`, both at the exact sizes the page asks for, so there is nothing for an
    // optimiser to do except add a hop.
    unoptimized: true,
  },
};

export default nextConfig;
