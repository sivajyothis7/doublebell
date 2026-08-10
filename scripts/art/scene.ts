/**
 * The artwork.
 *
 * Four plates — morning and night, landscape and portrait — drawn here as SVG and
 * rasterised by `npm run art`. Nothing on this page is a photograph or a generated
 * image: it is a screen-print-flavoured poster of the one thing this site is about,
 * a private bus on a road somewhere between two Kerala towns, built out of shapes
 * so it can be re-lit, re-composed for a phone, and corrected when it is wrong.
 *
 * **What makes it Kerala rather than generically tropical.** A palm on a beach is
 * anywhere. This is the specific stack you see out of a bus window between two
 * towns, and every layer of it is here for that reason:
 *
 *  · laterite — the red cut earth this state is built on and out of, left standing
 *    wherever a road was carved into a slope
 *  · greenery that presses in rather than decorates: coconut over banana over
 *    undergrowth, close enough to the tar to touch the bus
 *  · a Mangalore-tiled roof with one lit window behind the trees
 *  · paddy and backwater on the low side, a country boat pulled up in it
 *  · a spire on the skyline, and the Ghats behind it in monsoon haze
 *  · wet tar, because it has just rained, because it is Kerala
 *
 * Two rules the drawing follows, both deliberate:
 *
 *  · **No text of any kind.** The destination board is blank amber. Every word on
 *    this site is HTML — a raster would put Malayalam beyond selection, search and
 *    screen readers, and would render it badly besides.
 *  · **No real operator's livery, name or number plate.** Kerala's private buses
 *    are individually owned and the paintwork is the owner's signature. This is a
 *    generic bus wearing generic stripes; recognising a specific one would be a bug.
 */

import { type Palette, PALETTES, type Period } from "./palette";

export type Orientation = "landscape" | "portrait";

export type SceneOptions = { period: Period; orientation: Orientation };

type Frame = {
  width: number;
  height: number;
  /** Where the ground meets the sky. */
  horizon: number;
  /** Half-width of the tar at the bottom edge, as a fraction of width. */
  roadHalf: number;
  /** How wide the bus is, as a fraction of width. */
  busWidth: number;
  /** Where the bus centre sits, as a fraction of width. */
  busX: number;
  /** Where the wheels touch, as a fraction of height. */
  busBase: number;
};

/**
 * Landscape leaves the bus room to be looked at and keeps the left third open for
 * the title; portrait brings it much nearer and drops the horizon, because a phone
 * that simply crops the wide plate gets a tall picture of sky with a speck in it.
 */
const FRAMES: Record<Orientation, Frame> = {
  landscape: {
    width: 1600,
    height: 900,
    horizon: 470,
    roadHalf: 0.56,
    busWidth: 0.34,
    busX: 0.74,
    busBase: 0.95,
  },
  portrait: {
    width: 900,
    height: 1600,
    horizon: 900,
    roadHalf: 0.74,
    busWidth: 0.62,
    busX: 0.55,
    busBase: 0.9,
  },
};

/** Deterministic noise, so re-running the build produces byte-identical plates. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = (value: number) => Math.round(value * 10) / 10;

/** Is this the tall plate? Several layers compose differently for a phone. */
const isTall = (frame: Frame) => frame.height > frame.width;

/* ─────────────────────────────────────────────────────────────────── sky ── */

function sky(frame: Frame, palette: Palette): string {
  const { width, height, horizon } = frame;
  const disc = palette.lit
    ? { x: width * 0.8, y: height * 0.1 }
    : { x: width * 0.24, y: horizon - height * 0.14 };

  let stars = "";
  if (palette.starOpacity > 0) {
    const next = random(20260810);
    const points: string[] = [];
    for (let i = 0; i < 110; i++) {
      points.push(
        `<circle cx="${r(next() * width)}" cy="${r(next() * horizon * 0.85)}" ` +
          `r="${r(0.7 + next() * 1.6)}" fill="#fff" opacity="${r(0.2 + next() * 0.75)}"/>`,
      );
    }
    stars = `<g opacity="${palette.starOpacity}">${points.join("")}</g>`;
  }

  return `<rect width="${width}" height="${r(horizon + 4)}" fill="url(#sky)"/>
  ${stars}
  <circle cx="${r(disc.x)}" cy="${r(disc.y)}" r="${palette.discRadius * 5}" fill="url(#bloom)"/>
  <circle cx="${r(disc.x)}" cy="${r(disc.y)}" r="${palette.discRadius}" fill="${palette.discFill}" opacity="0.96"/>`;
}

/** One ridge of the Ghats, flat-bottomed at the horizon. */
function ridge(frame: Frame, seed: number, top: number, amplitude: number, fill: string): string {
  const next = random(seed);
  const steps = 10;
  const points: string[] = [`0,${r(frame.horizon)}`];
  for (let i = 0; i <= steps; i++) {
    points.push(`${r((frame.width / steps) * i)},${r(top + amplitude * (next() - 0.5) * 2)}`);
  }
  points.push(`${frame.width},${r(frame.horizon)}`);
  return `<polygon points="${points.join(" ")}" fill="${fill}"/>`;
}

/**
 * A church or mosque on the skyline — a spire, a cross-bar and a little dome. Both
 * are on every one of these roads, and at this size they read the same.
 */
function spire(frame: Frame, palette: Palette): string {
  const x = frame.width * 0.11;
  const base = frame.horizon - frame.height * 0.005;
  const h = frame.height * 0.1;
  const w = h * 0.16;
  return `<g fill="${palette.spire}">
    <rect x="${r(x - w * 1.9)}" y="${r(base - h * 0.42)}" width="${r(w * 3.8)}" height="${r(h * 0.42)}"/>
    <polygon points="${r(x - w)},${r(base - h * 0.42)} ${r(x + w)},${r(base - h * 0.42)} ${r(x)},${r(base - h)}"/>
    <rect x="${r(x - w * 0.16)}" y="${r(base - h * 1.2)}" width="${r(w * 0.32)}" height="${r(h * 0.22)}"/>
    <rect x="${r(x - w * 0.52)}" y="${r(base - h * 1.13)}" width="${r(w * 1.04)}" height="${r(h * 0.07)}"/>
  </g>`;
}

/* ────────────────────────────────────────────────────────────── vegetation ── */

/**
 * A coconut palm: a trunk that leans, and fronds falling away from the crown.
 * Drawn rather than sourced, so the lean and the frond count vary per tree and the
 * row does not look stamped out.
 */
function palm(
  x: number,
  baseY: number,
  scale: number,
  lean: number,
  fill: string,
  seed: number,
): string {
  const next = random(seed);
  const h = 200 * scale;
  const crownX = x + lean * h * 0.24;
  const crownY = baseY - h;
  const wBase = 8 * scale;
  const wTop = 4 * scale;

  const trunk =
    `<path d="M ${r(x - wBase)} ${r(baseY)} Q ${r(x + lean * h * 0.05)} ${r(baseY - h * 0.55)} ` +
    `${r(crownX - wTop)} ${r(crownY)} L ${r(crownX + wTop)} ${r(crownY)} ` +
    `Q ${r(x + lean * h * 0.05 + wBase)} ${r(baseY - h * 0.55)} ${r(x + wBase)} ${r(baseY)} Z" fill="${fill}"/>`;

  const fronds: string[] = [];
  const count = 8 + Math.floor(next() * 3);
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI + (Math.PI * (i + 0.5)) / count + (next() - 0.5) * 0.22;
    const length = (84 + next() * 40) * scale;
    const tipX = crownX + Math.cos(angle) * length;
    const tipY = crownY + Math.sin(angle) * length * 0.55 + length * 0.5;
    const midX = crownX + Math.cos(angle) * length * 0.5;
    const midY = crownY + Math.sin(angle) * length * 0.5 - length * 0.16;
    const spread = (5 + next() * 4) * scale;
    fronds.push(
      `<path d="M ${r(crownX)} ${r(crownY)} Q ${r(midX)} ${r(midY)} ${r(tipX)} ${r(tipY)} ` +
        `Q ${r(midX + spread * 0.4)} ${r(midY + spread * 1.6)} ${r(crownX)} ${r(crownY + spread)} Z" fill="${fill}"/>`,
    );
  }

  // The nuts, which are what make it read as a coconut palm rather than a fern.
  const nuts =
    `<circle cx="${r(crownX - 5 * scale)}" cy="${r(crownY + 8 * scale)}" r="${r(4.5 * scale)}" fill="${fill}"/>` +
    `<circle cx="${r(crownX + 6 * scale)}" cy="${r(crownY + 10 * scale)}" r="${r(4 * scale)}" fill="${fill}"/>`;

  return `<g>${trunk}${fronds.join("")}${nuts}</g>`;
}

/**
 * A banana plant: a short stem and five or six broad paddle leaves fanned around
 * it. These are what actually crowd a Kerala verge under the coconuts, and their
 * flat mass is what stops the foreground reading as a row of sticks.
 */
function banana(
  x: number,
  baseY: number,
  scale: number,
  fill: string,
  shade: string,
  seed: number,
): string {
  const next = random(seed);
  const stem = 52 * scale;
  const parts: string[] = [
    `<rect x="${r(x - 4 * scale)}" y="${r(baseY - stem)}" width="${r(8 * scale)}" height="${r(stem)}" fill="${shade}"/>`,
  ];

  const count = 5 + Math.floor(next() * 2);
  for (let i = 0; i < count; i++) {
    // Fan the leaves either side, the outer ones drooping nearly to the ground.
    const t = (i + 0.5) / count;
    const angle = -Math.PI * 0.92 + Math.PI * 0.84 * t;
    const length = (96 + next() * 46) * scale;
    const width = (26 + next() * 12) * scale;
    const tipX = x + Math.cos(angle) * length;
    const tipY = baseY - stem + Math.sin(angle) * length * 0.7 + length * 0.28;
    const midX = x + Math.cos(angle) * length * 0.5;
    const midY = baseY - stem + Math.sin(angle) * length * 0.5;
    parts.push(
      `<path d="M ${r(x)} ${r(baseY - stem)} ` +
        `Q ${r(midX)} ${r(midY - width)} ${r(tipX)} ${r(tipY)} ` +
        `Q ${r(midX)} ${r(midY + width)} ${r(x)} ${r(baseY - stem)} Z" ` +
        `fill="${i % 2 === 0 ? fill : shade}"/>`,
    );
  }

  return `<g>${parts.join("")}</g>`;
}

/**
 * The far tree line: a dense band of small palms along the horizon, standing in a
 * flat mass of canopy. Kerala's middle distance is never open — there is always
 * another row of trees behind the one you can see.
 */
function treeLine(frame: Frame, palette: Palette): string {
  const { width, horizon, height } = frame;
  const out: string[] = [
    `<rect x="0" y="${r(horizon - height * 0.035)}" width="${width}" height="${r(height * 0.045)}" fill="${palette.canopyFar}" opacity="0.85"/>`,
  ];
  const count = isTall(frame) ? 12 : 20;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    out.push(
      palm(
        width * (-0.02 + t * 1.04),
        horizon + 4,
        0.3 + ((i * 29) % 9) / 40,
        (((i * 47) % 7) - 3) / 14,
        palette.canopyFar,
        700 + i * 11,
      ),
    );
  }
  return out.join("");
}

/** The mid-ground palms, close enough to the road to lean over it. */
function midPalms(frame: Frame, palette: Palette): string {
  const { width, horizon, height } = frame;
  const stops = isTall(frame)
    ? [0.03, 0.13, 0.24, 0.8, 0.9, 0.99]
    : [0.02, 0.09, 0.16, 0.24, 0.32, 0.86, 0.93, 0.99];

  return stops
    .map((t, i) => {
      // Nearer the frame edge means nearer the viewer, so bigger and lower.
      const nearness = Math.abs(t - 0.5) * 2;
      return palm(
        width * t,
        horizon + height * (0.03 + nearness * 0.16),
        0.65 + nearness * 0.5,
        (t < 0.5 ? -1 : 1) * (0.1 + ((i * 31) % 5) / 30),
        palette.canopy,
        3100 + i * 13,
      );
    })
    .join("");
}

/* ─────────────────────────────────────────────────────── ground and road ── */

/**
 * Paddy and backwater on the low side of the road, with bunds across it and a
 * country boat pulled up. The water is what the mist sits on in the morning and
 * what throws the moon back at night.
 */
function paddy(frame: Frame, palette: Palette): string {
  const { width, height, horizon } = frame;
  const depth = height - horizon;
  const edgeX = width * 0.34;
  const nearY = horizon + depth * 0.5;

  const bunds = [0.18, 0.34]
    .map((t) => {
      const y = horizon + depth * t;
      return (
        `<path d="M 0 ${r(y)} L ${r(edgeX * (1 - t * 0.9))} ${r(y - depth * 0.02)}" ` +
        `stroke="${palette.lateriteShade}" stroke-width="${r(2 + t * 6)}" fill="none" opacity="0.7"/>`
      );
    })
    .join("");

  // A vallam: a long shallow hull with a raised prow, seen almost end-on.
  const bx = width * 0.14;
  const by = horizon + depth * 0.24;
  const bl = width * 0.1;
  const boat =
    `<path d="M ${r(bx)} ${r(by)} Q ${r(bx + bl * 0.5)} ${r(by + depth * 0.022)} ${r(bx + bl)} ${r(by - depth * 0.004)} ` +
    `L ${r(bx + bl)} ${r(by - depth * 0.016)} Q ${r(bx + bl * 0.5)} ${r(by + depth * 0.006)} ${r(bx)} ${r(by - depth * 0.012)} Z" ` +
    `fill="${palette.boat}"/>` +
    `<path d="M ${r(bx + bl)} ${r(by - depth * 0.016)} L ${r(bx + bl * 1.16)} ${r(by - depth * 0.05)}" ` +
    `stroke="${palette.boat}" stroke-width="${r(width * 0.003)}"/>`;

  return `<polygon points="0,${r(horizon)} ${r(edgeX)},${r(horizon)} ${r(edgeX * 0.55)},${r(nearY)} 0,${r(nearY + depth * 0.12)}" fill="${palette.water}"/>
  <polygon points="0,${r(horizon + 1)} ${r(edgeX * 0.8)},${r(horizon + 1)} ${r(edgeX * 0.55)},${r(horizon + depth * 0.11)} 0,${r(horizon + depth * 0.14)}" fill="${palette.waterSheen}" opacity="${palette.lit ? 0.22 : 0.34}"/>
  ${bunds}
  ${boat}`;
}

/**
 * A tiled-roof house behind the trees. One lit window at night, which is the whole
 * reason it is here: it puts somebody at home on the other side of the glass.
 */
function house(frame: Frame, palette: Palette): string {
  const { width, height, horizon } = frame;
  const w = width * (isTall(frame) ? 0.16 : 0.095);
  const h = w * 0.56;
  const x = width * (isTall(frame) ? 0.08 : 0.4);
  const base = horizon + height * 0.028;

  return `<g>
    <!-- a plinth, because a Kerala house stands a step above its own yard -->
    <rect x="${r(x - w * 0.06)}" y="${r(base - h * 0.16)}" width="${r(w * 1.12)}" height="${r(h * 0.16)}" fill="${palette.lateriteShade}"/>
    <rect x="${r(x)}" y="${r(base - h)}" width="${r(w)}" height="${r(h)}" fill="${palette.houseWall}"/>
    <!-- Mangalore tiles: a low hip roof, overhanging well past the wall -->
    <polygon points="${r(x - w * 0.1)},${r(base - h)} ${r(x + w * 1.1)},${r(base - h)} ${r(x + w * 0.78)},${r(base - h * 1.5)} ${r(x + w * 0.22)},${r(base - h * 1.5)}" fill="${palette.houseRoof}"/>
    <rect x="${r(x + w * 0.18)}" y="${r(base - h * 0.72)}" width="${r(w * 0.22)}" height="${r(h * 0.4)}" fill="${palette.houseWindow}" opacity="${palette.lit ? 0.95 : 0.7}"/>
    ${palette.lit ? `<rect x="${r(x + w * 0.02)}" y="${r(base - h * 0.95)}" width="${r(w * 0.56)}" height="${r(h * 0.8)}" fill="url(#windowGlow)"/>` : ""}
  </g>`;
}

function ground(frame: Frame, palette: Palette): string {
  const { width, height, horizon } = frame;
  const depth = height - horizon;
  // The road runs almost straight at the viewer, its vanishing point a little right
  // of centre so the bus can sit on the near lane without facing us dead-on.
  const vanishX = width * 0.53;
  const halfBottom = width * frame.roadHalf;

  const dashes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    const step = (i + 0.55) / 10;
    // Equal steps in the world are tiny on screen near the horizon.
    const e1 = t ** 2.6;
    const e2 = step ** 2.6;
    const y1 = horizon + depth * e1;
    const y2 = horizon + depth * e2;
    if (y2 - y1 < 1.5) continue;
    const c1 = vanishX + (width * 0.5 - vanishX) * e1;
    const c2 = vanishX + (width * 0.5 - vanishX) * e2;
    const w1 = 1.2 + 13 * e1;
    const w2 = 1.2 + 13 * e2;
    dashes.push(
      `<polygon points="${r(c1 - w1)},${r(y1)} ${r(c1 + w1)},${r(y1)} ${r(c2 + w2)},${r(y2)} ${r(c2 - w2)},${r(y2)}" ` +
        `fill="${palette.roadLine}" opacity="0.85"/>`,
    );
  }

  /**
   * The laterite cut on the high side. Where a Kerala road was carved into a slope,
   * the red earth is left standing in a vertical face with the trees on top of it —
   * and that face, more than the palms, is what places this in Kerala.
   */
  const cut =
    `<polygon points="${r(vanishX + 10)},${r(horizon)} ${width},${r(horizon + depth * 0.1)} ${width},${r(horizon + depth * 0.34)} ${r(vanishX + 14)},${r(horizon + 2)}" fill="${palette.laterite}"/>` +
    `<polygon points="${r(vanishX + 10)},${r(horizon)} ${width},${r(horizon + depth * 0.1)} ${width},${r(horizon + depth * 0.16)} ${r(vanishX + 12)},${r(horizon + 1)}" fill="${palette.lateriteShade}" opacity="0.8"/>`;

  // Wet tar: it has just rained, so the lamps and the LEDs smear down the road.
  const wet = palette.lit
    ? `<ellipse cx="${r(width * frame.busX)}" cy="${r(height * 0.99)}" rx="${r(width * 0.34)}" ry="${r(depth * 0.16)}" fill="url(#sheen)"/>` +
      `<ellipse cx="${r(width * 0.36)}" cy="${r(height * 0.93)}" rx="${r(width * 0.1)}" ry="${r(depth * 0.03)}" fill="${palette.waterSheen}" opacity="0.14"/>`
    : "";

  return `<rect x="0" y="${r(horizon)}" width="${width}" height="${r(depth)}" fill="${palette.shoulder}"/>
  ${paddy(frame, palette)}
  ${cut}
  <!-- the tar, with a pale edge line down each side -->
  <polygon points="${r(vanishX - 9)},${r(horizon)} ${r(vanishX + 9)},${r(horizon)} ${r(width * 0.5 + halfBottom)},${height} ${r(width * 0.5 - halfBottom)},${height}" fill="${palette.road}"/>
  <polygon points="${r(vanishX - 9)},${r(horizon)} ${r(vanishX - 6)},${r(horizon)} ${r(width * 0.5 - halfBottom * 0.94)},${height} ${r(width * 0.5 - halfBottom)},${height}" fill="${palette.roadEdge}" opacity="0.3"/>
  <polygon points="${r(vanishX + 6)},${r(horizon)} ${r(vanishX + 9)},${r(horizon)} ${r(width * 0.5 + halfBottom)},${height} ${r(width * 0.5 + halfBottom * 0.94)},${height}" fill="${palette.roadEdge}" opacity="0.3"/>
  ${wet}
  ${dashes.join("")}`;
}

/** Electric poles down the near shoulder, wires dipping between them. */
function poles(frame: Frame, palette: Palette): string {
  const out: string[] = [];
  const tops: { x: number; top: number }[] = [];

  for (const t of [0.34, 0.52, 0.72, 0.95]) {
    const y = frame.horizon + (frame.height - frame.horizon) * t ** 1.7;
    const scale = 0.35 + t * 1.5;
    const x = frame.width * (0.09 - t * 0.075);
    const h = frame.height * 0.13 * scale;
    const w = 3 * scale;
    out.push(
      `<rect x="${r(x - w / 2)}" y="${r(y - h)}" width="${r(w)}" height="${r(h)}" fill="${palette.pole}"/>` +
        `<rect x="${r(x - w * 2.6)}" y="${r(y - h)}" width="${r(w * 5.2)}" height="${r(w * 0.9)}" fill="${palette.pole}"/>`,
    );
    tops.push({ x, top: y - h });
  }

  for (let i = 0; i < tops.length - 1; i++) {
    const a = tops[i];
    const b = tops[i + 1];
    if (!a || !b) continue;
    const sag = Math.abs(b.x - a.x) * 0.22 + 6;
    out.push(
      `<path d="M ${r(a.x)} ${r(a.top + 2)} Q ${r((a.x + b.x) / 2)} ${r((a.top + b.top) / 2 + sag)} ` +
        `${r(b.x)} ${r(b.top + 2)}" stroke="${palette.pole}" stroke-width="${r(1.4 + i * 0.6)}" fill="none" opacity="0.85"/>`,
    );
  }

  return out.join("");
}

/**
 * The undergrowth at the frame edge: two near palms and three banana plants, dark
 * and out of focus, pressing in on the tar. This is the layer that turns a flat
 * poster into something seen *from* somewhere.
 */
function foreground(frame: Frame, palette: Palette): string {
  const { width, height } = frame;
  return [
    palm(width * 0.03, height * 1.03, 1.75, -0.26, palette.canopyNear, 4242),
    palm(width * 0.98, height * 1.07, 1.95, 0.24, palette.canopyNear, 1717),
    banana(width * 0.12, height * 1.02, 1.25, palette.banana, palette.bananaShade, 5150),
    banana(width * -0.01, height * 0.95, 1, palette.banana, palette.bananaShade, 6161),
    banana(width, height * 0.99, 1.35, palette.banana, palette.bananaShade, 7272),
  ].join("");
}

/* ─────────────────────────────────────────────────────────────────── bus ── */

/**
 * The bus, three-quarter front, coming at the viewer.
 *
 * Boxy, because they are: a flat two-pane windscreen under a blank destination
 * board, the roof edge lined with LEDs, a long flank of windows, and the loud
 * two-tone lower body every operator paints differently. The front face is drawn
 * over the flank, which is what makes the angle read.
 */
function bus(frame: Frame, palette: Palette): string {
  const w = frame.width * frame.busWidth;
  const h = w * 0.92;
  const cx = frame.width * frame.busX;
  const base = frame.height * frame.busBase;
  const x = cx - w * 0.5;
  const y = base - h;

  const fw = w * 0.62;
  const flank = w - fw;
  /** How much the flank's far end rises, i.e. the foreshortening. */
  const rise = h * 0.11;

  const glassTop = y + h * 0.17;
  const glassH = h * 0.26;
  const beltY = y + h * 0.55;

  /** One pinstripe: square across the front face, sheared along the flank. */
  const stripe = (top: number, thickness: number, fill: string, opacity = 1) =>
    `<rect x="${r(x)}" y="${r(top)}" width="${r(fw)}" height="${r(thickness)}" fill="${fill}" opacity="${opacity}"/>` +
    `<polygon points="${r(x + fw)},${r(top)} ${r(x + w)},${r(top + rise * 0.4)} ` +
    `${r(x + w)},${r(top + rise * 0.4 + thickness)} ${r(x + fw)},${r(top + thickness)}" ` +
    `fill="${fill}" opacity="${opacity}"/>`;

  const windows: string[] = [];
  const heads: string[] = [];
  const count = 5;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const gap = (flank * 0.94) / count;
    const wx = x + fw + gap * i + flank * 0.03;
    const shrink = 1 - t * 0.3;
    const top = glassTop + rise * t + h * 0.012;
    windows.push(
      `<rect x="${r(wx)}" y="${r(top)}" width="${r(gap * 0.78)}" height="${r(glassH * shrink)}" rx="${r(w * 0.008)}" ` +
        `fill="${palette.lit ? palette.glassLit : palette.glass}" opacity="${palette.lit ? 0.95 : 0.9}"/>`,
    );
    if (palette.lit) {
      // A head in most windows. This is a bus with people on it.
      heads.push(
        `<circle cx="${r(wx + gap * 0.36)}" cy="${r(top + glassH * shrink * 0.72)}" r="${r(w * 0.018 * shrink)}" fill="#2a1a0c" opacity="0.5"/>`,
      );
    }
  }

  const beams = palette.lit
    ? `<polygon points="${r(x + fw * 0.13)},${r(y + h * 0.78)} ${r(x - w * 0.95)},${frame.height} ${r(x + fw * 0.2)},${frame.height} ${r(x + fw * 0.34)},${r(y + h * 0.84)}" fill="url(#beam)"/>
       <polygon points="${r(x + fw * 0.82)},${r(y + h * 0.78)} ${r(x + fw * 0.72)},${frame.height} ${r(x + w * 1.5)},${frame.height} ${r(x + fw * 1.02)},${r(y + h * 0.84)}" fill="url(#beam)"/>`
    : "";

  return `${beams}
  <g>
    <ellipse cx="${r(cx)}" cy="${r(base + h * 0.015)}" rx="${r(w * 0.55)}" ry="${r(h * 0.045)}" fill="#000" opacity="${palette.lit ? 0.55 : 0.3}"/>

    <!-- flank: upper body, then lower body -->
    <path d="M ${r(x + fw)} ${r(y)} L ${r(x + w)} ${r(y + rise)} L ${r(x + w)} ${r(beltY + rise * 0.4)} L ${r(x + fw)} ${r(beltY)} Z" fill="${palette.busUpperShade}"/>
    <path d="M ${r(x + fw)} ${r(beltY)} L ${r(x + w)} ${r(beltY + rise * 0.4)} L ${r(x + w)} ${r(base - h * 0.06)} L ${r(x + fw)} ${r(base - h * 0.02)} Z" fill="${palette.busLowerShade}"/>
    ${windows.join("")}
    ${heads.join("")}

    <!-- front face -->
    <rect x="${r(x)}" y="${r(y)}" width="${r(fw)}" height="${r(h * 0.98)}" rx="${r(w * 0.035)}" fill="${palette.busUpper}"/>
    <rect x="${r(x)}" y="${r(beltY)}" width="${r(fw)}" height="${r(base - beltY - h * 0.02)}" fill="${palette.busLower}"/>

    <!-- the pinstripes between the two bodies: as many as will fit -->
    ${stripe(beltY - h * 0.035, h * 0.024, palette.stripeA)}
    ${stripe(beltY - h * 0.007, h * 0.011, palette.stripeB)}
    ${stripe(beltY + h * 0.008, h * 0.006, palette.chrome, 0.8)}

    <!-- roof and the LED strip along its edge -->
    <rect x="${r(x - w * 0.012)}" y="${r(y - h * 0.028)}" width="${r(fw + w * 0.024)}" height="${r(h * 0.042)}" rx="${r(h * 0.02)}" fill="${palette.busRoof}"/>
    <path d="M ${r(x + fw)} ${r(y - h * 0.012)} L ${r(x + w)} ${r(y + rise - h * 0.005)} L ${r(x + w)} ${r(y + rise + h * 0.02)} L ${r(x + fw)} ${r(y + h * 0.022)} Z" fill="${palette.busRoof}"/>
    <rect x="${r(x + fw * 0.06)}" y="${r(y - h * 0.004)}" width="${r(fw * 0.88)}" height="${r(h * 0.012)}" rx="${r(h * 0.006)}" fill="${palette.led}" opacity="${palette.lit ? 1 : 0.8}"/>
    ${palette.lit ? `<rect x="${r(x + fw * 0.02)}" y="${r(y - h * 0.03)}" width="${r(fw * 0.96)}" height="${r(h * 0.075)}" fill="url(#ledGlow)"/>` : ""}

    <!-- destination board: blank on purpose, every word on this site is HTML -->
    <rect x="${r(x + fw * 0.09)}" y="${r(y + h * 0.048)}" width="${r(fw * 0.82)}" height="${r(h * 0.072)}" rx="${r(h * 0.008)}" fill="${palette.busUpperShade}"/>
    <rect x="${r(x + fw * 0.105)}" y="${r(y + h * 0.056)}" width="${r(fw * 0.79)}" height="${r(h * 0.056)}" rx="${r(h * 0.005)}" fill="${palette.board}" opacity="0.95"/>
    ${palette.lit ? `<rect x="${r(x + fw * 0.1)}" y="${r(y + h * 0.05)}" width="${r(fw * 0.8)}" height="${r(h * 0.072)}" rx="${r(h * 0.008)}" fill="url(#boardGlow)"/>` : ""}

    <!-- windscreen, split by the centre pillar these buses all have -->
    <rect x="${r(x + fw * 0.055)}" y="${r(glassTop)}" width="${r(fw * 0.42)}" height="${r(glassH)}" rx="${r(w * 0.012)}" fill="${palette.lit ? palette.glass : palette.glassLit}"/>
    <rect x="${r(x + fw * 0.525)}" y="${r(glassTop)}" width="${r(fw * 0.42)}" height="${r(glassH)}" rx="${r(w * 0.012)}" fill="${palette.lit ? palette.glass : palette.glassLit}"/>
    ${palette.lit ? `<rect x="${r(x + fw * 0.525)}" y="${r(glassTop)}" width="${r(fw * 0.42)}" height="${r(glassH)}" rx="${r(w * 0.012)}" fill="${palette.glassLit}" opacity="0.3"/>` : ""}
    <path d="M ${r(x + fw * 0.16)} ${r(glassTop + glassH * 0.94)} L ${r(x + fw * 0.34)} ${r(glassTop + glassH * 0.42)}" stroke="${palette.tyre}" stroke-width="${r(w * 0.006)}" opacity="0.55"/>
    <path d="M ${r(x + fw * 0.62)} ${r(glassTop + glassH * 0.94)} L ${r(x + fw * 0.8)} ${r(glassTop + glassH * 0.42)}" stroke="${palette.tyre}" stroke-width="${r(w * 0.006)}" opacity="0.55"/>

    <!-- entry door on the near corner, where the conductor hangs out of it -->
    <polygon points="${r(x + fw + flank * 0.015)},${r(glassTop + h * 0.01)} ${r(x + fw + flank * 0.075)},${r(glassTop + rise * 0.03 + h * 0.01)} ${r(x + fw + flank * 0.075)},${r(base - h * 0.1)} ${r(x + fw + flank * 0.015)},${r(base - h * 0.1)}" fill="${palette.glass}" opacity="0.9"/>

    <!-- grille, bumper, lamps -->
    <rect x="${r(x + fw * 0.2)}" y="${r(y + h * 0.63)}" width="${r(fw * 0.6)}" height="${r(h * 0.07)}" rx="${r(h * 0.008)}" fill="${palette.busLowerShade}" opacity="0.9"/>
    <rect x="${r(x - w * 0.008)}" y="${r(base - h * 0.13)}" width="${r(fw + w * 0.016)}" height="${r(h * 0.075)}" rx="${r(h * 0.012)}" fill="${palette.chrome}" opacity="0.92"/>
    <circle cx="${r(x + fw * 0.15)}" cy="${r(y + h * 0.79)}" r="${r(w * 0.038)}" fill="${palette.headlamp}"/>
    <circle cx="${r(x + fw * 0.85)}" cy="${r(y + h * 0.79)}" r="${r(w * 0.038)}" fill="${palette.headlamp}"/>
    <circle cx="${r(x + fw * 0.3)}" cy="${r(base - h * 0.09)}" r="${r(w * 0.018)}" fill="${palette.stripeA}" opacity="0.9"/>
    <circle cx="${r(x + fw * 0.7)}" cy="${r(base - h * 0.09)}" r="${r(w * 0.018)}" fill="${palette.stripeA}" opacity="0.9"/>
    ${
      palette.lit
        ? `<circle cx="${r(x + fw * 0.15)}" cy="${r(y + h * 0.79)}" r="${r(w * 0.12)}" fill="url(#lampGlow)"/>
           <circle cx="${r(x + fw * 0.85)}" cy="${r(y + h * 0.79)}" r="${r(w * 0.12)}" fill="url(#lampGlow)"/>`
        : ""
    }

    <!-- wheels -->
    <circle cx="${r(x + fw * 0.9)}" cy="${r(base - w * 0.05)}" r="${r(w * 0.058)}" fill="${palette.tyre}"/>
    <circle cx="${r(x + w * 0.9)}" cy="${r(base - h * 0.03 - w * 0.045)}" r="${r(w * 0.05)}" fill="${palette.tyre}"/>
  </g>`;
}

/* ─────────────────────────────────────────────────────────────── assemble ── */

function defs(palette: Palette, extra = ""): string {
  return `<defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${palette.skyTop}"/>
      <stop offset="58%" stop-color="${palette.skyMid}"/>
      <stop offset="100%" stop-color="${palette.skyLow}"/>
    </linearGradient>
    <radialGradient id="bloom">
      <stop offset="0%" stop-color="${palette.discGlow}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${palette.discGlow}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ledGlow">
      <stop offset="0%" stop-color="${palette.led}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${palette.led}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="boardGlow">
      <stop offset="0%" stop-color="${palette.board}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${palette.board}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lampGlow">
      <stop offset="0%" stop-color="${palette.headlampBeam}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${palette.headlampBeam}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="windowGlow">
      <stop offset="0%" stop-color="${palette.houseWindow}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${palette.houseWindow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${palette.headlampBeam}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${palette.headlampBeam}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="sheen">
      <stop offset="0%" stop-color="${palette.waterSheen}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="${palette.waterSheen}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${palette.mist}" stop-opacity="0"/>
      <stop offset="34%" stop-color="${palette.mist}" stop-opacity="${palette.mistOpacity}"/>
      <stop offset="100%" stop-color="${palette.mist}" stop-opacity="0"/>
    </linearGradient>
    ${extra}
  </defs>`;
}

/**
 * The layers, back to front. The order *is* the depth: sky, the Ghats, a spire, the
 * far tree line, the ground with its paddy and laterite and tar, the house behind
 * the mid palms, the poles, the bus, and finally the undergrowth pressing in at the
 * frame edge.
 */
function layers(frame: Frame, palette: Palette): string {
  const { width, height, horizon } = frame;
  return `${sky(frame, palette)}
  ${ridge(frame, 11, horizon - height * 0.12, height * 0.032, palette.hillFar)}
  ${ridge(frame, 23, horizon - height * 0.07, height * 0.024, palette.hillMid)}
  ${spire(frame, palette)}
  ${treeLine(frame, palette)}
  ${ground(frame, palette)}
  ${house(frame, palette)}
  ${midPalms(frame, palette)}
  ${poles(frame, palette)}
  ${bus(frame, palette)}
  ${foreground(frame, palette)}
  <rect x="0" y="${r(horizon - height * 0.16)}" width="${width}" height="${r(height * 0.34)}" fill="url(#mist)"/>`;
}

/** SVG for one plate. Pure string building — no I/O, so it is trivially testable. */
export function sceneSvg({ period, orientation }: SceneOptions): string {
  const palette = PALETTES[period];
  const frame = FRAMES[orientation];
  const { width, height } = frame;

  const vignette = `<linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.3"/>
      <stop offset="26%" stop-color="#000" stop-opacity="0"/>
      <stop offset="70%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.44"/>
    </linearGradient>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs(palette, vignette)}
  ${layers(frame, palette)}
  <rect width="${width}" height="${height}" fill="url(#vignette)"/>
</svg>`;
}

/**
 * The 1200×630 plate the share card is composed on: the same world, cropped wide,
 * with the left half darkened because a title goes there.
 */
export function ogSvg(): string {
  const palette = PALETTES.night;
  const frame: Frame = {
    width: 1200,
    height: 630,
    horizon: 300,
    roadHalf: 0.55,
    busWidth: 0.34,
    busX: 0.74,
    busBase: 0.93,
  };
  const { width, height } = frame;

  const plate = `<linearGradient id="plate" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#03060c" stop-opacity="0.88"/>
      <stop offset="52%" stop-color="#03060c" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#03060c" stop-opacity="0.08"/>
    </linearGradient>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs(palette, plate)}
  ${layers(frame, palette)}
  <rect width="${width}" height="${height}" fill="url(#plate)"/>
</svg>`;
}
