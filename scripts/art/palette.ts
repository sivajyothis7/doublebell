/**
 * The two lights the artwork is painted in.
 *
 * Both palettes are read off the same subject — a private bus on a two-lane road
 * between two Kerala towns — lit once by 6am and once by the last trip of the
 * night. The site's CSS custom properties are pulled from these, so the page and
 * the plate behind it never disagree about what colour the bus is.
 *
 * Hex rather than OKLCH: this is what librsvg renders, and it has no opinion
 * about modern colour syntax.
 */

export type Period = "morning" | "night";

export type Palette = {
  /** Sky, top to horizon. */
  skyTop: string;
  skyMid: string;
  skyLow: string;
  /** The sun or the moon, and the bloom around it. */
  discFill: string;
  discGlow: string;
  discRadius: number;
  /** Two ridges of the Ghats, far and near. */
  hillFar: string;
  hillMid: string;
  /** Water in the paddy, and the sheen it throws back. */
  water: string;
  waterSheen: string;
  /** Palms and the near vegetation, far to near. */
  canopyFar: string;
  canopy: string;
  canopyNear: string;
  /** Banana leaves in the foreground — the other plant on every Kerala verge. */
  banana: string;
  bananaShade: string;
  /** Laterite: the red cut earth this whole state is built on and out of. */
  laterite: string;
  lateriteShade: string;
  /** A tiled-roof house behind the trees, and the light in its window. */
  houseWall: string;
  houseRoof: string;
  houseWindow: string;
  /** A country boat on the water. */
  boat: string;
  /** A spire on the skyline — every one of these roads has one. */
  spire: string;
  /** Tar, its markings, the laterite shoulder, and the poles along it. */
  road: string;
  roadLine: string;
  roadEdge: string;
  shoulder: string;
  pole: string;
  /**
   * The bus. Kerala private-bus livery is loud on purpose and no two operators
   * paint the same: a pale upper body, a saturated lower band, and as many
   * pinstripes as will fit between them.
   */
  busUpper: string;
  busUpperShade: string;
  busLower: string;
  busLowerShade: string;
  stripeA: string;
  stripeB: string;
  busRoof: string;
  glass: string;
  glassLit: string;
  chrome: string;
  tyre: string;
  /** The strip of LEDs along the roof edge that gives these buses their look. */
  led: string;
  headlamp: string;
  headlampBeam: string;
  /** Blank amber destination board. All type on this site is HTML, never raster. */
  board: string;
  /** Haze sitting in the low ground. */
  mist: string;
  mistOpacity: number;
  starOpacity: number;
  /** Is this the night plate? Drives lamps, beams, wet tar and lit windows. */
  lit: boolean;
};

export const PALETTES: Record<Period, Palette> = {
  /*
   * 06:10. The mist has not lifted off the paddy yet, the sun is still low
   * behind the coconut line, and the paintwork is readable for the first time
   * since yesterday evening.
   */
  morning: {
    skyTop: "#6fa8c4",
    skyMid: "#d8bd94",
    skyLow: "#f7dcae",
    discFill: "#fff6d8",
    discGlow: "#ffc978",
    discRadius: 52,
    hillFar: "#93aab0",
    hillMid: "#5d7d76",
    water: "#a9c6ac",
    waterSheen: "#f5e6bd",
    canopyFar: "#4a7466",
    canopy: "#1f4436",
    canopyNear: "#123026",
    banana: "#2f6b46",
    bananaShade: "#1c4a31",
    laterite: "#b4643c",
    lateriteShade: "#8e4a2c",
    houseWall: "#f0e6d2",
    houseRoof: "#a8502f",
    houseWindow: "#8a7a5e",
    boat: "#3a2a1e",
    spire: "#2c4a44",
    road: "#55545a",
    roadLine: "#efe9d8",
    roadEdge: "#cfc7b2",
    shoulder: "#a3714c",
    pole: "#4a4038",
    busUpper: "#f2efe4",
    busUpperShade: "#cfc9b8",
    busLower: "#c4342b",
    busLowerShade: "#9a2621",
    stripeA: "#f0a83c",
    stripeB: "#1f6f8b",
    busRoof: "#fbf9f1",
    glass: "#8fb0b2",
    glassLit: "#d6e4dc",
    chrome: "#f7f4ec",
    tyre: "#211f20",
    led: "#ffffff",
    headlamp: "#fdf3d0",
    headlampBeam: "#ffe9a8",
    board: "#e8b04a",
    mist: "#f6ecd8",
    mistOpacity: 0.3,
    starOpacity: 0,
    lit: false,
  },

  /*
   * 21:40, the last trip. A little of the day is still in the sky near the
   * horizon, the tar is wet from the evening rain, and the only bright things
   * left are the roof LEDs, the headlamps and the windows.
   */
  night: {
    skyTop: "#060b18",
    skyMid: "#11203a",
    skyLow: "#2b4a5e",
    discFill: "#e9eff8",
    discGlow: "#7c9cc6",
    discRadius: 30,
    hillFar: "#182739",
    hillMid: "#101b28",
    water: "#0b1620",
    waterSheen: "#3d6178",
    canopyFar: "#122132",
    canopy: "#0a131c",
    canopyNear: "#050a0f",
    banana: "#0c1a1d",
    bananaShade: "#060f12",
    laterite: "#2e1c16",
    lateriteShade: "#1e120e",
    houseWall: "#1b2430",
    houseRoof: "#2a1a16",
    houseWindow: "#f0b657",
    boat: "#080d12",
    spire: "#0a141c",
    road: "#14181f",
    roadLine: "#a09a86",
    roadEdge: "#5b5747",
    shoulder: "#241a17",
    pole: "#0c1218",
    busUpper: "#cfd6d2",
    busUpperShade: "#8e9899",
    busLower: "#a92d25",
    busLowerShade: "#7a1f1a",
    stripeA: "#dd9a34",
    stripeB: "#2b7f9e",
    busRoof: "#dee4de",
    glass: "#16232c",
    glassLit: "#f3c874",
    chrome: "#dde5e9",
    tyre: "#0a0a0b",
    led: "#e3f2ff",
    headlamp: "#fff9e4",
    headlampBeam: "#ffe6a0",
    board: "#e0a03c",
    mist: "#22364a",
    mistOpacity: 0.3,
    starOpacity: 0.8,
    lit: true,
  },
};
