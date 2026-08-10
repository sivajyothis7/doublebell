import { eraSpan, tracks } from "@/content";

const { from, to } = eraSpan();

/**
 * Single source of truth for the things that have to agree between the page, the
 * metadata and the share card.
 */
export const site = {
  /**
   * The canonical origin. Everything absolute resolves against it — the canonical
   * link, `og:url`, the sitemap — so it has to be the address people actually
   * land on, or a share resolves to nothing.
   */
  url: "https://doublebell.vercel.app",
  name: "Double Bell",
  /**
   * ഡബിൾ ബെൽ. One bell means stop. Two means go — the conductor slaps the
   * body twice and the bus pulls away. It is the most Kerala play button there
   * is, which is why the site is named after it and why the play button rings.
   */
  titleMl: "ഡബിൾ ബെൽ",
  titleLatin: "Double Bell",
  tagline: `Kerala private bus hits · ${from}–${to}`,
  description:
    "The songs that came out of blown speakers on Kerala private buses — mass, " +
    `melody, നാടൻ and മാപ്പിള, ${from}–${to}. Ring the bell.`,
  trackCount: tracks.length,
} as const;

/**
 * Where to go when you want the whole thing in your own library instead.
 *
 * This is YouTube Music's own "bus hits malayalam" search — the same place a good
 * part of this playlist was mined from, and the honest answer to "can I take this
 * with me": no, but here is the shelf it came off.
 */
export const YT_MUSIC_SEARCH = "https://music.youtube.com/search?q=bus+hits+malayalam";

/** Whose bus this is. */
export const AUTHOR = {
  name: "Sivajyothis",
  url: "https://github.com/sivajyothis7",
} as const;

/**
 * Whether the YouTube iframe is shown in the deck.
 *
 * YouTube's terms ask for a visible, unobscured player, and this site can give
 * them one without spoiling anything: a Kerala tourist bus has a screen bolted
 * above the windscreen, so the embed is dressed as that screen. Kept `true`
 * deliberately — hiding it would trade a compliant embed for a slightly cleaner
 * pill, and playback is the whole product.
 */
export const SHOW_PLAYER = true;
