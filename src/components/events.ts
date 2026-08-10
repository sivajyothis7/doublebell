/**
 * The two custom events the chrome uses to talk to the deck.
 *
 * The search trigger lives in the header and the queue lives at the bottom of the
 * page, so an event beats threading callbacks through the layout or lifting the
 * whole player into a context for two messages.
 */

/** A song was picked in search. Detail: the YouTube ID. */
export const SELECT_TRACK_EVENT = "doublebell:select-track";

/** The day/night mode changed. Detail: the resolved period. */
export const PERIOD_EVENT = "doublebell:period";
