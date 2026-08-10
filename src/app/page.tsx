import Script from "next/script";
import Backdrop from "@/components/backdrop";
import Lockup from "@/components/lockup";
import Radio from "@/components/radio";
import TopBar from "@/components/top-bar";
import { tracks } from "@/content";
import { watchUrl } from "@/engine";
import { site } from "@/lib/site";

/**
 * One page. Painted plate behind everything, lockup centred, and the deck floating
 * clear of the bottom edge — the same arrangement in both orientations, laid out so
 * a phone gets a portrait page rather than a cropped desktop one.
 */
export default function Home() {
  return (
    <>
      <Backdrop />

      <main className="relative z-1 flex min-h-svh flex-col">
        <TopBar />

        {/*
          Top-aligned rather than centred: the plate puts the bus in the middle of
          the frame, and a vertically-centred lockup lands on its windscreen. This
          sits the type in the sky above the roof line in both orientations.
        */}
        <div className="flex flex-1 items-start justify-center px-5 pt-[3vh] pb-24 sm:justify-start sm:pt-[9vh] sm:pl-[7vw]">
          <Lockup />
        </div>

        <div className="sticky bottom-0 px-3 pt-2 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
          <Radio />
        </div>
      </main>

      {/* This is a music playlist, and it should read as one to a crawler. */}
      <Script id="db-jsonld" type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MusicPlaylist",
          name: `${site.titleLatin} (${site.titleMl})`,
          description: site.description,
          url: site.url,
          numTracks: tracks.length,
          track: tracks.map((track) => ({
            "@type": "MusicRecording",
            name: track.title,
            alternateName: track.titleMl,
            url: watchUrl(track.youtubeId),
            inAlbum: { "@type": "MusicAlbum", name: track.movie },
            byArtist: { "@type": "Person", name: track.singer },
            ...(track.year === undefined ? {} : { datePublished: String(track.year) }),
          })),
        })}
      </Script>
    </>
  );
}
