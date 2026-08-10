import { type Era, eraForYear, type Track, type Vibe } from "@/engine";
import { tracks as authored } from "./tracks";

/** The playlist, as authored. */
export const tracks: readonly Track[] = authored;

/** The span the site actually plays, read off the tracks rather than written down. */
export function eraSpan(list: readonly Track[] = tracks): { from: number; to: number } {
  const years = list.flatMap((track) => (track.year === undefined ? [] : [track.year]));
  return { from: Math.min(...years), to: Math.max(...years) };
}

export function byVibe(vibe: Vibe, list: readonly Track[] = tracks): Track[] {
  return list.filter((track) => track.vibe === vibe);
}

export function byEra(era: Era, list: readonly Track[] = tracks): Track[] {
  return list.filter((track) => track.year !== undefined && eraForYear(track.year) === era);
}

/** How many of each kind, so the vibe filter can show its own counts. */
export function vibeCounts(list: readonly Track[] = tracks): Record<Vibe, number> {
  const counts: Record<Vibe, number> = { mass: 0, melody: 0, nadan: 0, mappila: 0 };
  for (const track of list) counts[track.vibe]++;
  return counts;
}

export function findById(youtubeId: string, list: readonly Track[] = tracks): Track | undefined {
  return list.find((track) => track.youtubeId === youtubeId);
}
