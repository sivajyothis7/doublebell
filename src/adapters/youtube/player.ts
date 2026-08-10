/**
 * A small, framework-free wrapper around the YouTube IFrame Player.
 *
 * This is the only place in the codebase that knows YouTube exists as a player.
 * The queue sees `onEnded` / `onUnavailable` and nothing else.
 *
 * The iframe it mounts stays visible and unobscured, which YouTube's terms ask
 * for. That is not a compromise here: a Kerala tourist bus has a screen bolted
 * above the windscreen, so the player *is* a design element — see the deck in
 * `player-card.tsx`.
 */

import { loadYouTubeApi, type YTPlayerInstance } from "./api";
import { describeError, isPermanentError } from "./errors";

export type PlaybackStatus = "idle" | "buffering" | "playing" | "paused" | "ended";

export type PlayerCallbacks = {
  onReady?: () => void;
  onStatusChange?: (status: PlaybackStatus) => void;
  /** The track finished on its own — advance the queue. */
  onEnded?: () => void;
  /** Error 100 / 101 / 150: this ID will never play. Retire it and skip. */
  onUnavailable?: (youtubeId: string, reason: string) => void;
  /** Anything else the player reported; playback may still recover. */
  onError?: (code: number, youtubeId: string, reason: string) => void;
};

export type CreatePlayerOptions = PlayerCallbacks & {
  /**
   * Where the player goes. Must be in the document and visible.
   *
   * A mount node is appended inside it rather than handing this element over:
   * `YT.Player` *replaces* the node it is given, and if that node is one React
   * rendered, React later tries to patch a node that is no longer there.
   */
  container: HTMLElement;
  /** Video to cue on mount. Cued, never auto-played — that needs a gesture. */
  initialVideoId?: string;
};

export type Player = {
  load(youtubeId: string, options?: { autoplay?: boolean }): void;
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  elapsed(): number;
  duration(): number;
  currentVideoId(): string | null;
  destroy(): void;
};

const STATUS_BY_STATE: Record<number, PlaybackStatus> = {
  [-1]: "idle",
  0: "ended",
  1: "playing",
  2: "paused",
  3: "buffering",
  5: "idle",
};

export async function createPlayer(options: CreatePlayerOptions): Promise<Player> {
  const { container, initialVideoId, ...callbacks } = options;
  const api = await loadYouTubeApi();

  let videoId = initialVideoId ?? null;
  let destroyed = false;
  let ready = false;
  /** A load requested before the player finished booting. */
  let deferred: { id: string; autoplay: boolean } | null = null;

  // Owned by this adapter, invisible to React's reconciler.
  const mount = container.ownerDocument.createElement("div");
  container.appendChild(mount);

  const instance: YTPlayerInstance = await new Promise((resolve) => {
    const created = new api.Player(mount, {
      videoId: initialVideoId,
      playerVars: {
        // No related videos from other channels, no branding clutter: this is a
        // screen in a bus, not a YouTube session.
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        origin: typeof window === "undefined" ? undefined : window.location.origin,
      },
      events: {
        onReady: () => {
          ready = true;
          resolve(created);
          callbacks.onReady?.();
          if (deferred) {
            const { id, autoplay } = deferred;
            deferred = null;
            load(id, { autoplay });
          }
        },
        onStateChange: (event: { data: number }) => {
          const status = STATUS_BY_STATE[event.data] ?? "idle";
          callbacks.onStatusChange?.(status);
          if (status === "ended") callbacks.onEnded?.();
        },
        onError: (event: { data: number }) => {
          const code = event.data;
          const reason = describeError(code);
          const id = videoId;
          if (id && isPermanentError(code)) {
            // Console, deliberately: a dead ID is a curation bug, and this is
            // the breadcrumb that gets it fixed in the next commit.
            console.warn(`[doublebell] ${id} unavailable — ${reason}`);
            callbacks.onUnavailable?.(id, reason);
            return;
          }
          callbacks.onError?.(code, id ?? "", reason);
        },
      },
    });
  });

  function load(id: string, loadOptions: { autoplay?: boolean } = {}): void {
    if (destroyed) return;
    videoId = id;
    if (!ready) {
      deferred = { id, autoplay: loadOptions.autoplay ?? false };
      return;
    }
    if (loadOptions.autoplay) instance.loadVideoById(id);
    else instance.cueVideoById(id);
  }

  /** The IFrame API throws if it is queried mid-teardown; 0 is a fine answer. */
  const safeNumber = (read: () => number): number => {
    try {
      const value = read();
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  };

  return {
    load,
    play: () => {
      if (!destroyed && ready) instance.playVideo();
    },
    pause: () => {
      if (!destroyed && ready) instance.pauseVideo();
    },
    seekTo: (seconds) => {
      if (!destroyed && ready) instance.seekTo(Math.max(0, seconds), true);
    },
    elapsed: () => (destroyed || !ready ? 0 : safeNumber(() => instance.getCurrentTime())),
    duration: () => (destroyed || !ready ? 0 : safeNumber(() => instance.getDuration())),
    currentVideoId: () => videoId,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      try {
        instance.destroy();
      } catch {
        // The iframe can already be gone if React tore the subtree down first.
      }
      mount.remove();
    },
  };
}
