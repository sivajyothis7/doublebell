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

- **49 curated songs, all from one place**: the YouTube search
  [`bus hits malayalam`](https://www.youtube.com/results?search_query=bus+hits+malayalam)
  and the playlists it surfaces. `npm run mine-search` ranks that pool by reading
  each upload's own metadata; the site links back to the search. Every ID is a
  label, studio or artist-channel upload wherever one exists — those are the ones
  that stay up.
- **No hosted audio, ever.** Playback runs through the YouTube IFrame Player API,
  and the player is visible in the deck rather than hidden, which is what YouTube's
  terms ask for. It is dressed as the screen bolted above the windscreen of every
  Kerala tourist bus.
- **Search YouTube from inside the page** and any result plays in this deck — no
  redirect, no API key. Or paste a YouTube link and it plays as a guest in the queue.
- **Almost no backend.** The playlist is a TypeScript file in git and the page is
  prerendered; the one server-side thing is `/api/search`.
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
src/engine/          PURE. Queue, seeded shuffle, day/night resolver, playlist
                     search, link parsing, route board, track model. No network,
                     no DOM, no framework.
src/adapters/youtube The IFrame Player API wrapper, the oEmbed lookup, and the
                     search-page parser. The only place that knows YouTube exists.
src/app/api/search   The one route handler: YouTube search, server-side.
src/content/         tracks.ts — the playlist. This file is the product.
src/components/      The page. Backdrop, lockup, route board, deck, search.
scripts/art/         The artwork, as code.
scripts/             Curation and build tooling (below).
```

The engine/renderer split is absolute: `src/engine` runs offline against fixtures,
and every YouTube specific lives behind the adapter seam. 107 tests, all offline —
including the search-page parser, which is the most fragile thing here and so is
tested against a synthetic blob rather than a live request.

## Searching YouTube without an API key

`/api/search` reads YouTube's own results page and walks the `ytInitialData` blob in
it. That is a deliberate trade against the official Data API, where `search.list`
costs 100 of a 10,000-unit daily quota — a hundred searches a day for the entire
site, after which every visitor gets an error. A key would also have to live
somewhere, and in a static bundle that means published.

The cost is fragility: it is YouTube's private shape and they can change it. So the
walk is entirely optional-chained (a shape change yields zero results, never a 500),
the parser is unit-tested, the route caches at the edge for an hour per query, and
the UI treats "no results" and "parser broke" identically — the playlist and the
paste-a-link box keep working regardless.

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | The engine suite. Offline, ~300ms. |
| `npm run check-tracks` | Validates the playlist, then proves every ID still resolves. Gate this before a deploy. |
| `npm run mine-search` | Ranks the `bus hits malayalam` search pool by what each upload's own metadata says. Curation research, not a build step. |
| `npm run resolve-tracks` | Older, name-first path: turns `scripts/candidates.ts` into real uploads. Kept for looking a specific song up. |
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

It also has to be in the source search's pool — that constraint is the point.

1. `./.harvest/ytsearch.sh` to re-dump the pool, then `npm run mine-search`.
2. Take an entry it marked `keep` and add it to `src/content/tracks.ts`, with the
   Malayalam title typed by hand and the **film's** year, not the upload's.
3. `npm run check-tracks && npm run covers`.
4. Open a pull request.

Undated tracks are undated on purpose: the nadan and mappila albums have no release
year any public source agrees on, so they carry none rather than a confident guess.

## Deploying

The repo is connected to the Vercel project, so **a push to `main` deploys it** —
Vercel runs `next build` and serves the static export. Nothing else to do.

Gate a curation change on `npm run check-tracks` first: a dead or un-embeddable ID
does not fail the build, it just silently vanishes from the queue at runtime.

To deploy by hand (a token with access to the `sivajyothis7s-projects` scope):

```bash
vercel deploy --prod --yes --scope sivajyothis7s-projects
```

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

❤️ by Sivajyothis.

Songs belong to their composers, singers, lyricists and labels, and play from their
own YouTube uploads. This is a listening room pointed at them, not a copy of them.
