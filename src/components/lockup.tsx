import { site } from "@/lib/site";

/**
 * The title lockup. Real HTML text, selectable and indexable — no Malayalam on this
 * page comes from a raster. The painted-signwriter treatment is entirely CSS
 * (`.lockup-ml` in globals.css).
 *
 * Centred on a phone and ranged left from `sm` up, which is not a stylistic whim:
 * the wide plate puts the bus in the right third, so left-ranged type sits in the
 * open sky over the paddy instead of across a windscreen. The portrait plate has no
 * such gap, so there it goes back to the middle.
 */
export default function Lockup() {
  return (
    <header className="flex flex-col items-center text-center sm:items-start sm:text-left">
      {/* The one place the Malayalam display face is used — this is the logo. */}
      <h1 className="lockup-ml text-[clamp(2.6rem,10vw,5.4rem)]" lang="ml">
        {site.titleMl}
      </h1>
      <p className="lockup-la mt-3 text-[clamp(0.56rem,1.9vw,0.78rem)] uppercase sm:mt-4">
        {site.titleLatin}
      </p>
      <p className="mt-4 max-w-[24rem] text-[0.78rem] text-[color:var(--db-cream)]/70 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] sm:text-[0.86rem]">
        {site.tagline}
        <span className="mx-1.5 opacity-40">·</span>
        {site.trackCount} songs
      </p>
      {/*
        The heart is an emoji rather than an icon on purpose: it inherits the
        viewer's own emoji font, which is what makes it read as a signature rather
        than as part of the interface. Plain text, no link — this is a credit, not
        a call to action.
      */}
      <p className="mt-2.5 text-[0.74rem] text-[color:var(--db-cream)]/55 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
        <span aria-hidden="true">❤️</span>
        <span className="sr-only">Made with love</span>
        {" by Sivajyothis"}
      </p>
    </header>
  );
}
