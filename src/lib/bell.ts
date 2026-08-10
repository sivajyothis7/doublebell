/**
 * The bell.
 *
 * One bell means stop. Two means go — the conductor slaps the body twice and the
 * bus pulls away. The site is named after that, so the play button rings it.
 *
 * Synthesised rather than sampled: a recording would mean hosting audio, which
 * this project deliberately does not do, and a bus bell is a very simple sound to
 * build. Two struck partials an octave-and-a-bit apart, a fast attack, a long
 * exponential tail, and a touch of noise for the clapper. Roughly 300 bytes of
 * maths instead of a file.
 */

const STORAGE_KEY = "doublebell:bell";

export function bellEnabled(): boolean {
  try {
    // On by default. The whole product is named after the sound.
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setBellEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Private mode: the choice just does not survive a reload.
  }
}

type AudioContextConstructor = typeof AudioContext;

/**
 * One context for the page, created on the first ring.
 *
 * Not created up front on purpose: a context made before any user gesture starts
 * `suspended` on every current browser, and Safari counts it against the page
 * whether or not it is ever used.
 */
let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (context) return context;
  const Ctor: AudioContextConstructor | undefined =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioContextConstructor })
          .webkitAudioContext);
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

/** One strike: two partials plus a clapper tick, decaying together. */
function strike(ctx: AudioContext, at: number, gain: number) {
  // 780 Hz and 1170 Hz — a fifth apart, which is roughly what a small brass bell
  // on a bus body actually rings at once the body damps the rest.
  for (const [frequency, level] of [
    [780, 1],
    [1170, 0.55],
    [2340, 0.18],
  ] as const) {
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;

    envelope.gain.setValueAtTime(0, at);
    // 4 ms attack: any slower and it reads as a chime rather than a strike.
    envelope.gain.linearRampToValueAtTime(gain * level, at + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.55);

    osc.connect(envelope).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.6);
  }
}

/**
 * Ring it. Twice, 190 ms apart — which is about how fast a conductor's hand
 * moves and close enough that the two reads as one signal rather than two bells.
 *
 * Safe to call from a click handler; safe to call when there is no audio at all.
 */
export function ringDoubleBell(): void {
  if (!bellEnabled()) return;

  const ctx = audioContext();
  if (!ctx) return;
  // A context created before the first gesture starts suspended; resuming inside
  // the gesture is what makes the first ring audible rather than silent.
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime + 0.02;
  strike(ctx, now, 0.22);
  strike(ctx, now + 0.19, 0.19);
}
