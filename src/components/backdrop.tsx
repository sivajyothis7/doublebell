import { backdropUrl, type Period } from "@/engine";

/**
 * The period × orientation plate matrix.
 *
 * Both periods are in the DOM and CSS picks one off `<html data-period>`, which the
 * blocking resolver in <head> sets before first paint. So the right plate is showing
 * on the first frame and the day/night switch is a single attribute write rather
 * than a re-render.
 *
 * WebP then JPEG, and no AVIF — see `BackdropFormat` in the engine for why.
 */
function Plate({ period }: { period: Period }) {
  const srcSet = (orientation: "landscape" | "portrait", format: "webp" | "jpg") =>
    `${backdropUrl(period, orientation, "half", format)} 1280w, ` +
    `${backdropUrl(period, orientation, "full", format)} 2560w`;

  return (
    <div className={`plate plate--${period}`} aria-hidden="true">
      <picture>
        {/* Portrait first: the browser takes the first source whose media matches. */}
        <source
          media="(orientation: portrait)"
          type="image/webp"
          srcSet={srcSet("portrait", "webp")}
          sizes="100vw"
        />
        <source
          media="(orientation: portrait)"
          type="image/jpeg"
          srcSet={srcSet("portrait", "jpg")}
          sizes="100vw"
        />
        <source type="image/webp" srcSet={srcSet("landscape", "webp")} sizes="100vw" />
        {/*
          Eager and high priority: this is the largest thing on the page and the
          reason anyone stays on it. Both periods load so the day/night switch is
          instant — flat vector art, so that costs about 25 KB.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={backdropUrl(period, "landscape", "full", "jpg")}
          srcSet={srcSet("landscape", "jpg")}
          sizes="100vw"
          alt=""
          loading="eager"
          fetchPriority={period === "night" ? "high" : "low"}
          decoding="async"
        />
      </picture>
    </div>
  );
}

export default function Backdrop() {
  return (
    <div className="stage" aria-hidden="true">
      <Plate period="night" />
      <Plate period="morning" />
      <div className="scrim" />
      <div className="grain" />
    </div>
  );
}
