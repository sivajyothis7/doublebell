/**
 * Resolving a pasted link to something worth reading.
 *
 * A video ID on its own makes a miserable row in a list, so before a pasted link
 * gets played its title and channel are fetched from YouTube's oEmbed endpoint —
 * which answers cross-origin, needs no API key and no backend, and is the same
 * endpoint `check-tracks` uses at build time.
 *
 * This is best-effort by design. If it fails, the link still plays; it just plays
 * labelled by its ID. Nothing here is allowed to stand between a paste and a song.
 */

const OEMBED = "https://www.youtube.com/oembed";
const TIMEOUT_MS = 6_000;

export type LinkInfo = {
  youtubeId: string;
  /** The upload's own title, e.g. "Maanathe Manichithathe | Bus Conductor | …". */
  title: string;
  /** The uploading channel, which for a label upload is the label. */
  author: string;
};

/**
 * oEmbed's answer for `youtubeId`, or null if it cannot be had.
 *
 * A null here means one of three things and the caller treats them the same: the
 * video does not exist, the owner has blocked embedding, or the network was slow.
 * The first two are worth surfacing as "this will not play", which the caller does
 * by refusing to add it — better a message now than silence when the deck reaches
 * it.
 */
export async function resolveLink(youtubeId: string): Promise<LinkInfo | null> {
  const url = `${OEMBED}?format=json&url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${youtubeId}`,
  )}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const body = (await response.json()) as { title?: string; author_name?: string };
    return {
      youtubeId,
      title: body.title?.trim() || youtubeId,
      author: body.author_name?.trim() || "YouTube",
    };
  } catch {
    return null;
  }
}
