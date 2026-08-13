"use client";

/**
 * The one preference that is not the day/night switch.
 *
 * Read in two places — the toggle that sets it and the player that acts on it — so it
 * lives here rather than in either, and both go through the same `try` for a browser
 * with storage blocked.
 */

export const AWAKE_STORAGE_KEY = "doublebell:awake";

/**
 * Default on, and that is the whole point of the setting: without it the phone locks
 * mid-song and a YouTube embed's audio dies with the screen. Someone who would rather
 * have the battery can turn it off.
 */
export function readAwake(): boolean {
  try {
    return window.localStorage.getItem(AWAKE_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeAwake(on: boolean): void {
  try {
    if (on) window.localStorage.removeItem(AWAKE_STORAGE_KEY);
    else window.localStorage.setItem(AWAKE_STORAGE_KEY, "off");
  } catch {
    // Private mode: the choice does not survive a reload. Nothing else breaks.
  }
}
