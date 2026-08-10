import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Required under `output: "export"` — there is no server to revalidate on. */
export const dynamic = "force-static";

/**
 * Everything is open: the whole point is that the page gets found and forwarded.
 * The only exclusion is Next's build manifests, which are not pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/_next/"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
