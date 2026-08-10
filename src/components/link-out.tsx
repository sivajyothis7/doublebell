import { YT_MUSIC_SEARCH } from "@/lib/site";

/**
 * The YouTube Music mark, drawn inline rather than pulled from an icon set so it
 * inherits `currentColor` and stays one flat weight with the rest of the chrome.
 */
function YouTubeMusicMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.1 8.5l5.1 3.5-5.1 3.5V8.5Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Listen elsewhere.
 *
 * A plain anchor, rendered on the server: with JavaScript off this and the artwork
 * are the whole page, and it still does something useful. It points at YouTube
 * Music's "bus hits malayalam" search — the shelf a good part of this playlist came
 * off, and the right place to go if you want these songs in your own library rather
 * than on somebody's poster.
 */
export default function LinkOut({ className = "" }: { className?: string }) {
  return (
    <a
      href={YT_MUSIC_SEARCH}
      target="_blank"
      rel="noreferrer noopener"
      title="Open “bus hits malayalam” on YouTube Music"
      className={`grid size-9 place-items-center rounded-full text-[color:var(--db-cream)]/80 transition-colors hover:text-[color:var(--db-amber)] focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2 ${className}`}
    >
      <YouTubeMusicMark className="size-[1.15rem] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
      <span className="sr-only">Open bus hits malayalam on YouTube Music</span>
    </a>
  );
}
