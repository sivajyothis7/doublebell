import { describe, expect, it } from "vitest";
import { FIXTURE_TRACKS, makeTrack } from "./fixtures";
import {
  createQueue,
  currentTrack,
  jumpToId,
  markUnavailable,
  next,
  onEnded,
  peekNext,
  playableCount,
  prev,
  setShuffle,
} from "./queue";

const unshuffled = () => createQueue(FIXTURE_TRACKS, { shuffle: false });

describe("createQueue", () => {
  it("starts on the first track in authored order when unshuffled", () => {
    expect(currentTrack(unshuffled())?.youtubeId).toBe("aaaaaaaaaa0");
  });

  it("is reproducible for a given seed and different across seeds", () => {
    const a = createQueue(FIXTURE_TRACKS, { seed: 7 });
    const b = createQueue(FIXTURE_TRACKS, { seed: 7 });
    const c = createQueue(FIXTURE_TRACKS, { seed: 8 });
    expect(a.order).toEqual(b.order);
    expect(c.order).not.toEqual(a.order);
  });

  it("keeps every track when shuffled", () => {
    const shuffled = createQueue(FIXTURE_TRACKS, { seed: 3 });
    expect([...shuffled.order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("opens on a deep-linked track", () => {
    const queue = createQueue(FIXTURE_TRACKS, { seed: 3, startId: "aaaaaaaaaa4" });
    expect(currentTrack(queue)?.youtubeId).toBe("aaaaaaaaaa4");
  });

  it("ignores an unknown deep link rather than emptying the queue", () => {
    const queue = createQueue(FIXTURE_TRACKS, { shuffle: false, startId: "zzzzzzzzzzz" });
    expect(currentTrack(queue)?.youtubeId).toBe("aaaaaaaaaa0");
  });

  it("survives an empty playlist", () => {
    const queue = createQueue([]);
    expect(queue.position).toBe(-1);
    expect(currentTrack(queue)).toBeNull();
    expect(next(queue)).toBe(queue);
    expect(playableCount(queue)).toBe(0);
  });
});

describe("next / prev", () => {
  it("advances and wraps at the end", () => {
    let queue = unshuffled();
    for (let i = 0; i < 5; i++) queue = next(queue);
    expect(currentTrack(queue)?.youtubeId).toBe("aaaaaaaaaa5");
    expect(currentTrack(next(queue))?.youtubeId).toBe("aaaaaaaaaa0");
  });

  it("steps back and wraps at the start", () => {
    expect(currentTrack(prev(unshuffled()))?.youtubeId).toBe("aaaaaaaaaa5");
  });

  it("treats a track ending as a next", () => {
    expect(currentTrack(onEnded(unshuffled()))?.youtubeId).toBe("aaaaaaaaaa1");
  });

  it("peeks without moving", () => {
    const queue = unshuffled();
    expect(peekNext(queue)?.youtubeId).toBe("aaaaaaaaaa1");
    expect(currentTrack(queue)?.youtubeId).toBe("aaaaaaaaaa0");
  });
});

describe("markUnavailable", () => {
  it("skips past the dead track it is currently on", () => {
    const queue = markUnavailable(unshuffled(), "aaaaaaaaaa0");
    expect(currentTrack(queue)?.youtubeId).toBe("aaaaaaaaaa1");
    expect(playableCount(queue)).toBe(5);
  });

  it("only records a dead track that is not playing", () => {
    const queue = markUnavailable(unshuffled(), "aaaaaaaaaa3");
    expect(currentTrack(queue)?.youtubeId).toBe("aaaaaaaaaa0");
    expect(playableCount(queue)).toBe(5);
  });

  it("steps over dead tracks when advancing", () => {
    let queue = unshuffled();
    queue = markUnavailable(queue, "aaaaaaaaaa1");
    queue = markUnavailable(queue, "aaaaaaaaaa2");
    expect(currentTrack(next(queue))?.youtubeId).toBe("aaaaaaaaaa3");
  });

  it("records a given id only once", () => {
    let queue = markUnavailable(unshuffled(), "aaaaaaaaaa3");
    queue = markUnavailable(queue, "aaaaaaaaaa3");
    expect(queue.unavailable).toEqual(["aaaaaaaaaa3"]);
  });

  it("stops rather than spinning when the whole playlist is dead", () => {
    let queue = createQueue([makeTrack({ youtubeId: "aaaaaaaaaa0" })], { shuffle: false });
    queue = markUnavailable(queue, "aaaaaaaaaa0");
    expect(playableCount(queue)).toBe(0);
    // The cursor has nowhere to go, so the transition is a no-op rather than a
    // loop hunting for a playable track that does not exist.
    expect(next(queue)).toBe(queue);
  });
});

describe("setShuffle", () => {
  it("keeps the current track current when toggling on", () => {
    const queue = next(next(unshuffled()));
    const shuffled = setShuffle(queue, true, 42);
    expect(shuffled.shuffled).toBe(true);
    expect(currentTrack(shuffled)?.youtubeId).toBe("aaaaaaaaaa2");
  });

  it("restores authored order when toggling off", () => {
    const queue = createQueue(FIXTURE_TRACKS, { seed: 9 });
    const linear = setShuffle(queue, false);
    expect(linear.order).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("jumpToId", () => {
  it("moves the cursor onto a known track and ignores an unknown one", () => {
    const queue = unshuffled();
    expect(currentTrack(jumpToId(queue, "aaaaaaaaaa3"))?.youtubeId).toBe("aaaaaaaaaa3");
    expect(jumpToId(queue, "zzzzzzzzzzz")).toBe(queue);
  });
});
