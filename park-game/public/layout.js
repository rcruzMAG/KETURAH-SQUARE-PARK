/* Site geometry contract — built 1:1 against the clean site plan (design/layout.md v2).
   Units: meters. +X east, +Z south. Origin at the Kid's Play heart (plan px 212,285).
   STYLE FORMULA constants live in design/style.md; engine colors in world.js. */

export const SITE = { x0: -190, z0: -267, x1: 293, z1: 267 };

/* ---------- 2D helpers (shared by world builder, minimap, surface tests) ---------- */

export function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Convex hull outline of two circles (capsule/teardrop), as a polygon. */
export function lobePolygon(cx1, cz1, r1, cx2, cz2, r2, steps = 40) {
  const dx = cx2 - cx1, dz = cz2 - cz1;
  const d = Math.hypot(dx, dz);
  const base = Math.atan2(dz, dx);
  const a = Math.acos(Math.min(1, Math.max(-1, (r1 - r2) / d)));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = base + a + ((Math.PI * 2 - 2 * a) * i) / steps;
    pts.push([cx1 + Math.cos(t) * r1, cz1 + Math.sin(t) * r1]);
  }
  for (let i = 0; i <= steps; i++) {
    const t = base - a + ((2 * a) * i) / steps;
    pts.push([cx2 + Math.cos(t) * r2, cz2 + Math.sin(t) * r2]);
  }
  return pts;
}

/* Rounded-rectangle "stadium" polygon centred at (cx,cz), long axis len, width w,
   rotated by ang (radians, 0 = long axis along +X). */
export function stadiumPolygon(cx, cz, len, w, ang, steps = 14) {
  const r = w / 2, half = len / 2 - r;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([half + Math.cos(t) * r, Math.sin(t) * r]);
  }
  for (let i = 0; i <= steps; i++) {
    const t = Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([-half + Math.cos(t) * r, Math.sin(t) * r]);
  }
  const c = Math.cos(ang), s = Math.sin(ang);
  return pts.map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c]);
}

export function roundedRectPolygon(x0, z0, x1, z1, r, arcSteps = 7) {
  const pts = [];
  const corners = [
    [x1 - r, z0 + r, -Math.PI / 2, 0],
    [x1 - r, z1 - r, 0, Math.PI / 2],
    [x0 + r, z1 - r, Math.PI / 2, Math.PI],
    [x0 + r, z0 + r, Math.PI, Math.PI * 1.5],
  ];
  for (const [cx, cz, a0, a1] of corners)
    for (let i = 0; i <= arcSteps; i++) {
      const t = a0 + ((a1 - a0) * i) / arcSteps;
      pts.push([cx + Math.cos(t) * r, cz + Math.sin(t) * r]);
    }
  return pts;
}

export function pointInPolygon(px, pz, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function distToPolylineSq(px, pz, line) {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    const vx = bx - ax, vz = bz - az;
    const t = Math.min(1, Math.max(0, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
    const dx = px - (ax + vx * t), dz = pz - (az + vz * t);
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return best;
}

/* ---------- The masterplan (v2 — exact plan) ---------- */

const deg = (d) => (d * Math.PI) / 180;

/* Restaurant plaza — terracotta thumb, neck toward the play heart. */
export const PLAZA = lobePolygon(118, 140, 105, 33, 45, 45);

/* Central plaza — the paved palm of the salute around the play heart. */
export const CENTRAL = [
  [-62, -55], [-30, -88], [-2, -78], [28, -45], [48, 12], [38, 52],
  [2, 68], [-34, 50], [-58, 8],
];

/* Kid's play sand blob (sits on the central plaza). */
export const SAND = lobePolygon(-10, -15, 38, 15, 30, 30);

/* Green fingers — spring from the palm toward the NE. */
export const FINGER_A = { cx: 93, cz: -110, len: 270, w: 78, ang: deg(-50) };
export const FINGER_B = { cx: 168, cz: -40, len: 285, w: 78, ang: deg(-44) };
export const FINGER_A_POLY = stadiumPolygon(FINGER_A.cx, FINGER_A.cz, FINGER_A.len, FINGER_A.w, FINGER_A.ang);
export const FINGER_B_POLY = stadiumPolygon(FINGER_B.cx, FINGER_B.cz, FINGER_B.len, FINGER_B.w, FINGER_B.ang);

/* Food-truck loops (west): outer asphalt ring + green island with the truck court. */
export const LOOP_N = { cx: -96, cz: -72, len: 245, w: 126, ang: deg(-88), islandLen: 200, islandW: 42, trucks: 8 };
export const LOOP_S = { cx: -116, cz: 165, len: 190, w: 104, ang: deg(81), islandLen: 145, islandW: 38, trucks: 6 };
export const LOOP_N_POLY = stadiumPolygon(LOOP_N.cx, LOOP_N.cz, LOOP_N.len, LOOP_N.w, LOOP_N.ang);
export const LOOP_S_POLY = stadiumPolygon(LOOP_S.cx, LOOP_S.cz, LOOP_S.len, LOOP_S.w, LOOP_S.ang);
export const ISLAND_N_POLY = stadiumPolygon(LOOP_N.cx, LOOP_N.cz, LOOP_N.islandLen, LOOP_N.islandW, LOOP_N.ang);
export const ISLAND_S_POLY = stadiumPolygon(LOOP_S.cx, LOOP_S.cz, LOOP_S.islandLen, LOOP_S.islandW, LOOP_S.ang);

/* SE guest parking. */
export const PARKING_SE = [[203, 160], [293, 160], [293, 240], [203, 240]];

/* Arrival bar (N edge) — long white shade pavilion. */
export const ARRIVAL = { cx: -82, cz: -241, w: 110, d: 22 };

/* Paths (polylines + width). [0] = spine (allée/benches/poles attach to it). */
export const PATHS = [
  { line: [[-82, -228], [-63, -180], [-40, -130], [-20, -70], [-8, -25], [0, 0]], w: 8 },     // spine
  { line: [[-2, -262], [0, -200], [4, -150], [6, -100], [4, -50], [2, -12]], w: 7 },          // N gate, west of finger A
  { line: [[8, -12], [50, -63], [95, -112], [140, -160], [172, -200]], w: 5 },                 // finger A spine
  { line: [[58, 52], [100, 15], [140, -25], [185, -70], [232, -112]], w: 5 },                  // finger B spine
  { line: [[95, -112], [120, -75], [140, -25]], w: 4 },                                        // kiosk-court connector
  { line: [[-20, -70], [-48, -72], [-74, -72]], w: 5 },                                        // loop N court link
  { line: [[-8, 25], [-45, 80], [-80, 130], [-112, 152]], w: 5 },                              // loop S link
  { line: [[8, 14], [30, 42], [55, 70], [85, 98]], w: 7 },                                     // plaza link
  { line: [[170, 210], [195, 205], [225, 198]], w: 4 },                                        // SE parking link
  { line: [[-134, -228], [-82, -228], [-30, -230]], w: 4 },                                    // along arrival
];

/* Closed ring paths (built as closed ribbons by the world builder). */
export const RING_PATHS = [
  { poly: roundedRectPolygon(SITE.x0 + 14, SITE.z0 + 14, SITE.x1 - 14, SITE.z1 - 14, 26, 9), w: 3.5 }, // perimeter
  { poly: stadiumPolygon(FINGER_A.cx, FINGER_A.cz, FINGER_A.len + 14, FINGER_A.w + 14, FINGER_A.ang, 16), w: 3.5 },
  { poly: stadiumPolygon(FINGER_B.cx, FINGER_B.cz, FINGER_B.len + 14, FINGER_B.w + 14, FINGER_B.ang, 16), w: 3.5 },
];

/* Ring path around the play heart. */
export const PLAY_RING = { cx: 2, cz: 5, r: 48, w: 4.5 };

/* Perimeter roads (axis-aligned strips, [x0,z0,x1,z1]) — outside the fence. */
export const ROADS = [
  [SITE.x0 - 26, SITE.z0 - 22, SITE.x1 + 26, SITE.z0 - 4],
  [SITE.x0 - 26, SITE.z1 + 4, SITE.x1 + 26, SITE.z1 + 22],
  [SITE.x0 - 24, SITE.z0 - 22, SITE.x0 - 4, SITE.z1 + 22],
  [SITE.x1 + 4, SITE.z0 - 22, SITE.x1 + 24, SITE.z1 + 22],
  [SITE.x0 - 320, -354, SITE.x1 + 460, -302],                 // highway (north)
];

/* Restaurant drums: x, z, radius — 4 per the plan. */
export const DRUMS = [
  [156, 67, 11], [40, 107, 10], [96, 183, 11], [186, 183, 11],
];

/* Tensile canopies: x, z, span, apex height, yaw. Two grand plaza diamonds + two play sails. */
export const CANOPIES = [
  { x: 100, z: 113, s: 42, h: 17, ry: Math.PI / 4 },
  { x: 136, z: 177, s: 38, h: 15, ry: Math.PI / 4 },
  { x: -22, z: 5, s: 19, h: 8.5, ry: 0.4 },
  { x: -50, z: -23, s: 16, h: 7.5, ry: 1.1 },
];

/* Play heart: woven lattice spheres (x, z, r), tall lattice tower, sand mounds. */
export const PLAY_SPHERES = [[0, -12, 4.5], [12, 2, 4.0], [-13, 5, 3.2]];
export const TOWER = { x: -27, z: -45, r: 4.5, h: 13 };
export const MOUNDS = [[-18, -22, 2.8], [6, -30, 2.2], [24, 16, 3.2], [-4, 32, 2.6], [18, 34, 2.0], [-26, 10, 2.4]];

/* Zone discovery markers. */
export const ZONES = [
  { id: "arrival", x: -82, z: -235, r: 16 },
  { id: "truckNorth", x: -96, z: -72, r: 20 },
  { id: "truckSouth", x: -116, z: 165, r: 18 },
  { id: "play", x: 0, z: 0, r: 18 },
  { id: "kiosk", x: 120, z: -75, r: 26 },
  { id: "restaurant", x: 118, z: 135, r: 24 },
];

export const SPAWN = { x: -82, z: -232, yaw: deg(-158) }; // facing SE down the spine

/* Reference route (design/plan.md §5): visits all six zone hearts. */
export const REF_ROUTE = [
  [-82, -233], [-63, -180], [-40, -130], [-74, -72], [-96, -72], [-20, -70],
  [-8, -25], [0, 0], [8, -12], [50, -63], [95, -112], [120, -75], [140, -25],
  [58, 52], [30, 42], [85, 98], [118, 135], [60, 75], [-8, 25], [-80, 130], [-116, 165],
];
