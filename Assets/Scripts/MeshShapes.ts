/**
 * MeshShapes - the geometry of every code-built mesh in this Lens.
 *
 * All sizes are centimetres. Unless noted, a shape stands on y = 0 and is
 * centred on x and z, with its front towards +Z (the user).
 */

import { Geo, RGBA, V3, circleOutline, roundRectOutline, mix, scaleRGB } from "./MeshKit";

// ---- palette (light tones: black is invisible on an additive display) ------
const BIRCH: RGBA = [0.82, 0.68, 0.48, 1];
const BIRCH_TOP: RGBA = [0.93, 0.83, 0.64, 1];
const BIRCH_SEAM: RGBA = [0.74, 0.6, 0.42, 1];
const STEEL: RGBA = [0.8, 0.83, 0.87, 1];
const STEEL_MID: RGBA = [0.66, 0.69, 0.74, 1];
const STEEL_DARK: RGBA = [0.5, 0.52, 0.57, 1];
const SOFT_WHITE: RGBA = [0.96, 0.96, 0.92, 1];
const FLAME_BLUE: RGBA = [0.45, 0.72, 1.0, 1];
const GROUNDS: RGBA = [0.62, 0.4, 0.22, 1];
export const COFFEE_DEEP: RGBA = [0.42, 0.24, 0.12, 1];
export const COFFEE_LIGHT: RGBA = [0.8, 0.58, 0.35, 1];
const WATER: RGBA = [0.62, 0.93, 1.0, 0.55];
const GAS_GREEN: RGBA = [0.4, 0.82, 0.44, 1];
const GAS_GREEN_LIGHT: RGBA = [0.56, 0.92, 0.58, 1];
const HOSE_ORANGE: RGBA = [1.0, 0.58, 0.18, 1];

// ---- shared dimensions -----------------------------------------------------
/** Height of the stove's pan supports: a kettle stands at this y on the stove. */
export const STOVE_TOP_Y = 8;
/**
 * Where the gas hose ends on the stove, in stove space: on the inlet nipple that
 * sticks out of the left (-X) face, towards the back.
 */
export const STOVE_GAS_INLET: V3 = [-13.0, 2.4, -8];
/** The kettle's round body is not at the mesh origin: the spout takes the +X side. */
export const KETTLE_BODY_AXIS_X = -3;
/** Centre of the spout opening, in kettle space. Water leaves here. */
export const KETTLE_SPOUT_TIP: V3 = [10.15, 10.9, 0];
export const GLASS_OUTER_RADIUS = 3.75;
export const GLASS_INNER_RADIUS = 3.5;
/** Inside bottom of the glass, in glass space: grounds and liquid stand at this y. */
export const GLASS_FLOOR_Y = 0.5;
export const GLASS_HEIGHT = 12;
export const LIQUID_RADIUS = 3.45;
/** Liquid height of a full 300 ml glass (its surface is then 0.5 cm below the rim). */
export const LIQUID_MAX_HEIGHT = 11;
export const STREAM_MAX_LENGTH = 14;
/** Number of scale ticks; tick i (1..6) marks i * 50 ml. */
export const TICK_COUNT = 6;
/** Height step between ticks: tick i sits at y = i * TICK_STEP above the scale origin. */
export const TICK_STEP = LIQUID_MAX_HEIGHT / TICK_COUNT;
/** Radius of the cylinder the ticks follow (just outside the glass). */
export const TICK_CYLINDER_RADIUS = 3.8;
const TICK_HALF_WIDTH = 1.0;
/**
 * Distance from the glass axis to the scale's origin plane (z = 0 of the scale).
 * Put the scale at glass position + (0, GLASS_FLOOR_Y, TICK_Z_FROM_AXIS).
 */
export const TICK_Z_FROM_AXIS = Math.sqrt(TICK_CYLINDER_RADIUS * TICK_CYLINDER_RADIUS - TICK_HALF_WIDTH * TICK_HALF_WIDTH);

/** Tabletop slab, 90 x 3 x 45, softly rounded edges, lighter top. */
export function buildTable(): Geo {
  const g = new Geo();
  const outline = roundRectOutline(45, 22.5, 1.2, 4);
  g.part("slab", true);
  g.sweep(
    outline,
    [[-0.5, 0], [-0.15, 0.15], [0, 0.5], [0, 2.5], [-0.15, 2.85], [-0.5, 3]],
    (i) => (i >= 3 ? mix(BIRCH, BIRCH_TOP, 0.5) : BIRCH),
    { smoothDeg: 50, capStart: scaleRGB(BIRCH, 0.9), capEnd: BIRCH_TOP }
  );
  // Two faint plank seams along the board, lying on the top face.
  g.part("seams", false);
  const y = 3.01;
  for (const z of [-7.5, 7.5]) {
    g.flatQuad([-43.5, y, z + 0.06], [43.5, y, z + 0.06], [43.5, y, z - 0.06], [-43.5, y, z - 0.06], [0, 1, 0], BIRCH_SEAM);
  }
  // Four square legs from the underside of the slab (y = 0) down to the floor,
  // set in from the corners and tapering slightly towards the foot.
  g.part("legs", false);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      tableLeg(g, sx * TABLE_LEG_INSET_X, sz * TABLE_LEG_INSET_Z);
    }
  }
  return g;
}

/** Length of the table legs: the slab's underside (y = 0) is this far above the floor. */
export const TABLE_LEG_LENGTH = 87;
const TABLE_LEG_INSET_X = 40;
const TABLE_LEG_INSET_Z = 18;
const TABLE_LEG_HALF_TOP = 2.4;
const TABLE_LEG_HALF_FOOT = 1.8;

/** One leg centred on (cx, cz), from y = 0 down to y = -TABLE_LEG_LENGTH. Faces are tinted so the leg reads as a solid post. */
function tableLeg(g: Geo, cx: number, cz: number): void {
  const a = TABLE_LEG_HALF_TOP;
  const b = TABLE_LEG_HALF_FOOT;
  const y1 = 0;
  const y0 = -TABLE_LEG_LENGTH;
  const front = scaleRGB(BIRCH, 0.95);
  const side = scaleRGB(BIRCH, 0.84);
  const back = scaleRGB(BIRCH, 0.76);
  g.flatQuad([cx - b, y0, cz + b], [cx + b, y0, cz + b], [cx + a, y1, cz + a], [cx - a, y1, cz + a], [0, 0, 1], front);
  g.flatQuad([cx + b, y0, cz - b], [cx - b, y0, cz - b], [cx - a, y1, cz - a], [cx + a, y1, cz - a], [0, 0, -1], back);
  g.flatQuad([cx + b, y0, cz + b], [cx + b, y0, cz - b], [cx + a, y1, cz - a], [cx + a, y1, cz + a], [1, 0, 0], side);
  g.flatQuad([cx - b, y0, cz - b], [cx - b, y0, cz + b], [cx - a, y1, cz + a], [cx - a, y1, cz - a], [-1, 0, 0], side);
  g.flatQuad([cx - b, y0, cz - b], [cx + b, y0, cz - b], [cx + b, y0, cz + b], [cx - b, y0, cz + b], [0, -1, 0], back);
}

/** Single-burner stove, 26 x 8 x 26. Burner at the centre, knob on the front (+Z). */
export function buildStove(): Geo {
  const g = new Geo();
  const outline = roundRectOutline(13, 13, 3.2, 5);
  g.part("body", true);
  g.sweep(
    outline,
    [[-0.3, 0], [0, 0.3], [0, 1.0], [-1.2, 1.0], [-1.2, 5.1], [-1.6, 5.5]],
    (i) => (i < 3 ? STEEL_MID : STEEL),
    { smoothDeg: 30, capStart: STEEL_DARK, capEnd: scaleRGB(STEEL, 0.9) }
  );

  const ring = circleOutline(28);
  g.part("burner ring", false);
  g.sweep(ring, [[5.6, 5.5], [5.6, 6.2], [5.3, 6.5], [3.9, 6.5], [3.6, 6.2], [3.6, 5.5]], () => STEEL_DARK, { smoothDeg: 50 });
  g.part("flame ring", false);
  g.sweep(ring, [[3.4, 5.5], [3.4, 5.9], [2.8, 5.9], [2.8, 5.5]], () => FLAME_BLUE);
  g.part("burner cap", false);
  g.sweep(ring, [[2.6, 5.5], [2.6, 6.0], [2.2, 6.3], [0, 6.3]], () => STEEL_MID, { smoothDeg: 50 });

  // Four pan supports, up to STOVE_TOP_Y.
  g.part("supports", false);
  const hy = (STOVE_TOP_Y - 5.5) / 2;
  const cy = 5.5 + hy;
  g.box(7.2, cy, 0, 2.6, hy, 0.5, STEEL_DARK, STEEL_MID);
  g.box(-7.2, cy, 0, 2.6, hy, 0.5, STEEL_DARK, STEEL_MID);
  g.box(0, cy, 7.2, 0.5, hy, 2.6, STEEL_DARK, STEEL_MID);
  g.box(0, cy, -7.2, 0.5, hy, 2.6, STEEL_DARK, STEEL_MID);

  // Control knob on the front face (z = 11.8), turned so that its axis is +Z.
  const faceZ = 11.8;
  const knobY = 3.05;
  g.part("knob", false);
  g.withTransform(
    (v, isNormal) => (isNormal ? [v[0], -v[2], v[1]] : [v[0], knobY - v[2], faceZ + v[1]]),
    () => {
      g.sweep(circleOutline(20), [[1.6, 0], [1.6, 0.85], [1.3, 1.15], [0, 1.15]], () => STEEL_DARK, { smoothDeg: 50 });
    }
  );
  g.part("knob mark", false);
  g.flatQuad([-0.15, knobY + 0.2, 12.96], [0.15, knobY + 0.2, 12.96], [0.15, knobY + 1.2, 12.96], [-0.15, knobY + 1.2, 12.96], [0, 0, 1], SOFT_WHITE);

  // Gas inlet on the left face (x = -11.8): a hex nut and a nipple the hose slips over.
  const inY = STOVE_GAS_INLET[1];
  const inZ = STOVE_GAS_INLET[2];
  g.part("gas inlet", false);
  g.tube([[-11.7, inY, inZ], [-12.6, inY, inZ]], [0.8, 0.8], 6, () => STEEL_MID, undefined, STEEL);
  g.tube([[-12.5, inY, inZ], [STOVE_GAS_INLET[0] - 1.0, inY, inZ]], [GAS_NIPPLE_RADIUS, GAS_NIPPLE_RADIUS], 10, () => STEEL, undefined, STEEL_MID);
  return g;
}

/** Stovetop kettle, 22 x 18 x 16. Spout towards +X, handle arching over the lid. */
export function buildKettle(): Geo {
  const g = new Geo();
  const bx = KETTLE_BODY_AXIS_X;

  g.part("body", true);
  g.sweep(
    circleOutline(32, bx, 0),
    [
      [0, 0], [7.2, 0], [7.8, 0.6], [8.0, 2.2], [7.7, 4.5], [6.9, 7.0], [5.9, 9.0], [5.2, 10.2], [5.2, 10.6],
      // lid
      [4.9, 10.6], [4.9, 10.9], [4.2, 11.6], [2.8, 12.2], [1.2, 12.5],
      // knob
      [0.7, 12.5], [0.7, 12.9], [1.3, 13.2], [1.4, 13.8], [1.0, 14.3], [0, 14.4],
    ],
    (i) => {
      if (i < 3) return STEEL_MID;
      if (i < 8) return STEEL;
      if (i < 13) return scaleRGB(STEEL, 1.08);
      return SOFT_WHITE;
    },
    { smoothDeg: 40 }
  );

  // Spout: a short tube curving up and out to the right.
  g.part("spout", false);
  const p0: V3 = [bx + 6.0, 4.2, 0];
  const p1: V3 = [7.0, 4.8, 0];
  const p2: V3 = [8.6, 8.0, 0];
  const p3 = KETTLE_SPOUT_TIP;
  const spout: V3[] = [];
  const spoutR: number[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
    spout.push([
      b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0],
      b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1],
      0,
    ]);
    spoutR.push(1.7 + (0.95 - 1.7) * t);
  }
  g.tube(spout, spoutR, 12, () => STEEL, undefined, STEEL_DARK);

  // Handle: an arch over the lid, in the same plane as the spout.
  g.part("handle", false);
  const handle: V3[] = [];
  const handleR: number[] = [];
  const hs = 22;
  for (let i = 0; i <= hs; i++) {
    const a = -0.2 + (i / hs) * (Math.PI + 0.4);
    handle.push([bx + 5.3 * Math.cos(a), 9.6 + 7.7 * Math.sin(a), 0]);
    handleR.push(0.7);
  }
  g.tube(handle, handleR, 10, () => SOFT_WHITE, SOFT_WHITE, SOFT_WHITE);
  return g;
}

/** Open drinking glass, 7.5 x 12 x 7.5, see-through walls, brighter rim, thicker bottom. */
export function buildGlass(): Geo {
  const g = new Geo();
  const ro = GLASS_OUTER_RADIUS;
  const ri = GLASS_INNER_RADIUS;
  const h = GLASS_HEIGHT;
  const wall: RGBA = [0.72, 0.88, 1.0, 0.16];
  const inner: RGBA = [0.72, 0.88, 1.0, 0.08];
  const rim: RGBA = [0.88, 0.96, 1.0, 0.75];
  const base: RGBA = [0.74, 0.9, 1.0, 0.32];
  const cols: RGBA[] = [base, base, wall, rim, rim, rim, inner, base];
  g.part("glass", true);
  g.sweep(
    circleOutline(40),
    [[0, 0], [ro, 0], [ro, GLASS_FLOOR_Y], [ro, h - 0.3], [ro, h], [ri, h], [ri, h - 0.3], [ri, GLASS_FLOOR_Y], [0, GLASS_FLOOR_Y]],
    (i) => cols[i],
    { smoothDeg: 30 }
  );
  return g;
}

function hash(i: number, j: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Disc of ground coffee, 6.9 x 0.8 x 6.9, bumpy on top. */
export function buildCoffeeGrounds(): Geo {
  const g = new Geo();
  const R = LIQUID_RADIUS;
  const rings = 5;
  const segs = 22;
  const pt = (k: number, j: number): V3 => {
    if (k === 0) return [0, 0.8, 0];
    const jj = j % segs;
    const a = (jj / segs) * Math.PI * 2 + (k % 2) * (Math.PI / segs);
    const r = (R * k) / rings;
    const hgt = k === rings ? 0.42 + 0.14 * hash(k, jj) : 0.46 + 0.3 * hash(k, jj);
    return [r * Math.cos(a), hgt, r * Math.sin(a)];
  };
  const col = (k: number, j: number): RGBA => scaleRGB(GROUNDS, 0.86 + 0.3 * hash(k + 17, j + 5));
  const up: V3 = [0, 1, 0];

  g.part("grounds", true);
  for (let k = 0; k < rings; k++) {
    for (let j = 0; j < segs; j++) {
      if (k === 0) {
        g.flatTri(pt(0, 0), pt(1, j), pt(1, j + 1), up, col(k, j));
      } else {
        g.flatTri(pt(k, j), pt(k + 1, j), pt(k + 1, j + 1), up, col(k, j));
        g.flatTri(pt(k, j), pt(k + 1, j + 1), pt(k, j + 1), up, col(k + 31, j));
      }
    }
  }
  // Side wall and bottom.
  const bottom = g.vert([0, 0, 0], [0, -1, 0], scaleRGB(GROUNDS, 0.8));
  for (let j = 0; j < segs; j++) {
    const a = pt(rings, j);
    const b = pt(rings, j + 1);
    const na: V3 = [a[0], 0, a[2]];
    const nb: V3 = [b[0], 0, b[2]];
    const side = scaleRGB(GROUNDS, 0.9);
    const v0 = g.vert([a[0], 0, a[2]], na, side);
    const v1 = g.vert([b[0], 0, b[2]], nb, side);
    const v2 = g.vert(b, nb, side);
    const v3 = g.vert(a, na, side);
    g.quad(v0, v1, v2, v3);
    const c0 = g.vert([a[0], 0, a[2]], [0, -1, 0], scaleRGB(GROUNDS, 0.8));
    const c1 = g.vert([b[0], 0, b[2]], [0, -1, 0], scaleRGB(GROUNDS, 0.8));
    g.tri(bottom, c0, c1);
  }
  return g;
}

/** Coffee colour for a fill level: deep brown when nearly empty, light caramel when full. */
export function coffeeColor(fill01: number): RGBA {
  return mix(COFFEE_DEEP, COFFEE_LIGHT, fill01);
}

/** Column of coffee of the given height (0..11), 6.9 across, standing on y = 0. */
export function buildCoffeeLiquid(heightCm: number, color: RGBA): Geo {
  const g = new Geo();
  const h = Math.max(0, Math.min(LIQUID_MAX_HEIGHT, heightCm));
  if (h < 0.005) return g;
  const cols: RGBA[] = [scaleRGB(color, 0.8), scaleRGB(color, 0.94), scaleRGB(color, 1.12)];
  g.part("liquid", true);
  g.sweep(circleOutline(32), [[0, 0], [LIQUID_RADIUS, 0], [LIQUID_RADIUS, h], [0, h]], (i) => cols[i]);
  return g;
}

/**
 * Stream of water. The origin is the BOTTOM of the stream (where the water
 * lands); it rises to y = lengthCm (the spout). 0.8 across at the top,
 * narrower at the bottom.
 */
export function buildWaterStream(lengthCm: number): Geo {
  const g = new Geo();
  g.lit = false;
  const len = Math.max(0, Math.min(STREAM_MAX_LENGTH, lengthCm));
  if (len < 0.01) return g;
  const path: V3[] = [];
  const radii: number[] = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push([0, len * t, 0]);
    // Taper by distance fallen, so a short stream is not pinched.
    radii.push(0.4 - 0.15 * ((len * (1 - t)) / STREAM_MAX_LENGTH));
  }
  const top: RGBA = [WATER[0], WATER[1], WATER[2], 0.7];
  g.part("stream", true);
  g.tube(path, radii, 10, (i) => mix(WATER, top, i / steps), WATER, top);
  return g;
}

/**
 * Six tick bars for 50..300 ml. The origin is the 0 ml level (the inside
 * bottom of the glass); tick i sits at y = i * TICK_STEP. x is centred, the
 * bars bulge from z = 0 at their ends to about z = 0.13 in the middle (+Z is
 * the front), following a cylinder of TICK_CYLINDER_RADIUS.
 */
export function buildScaleTicks(opacity: number): Geo {
  const g = new Geo();
  g.lit = false;
  const a = Math.max(0, Math.min(1, opacity));
  if (a < 0.003) return g;
  const R = TICK_CYLINDER_RADIUS;
  const half = Math.asin(TICK_HALF_WIDTH / R);
  const c: RGBA = [SOFT_WHITE[0], SOFT_WHITE[1], SOFT_WHITE[2], a];
  const arc = 6;
  const hh = 0.08;
  g.part("ticks", false);
  for (let i = 1; i <= TICK_COUNT; i++) {
    const y = i * TICK_STEP;
    let prevLo = -1;
    let prevHi = -1;
    for (let k = 0; k <= arc; k++) {
      const th = -half + (k / arc) * 2 * half;
      const n: V3 = [Math.sin(th), 0, Math.cos(th)];
      const x = R * n[0];
      const z = R * n[2] - TICK_Z_FROM_AXIS;
      const lo = g.vert([x, y - hh, z], n, c);
      const hi = g.vert([x, y + hh, z], n, c);
      if (k > 0) g.quad(prevLo, lo, hi, prevHi);
      prevLo = lo;
      prevHi = hi;
    }
  }
  return g;
}

// ---- gas cylinder and hose ---------------------------------------------------
const GAS_NIPPLE_RADIUS = 0.45;
export const GAS_HOSE_RADIUS = 0.6;
/** Height of the regulator's outlet nipple above the cylinder's base. */
const GAS_OUTLET_Y = 31.2;
/**
 * Where the gas hose starts on the cylinder, in cylinder space: on the regulator's
 * outlet nipple, which points to -X through the opening of the collar.
 */
export const GAS_REGULATOR_OUTLET: V3 = [-5.0, GAS_OUTLET_Y, 0];

/**
 * Curved wall around the y axis from angle a0 to a1 (radians, x = cos, z = sin),
 * between radii r0 < r1 and heights y0 < y1: outside, inside, top and both ends.
 */
function arcWall(g: Geo, r0: number, r1: number, y0: number, y1: number, a0: number, a1: number, segs: number, c: RGBA, top: RGBA): void {
  let prev: number[] = [];
  for (let k = 0; k <= segs; k++) {
    const a = a0 + ((a1 - a0) * k) / segs;
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    const out: V3 = [cs, 0, sn];
    const inw: V3 = [-cs, 0, -sn];
    const up: V3 = [0, 1, 0];
    const cur = [
      g.vert([r1 * cs, y0, r1 * sn], out, c),
      g.vert([r1 * cs, y1, r1 * sn], out, c),
      g.vert([r0 * cs, y0, r0 * sn], inw, scaleRGB(c, 0.85)),
      g.vert([r0 * cs, y1, r0 * sn], inw, scaleRGB(c, 0.85)),
      g.vert([r0 * cs, y1, r0 * sn], up, top),
      g.vert([r1 * cs, y1, r1 * sn], up, top),
    ];
    if (k > 0) {
      g.quad(prev[0], cur[0], cur[1], prev[1]);
      g.quad(prev[2], cur[2], cur[3], prev[3]);
      g.quad(prev[4], cur[4], cur[5], prev[5]);
    }
    prev = cur;
  }
  for (const end of [a0, a1]) {
    const cs = Math.cos(end);
    const sn = Math.sin(end);
    const sgn = end === a0 ? -1 : 1;
    const n: V3 = [-sn * sgn, 0, cs * sgn];
    g.flatQuad([r0 * cs, y0, r0 * sn], [r1 * cs, y0, r1 * sn], [r1 * cs, y1, r1 * sn], [r0 * cs, y1, r0 * sn], n, c);
  }
}

/**
 * Small household gas cylinder, 26 across and about 35 tall with its regulator.
 * Stands on y = 0 on a foot ring; domed shoulders, a collar (hand guard) open to
 * the left and right of the valve, and a regulator whose outlet points to -X
 * (GAS_REGULATOR_OUTLET).
 */
export function buildGasCylinder(): Geo {
  const g = new Geo();
  const ring = circleOutline(32);

  g.part("foot ring", true);
  g.sweep(ring, [[9.6, 0], [10.4, 0], [10.4, 3.8], [9.6, 3.8], [9.6, 0]], () => scaleRGB(GAS_GREEN, 0.86), { smoothDeg: 20 });

  g.part("body", true);
  g.sweep(
    ring,
    [
      [0, 2.2], [6, 2.5], [10, 3.7], [12.2, 6], [13, 9.5], [13, 19], [12.3, 22.5], [10.3, 25.2], [7, 26.6], [3.2, 27.1], [0, 27.1],
    ],
    (i) => (i < 4 ? scaleRGB(GAS_GREEN, 0.92) : i < 5 ? GAS_GREEN : mix(GAS_GREEN, GAS_GREEN_LIGHT, 0.45)),
    { smoothDeg: 50 }
  );
  // Weld seam around the middle.
  g.part("seam", false);
  g.sweep(ring, [[13, 13.7], [13.2, 13.9], [13.2, 14.5], [13, 14.7]], () => GAS_GREEN_LIGHT, { smoothDeg: 60 });

  // Collar: two guard panels, front and back. It is open towards -X, where the
  // regulator's outlet and the hose leave, and towards +X; the regulator stands above it.
  g.part("collar", false);
  const gap = (40 * Math.PI) / 180;
  arcWall(g, 7.5, 8.0, 25.6, 31.4, gap, Math.PI - gap, 14, GAS_GREEN, GAS_GREEN_LIGHT);
  arcWall(g, 7.5, 8.0, 25.6, 31.4, Math.PI + gap, Math.PI * 2 - gap, 14, GAS_GREEN, GAS_GREEN_LIGHT);

  g.part("valve", false);
  g.sweep(circleOutline(6), [[2.3, 26.9], [2.3, 28.2], [0, 28.2]], () => STEEL_MID, { smoothDeg: 20 });
  g.sweep(circleOutline(16), [[1.5, 28.2], [1.5, 30], [0, 30]], () => STEEL, { smoothDeg: 20 });

  g.part("regulator", false);
  g.sweep(
    circleOutline(24),
    [[0, 29.6], [2.6, 29.6], [3.4, 30.2], [3.4, 32.4], [2.8, 33.0], [1.3, 33.0], [1.3, 33.6], [1.9, 33.9], [1.9, 34.5], [1.5, 34.9], [0, 34.9]],
    (i) => (i < 4 ? STEEL : i < 6 ? scaleRGB(STEEL, 1.08) : SOFT_WHITE),
    { smoothDeg: 40 }
  );
  // Outlet: a hex nut and a nipple the hose slips over.
  g.part("outlet", false);
  g.tube([[-3.2, GAS_OUTLET_Y, 0], [-4.1, GAS_OUTLET_Y, 0]], [0.8, 0.8], 6, () => STEEL_MID, undefined, STEEL);
  g.tube([[-4.0, GAS_OUTLET_Y, 0], [GAS_REGULATOR_OUTLET[0] - 1.0, GAS_OUTLET_Y, 0]], [GAS_NIPPLE_RADIUS, GAS_NIPPLE_RADIUS], 10, () => STEEL, undefined, STEEL_MID);
  return g;
}

// Layout of the gas line, in the space of the parent that holds table, stove and cylinder.
/** Where the GasCylinder object stands (base centre, on the floor under the table). */
export const GAS_CYLINDER_POSITION: V3 = [-5, -160, -62];
/** Where the Stove object stands. */
const GAS_STOVE_POSITION: V3 = [0, -70, -55];
/** Where the GasHose object goes: the hose starts at its origin, on the regulator's outlet. */
export const GAS_HOSE_ORIGIN: V3 = [
  GAS_CYLINDER_POSITION[0] + GAS_REGULATOR_OUTLET[0],
  GAS_CYLINDER_POSITION[1] + GAS_REGULATOR_OUTLET[1],
  GAS_CYLINDER_POSITION[2] + GAS_REGULATOR_OUTLET[2],
];
/** Far end of the hose, on the stove's inlet nipple, in the same parent space. */
export const GAS_HOSE_STOVE_END: V3 = [
  GAS_STOVE_POSITION[0] + STOVE_GAS_INLET[0],
  GAS_STOVE_POSITION[1] + STOVE_GAS_INLET[1],
  GAS_STOVE_POSITION[2] + STOVE_GAS_INLET[2],
];

/**
 * Route of the hose in parent space: out of the collar to the left, a slack loop
 * under the table, up outside the left edge of the tabletop (x = -40), over the
 * edge, then along the top behind the Start-over panel to the stove's left face.
 */
function gasHoseRoute(): V3[] {
  const a = GAS_HOSE_ORIGIN;
  const b = GAS_HOSE_STOVE_END;
  return [
    a,
    [a[0] - 1.5, a[1], a[2]],
    [a[0] - 4.2, a[1] - 0.2, a[2] - 0.05],
    [-19, -130.9, -62.4],
    [-27, -135.2, -63.2],
    [-34.5, -134.2, -64.0],
    [-40.2, -125, -64.5],
    [-42.8, -110, -64.8],
    [-42.9, -92, -65.0],
    [-42.7, -80, -65.2],
    [-42.2, -73.5, -65.3],
    [-41.0, -69.6, -65.35],
    [-38.8, -67.3, -65.4],
    [-35.8, -67.2, -65.5],
    [-33.0, -68.3, -65.6],
    [-30.4, -69.2, -65.65],
    [-27.5, -69.35, -65.7],
    [-24, -69.35, -65.6],
    [-21, -69.15, -65.1],
    [-18.6, -68.5, -64.1],
    [b[0] - 3.4, b[1] - 0.25, b[2] - 0.35],
    [b[0] - 1.6, b[1], b[2]],
    b,
  ];
}

/** Smooth curve through the points (Catmull-Rom), `perSpan` steps between neighbours. */
function splinePath(pts: V3[], perSpan: number): V3[] {
  const out: V3[] = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, n - 1)];
    for (let k = 0; k < perSpan; k++) {
      const t = k / perSpan;
      const t2 = t * t;
      const t3 = t2 * t;
      const q: V3 = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        q[c] = 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3);
      }
      out.push(q);
    }
  }
  out.push(pts[n - 1]);
  return out;
}

/** Centre line of the gas hose in hose space (origin = GAS_HOSE_ORIGIN, the regulator end). */
export function gasHosePath(): V3[] {
  const o = GAS_HOSE_ORIGIN;
  return splinePath(gasHoseRoute(), 5).map((p): V3 => [p[0] - o[0], p[1] - o[1], p[2] - o[2]]);
}

/**
 * Orange gas hose, 1.2 thick, from the regulator's outlet (the origin) to the
 * stove's inlet, with a metal clamp ring at each end. Its space has the same
 * axes as the cylinder's and the stove's parent: put the object at GAS_HOSE_ORIGIN.
 */
export function buildGasHose(): Geo {
  const g = new Geo();
  const path = gasHosePath();
  const m = path.length;
  g.part("hose", true);
  g.tube(path, path.map(() => GAS_HOSE_RADIUS), 10, () => HOSE_ORANGE, scaleRGB(HOSE_ORANGE, 0.85), scaleRGB(HOSE_ORANGE, 0.85));

  // Clamp rings, a little way in from each end. Both ends run along the x axis,
  // and at both the hose lies on the -X side of its end point.
  g.part("clamps", false);
  for (const end of [path[0], path[m - 1]]) {
    g.tube([[end[0] - 0.35, end[1], end[2]], [end[0] - 1.0, end[1], end[2]]], [0.8, 0.8], 12, () => STEEL, STEEL_MID, STEEL_MID);
  }
  return g;
}
