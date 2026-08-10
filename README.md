# ഡബിൾ ബെൽ · Double Bell

The songs that came out of blown speakers on Kerala private buses — mass, melody,
നാടൻ and മാപ്പിള, 1980–2019.

One bell means stop. Two means go: the conductor slaps the body twice and the bus
pulls away. That is the play button.

**Live:** https://doublebell.vercel.app

Built after [`anishsrinivasan/townbus`](https://github.com/anishsrinivasan/townbus)
(Town Bus Hits), which did this for Tamil Nadu town buses. The architecture here is
the same good idea — a pure playback engine, a thin adapter over the YouTube player,
and content as code — implemented independently for Kerala, with its own artwork,
its own curation and its own bell.

## What it is

- **74 curated songs**, each one a real YouTube upload from a label, studio or
  artist channel wherever one exists — those are the ones that stay up. Mined from
  fan-made "kerala private bus" playlists and from YouTube Music's own
  [bus hits malayalam](https://music.youtube.com/search?q=bus+hits+malayalam)
  search, which the site also links out to.
- **No hosted audio, ever.** Playback runs through the YouTube IFrame Player API,
  and the player is visible in the deck rather than hidden, which is what YouTube's
  terms ask for. It is dressed as the screen bolted above the windscreen of every
  Kerala tourist bus.
- **No backend.** The playlist is a TypeScript file in git; the whole site is a
  static export.
- **Four painted plates** — morning and night, landscape and portrait — drawn as
  SVG in `scripts/art/` and rasterised at build time. No photographs, no generated
  images, and no real operator's livery or name.
- **A route board instead of a listener count.** The format usually puts a live
  "N people listening" number in that slot. There is no backend here to count
  anything, and a number nobody is counting is a lie, so the slot holds the one
  thing a bus actually displays: where it is going.

## Running it

```bash
npm install
npm run dev          # http://localhost:3002
```

## Layout

```
src/engine/          PURE. Queue, seeded shuffle, day/night resolver, search,
                     route board, track model. No network, no DOM, no framework.
                     80 tests, all offline.
src/adapters/youtube The IFrame Player API wrapper. The only place that knows
                     YouTube exists as a player.
src/content/         tracks.ts — the playlist. This file is the product.
src/components/      The page. Backdrop, lockup, route board, deck, search.
scripts/art/         The artwork, as code.
scripts/             Curation and build tooling (below).
```

The engine/renderer split is absolute: `src/engine` runs offline against fixtures,
and every YouTube specific lives behind the adapter seam.

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | The engine suite. Offline, ~300ms. |
| `npm run check-tracks` | Validates the playlist, then proves every ID still resolves. Gate this before a deploy. |
| `npm run resolve-tracks` | Turns `scripts/candidates.ts` into real uploads with metadata read off each one. Curation research, not a build step. |
| `npm run art` | Renders the four plates → `public/assets`. |
| `npm run covers` | Bakes one square cover per track → `public/covers`. |
| `npm run og` | Composes the share card. Needs `npm run fonts` once. |
| `npm run fonts` | Downloads the two faces the share card is set in. |

Everything under `public/` is reproducible from `npm run art && npm run covers &&
npm run og`, so nothing large needs to be authored by hand.

## Adding a song

The inclusion filter is not "good Malayalam song". It is: would this come out of a
blown eight-inch speaker over a diesel engine, somewhere between two towns, loud
enough that the whole bus hears it whether or not it wants to?

1. Add a line to `scripts/candidates.ts`.
2. `npm run resolve-tracks` — it searches, prefers the label channels, and prints
   the film, year, composer and singer it could read off the upload.
3. Add the entry to `src/content/tracks.ts`, with the Malayalam title typed by hand.
4. `npm run check-tracks && npm run covers`.
5. Open a pull request.

Undated tracks are undated on purpose: the nadan and mappila albums have no release
year any public source agrees on, so they carry none rather than a confident guess.

## Caching

`vercel.json` sets three cache policies, for three different lifetimes:

- `/covers/*` — immutable, one year. A cover is keyed by YouTube video ID and a
  given ID's artwork never changes; a different cover means a different track and
  so a different filename.
- `/assets/*` — one day fresh, then a week of serving the old copy while the new
  one is fetched. These have stable names and *can* change when `npm run art`
  re-renders them.
- everything — `nosniff`, a strict referrer policy, and framing denied. The page
  embeds a YouTube player and nothing else.

## Credits

❤️ by [Sivajyothis](https://github.com/sivajyothis7).

Songs belong to their composers, singers, lyricists and labels, and play from their
own YouTube uploads. This is a listening room pointed at them, not a copy of them.
