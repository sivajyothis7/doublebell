import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Required under `output: "export"` — there is no server to revalidate on. */
export const dynamic = "force-static";

/**
 * One page, because that is the whole product. The deep links (`?id={youtubeId}`)
 * are query strings on this same page rather than routes, so they do not belong
 * here — listing them would ask search engines to index sixty near-identical
 * copies of one page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: site.url, changeFrequency: "monthly", priority: 1 }];
}
