/* Site geometry contract — derived from design/layout.md (the user's aerial plan).
   Units: meters. +X east, +Z south. Origin at the Kid's Play Zone heart.
   STYLE FORMULA constants live in design/style.md; engine colors in world.js. */

export const SITE = { x0: -185, z0: -295, x1: 325, z1: 255 };

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
  const a = Math.acos(Math.min(1, Math.max(-1, (r1 - r2) / d))); // external tangent angle
  const pts = [];
  // around circle 1 from base+a to base+2PI-a
  for (let i = 0; i <= steps; i++) {
    const t = base + a + ((Math.PI * 2 - 2 * a) * i) / steps;
    pts.push([cx1 + Math.cos(t) * r1, cz1 + Math.sin(t) * r1]);
  }
  // around circle 2 from base-a to base+a
  for (let i = 0; i <= steps; i++) {
    const t = base - a + ((2 * a) * i) / steps;
    pts.push([cx2 + Math.cos(t) * r2, cz2 + Math.sin(t) * r2]);
  }
  return pts;
}

/* Rounded-rectangle “stadium” polygon centred at (cx,cz), long axis len, width w,
   rotated by ang (radians, 0 = long axis along +X). */
export function stadiumPolygon(cx, cz, len, w, ang, steps = 14) {
  const r = w / 2, half = len / 2 - r;
  const pts = [];
  for (let i = 0; i <= steps; i++) { // right cap
    const t = -Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([half + Math.cos(t) * r, Math.sin(t) * r]);
  }
  for (let i = 0; i <= steps; i++) { // left cap
    const t = Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([-half + Math.cos(t) * r, Math.sin(t) * r]);
  }
  const c = Math.cos(ang), s = Math.sin(ang);
  return pts.map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c]);
}

export function ellipsePolygon(cx, cz, rx, rz, ang, steps = 48) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = Math.cos(t) * rx, z = Math.sin(t) * rz;
    pts.push([cx + x * c - z * s, cz + x * s + z * c]);
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

/* ---------- The masterplan ---------- */

const deg = (d) => (d * Math.PI) / 180;

/* Restaurant plaza — terracotta teardrop (thumb), SW tail toward the play heart. */
export const PLAZA = lobePolygon(150, 128, 96, 52, 52, 40);

/* Kid's play sand blob at the heart. */
export const SAND = lobePolygon(0, -6, 42, 16, 34, 30);

/* Green fingers (kiosk food hub) — bearing ~NE (toward +x, −z). */
export const FINGER_A = { cx: 150, cz: -165, len: 215, w: 64, ang: deg(-38) };
export const FINGER_B = { cx: 188, cz: -72, len: 228, w: 64, ang: deg(-36) };
export const FINGER_A_POLY = stadiumPolygon(FINGER_A.cx, FINGER_A.cz, FINGER_A.len, FINGER_A.w, FINGER_A.ang);
export const FINGER_B_POLY = stadiumPolygon(FINGER_B.cx, FINGER_B.cz, FINGER_B.len, FINGER_B.w, FINGER_B.ang);

/* Food-truck loops (west): outer asphalt loop ring + green island with the truck court. */
export const LOOP_N = { cx: -85, cz: -125, len: 165, w: 78, ang: deg(78), islandLen: 120, islandW: 34 };
export const LOOP_S = { cx: -95, cz: 140, len: 185, w: 82, ang: deg(96), islandLen: 138, islandW: 36 };
export const LOOP_N_POLY = stadiumPolygon(LOOP_N.cx, LOOP_N.cz, LOOP_N.len, LOOP_N.w, LOOP_N.ang);
export const LOOP_S_POLY = stadiumPolygon(LOOP_S.cx, LOOP_S.cz, LOOP_S.len, LOOP_S.w, LOOP_S.ang);
export const ISLAND_N_POLY = stadiumPolygon(LOOP_N.cx, LOOP_N.cz, LOOP_N.islandLen, LOOP_N.islandW, LOOP_N.ang);
export const ISLAND_S_POLY = stadiumPolygon(LOOP_S.cx, LOOP_S.cz, LOOP_S.islandLen, LOOP_S.islandW, LOOP_S.ang);

/* SE guest parking. */
export const PARKING_SE = [[150, 168], [296, 168], [302, 246], [156, 250]];

/* Arrival bar (NW) — long white shade pavilion. */
export const ARRIVAL = { cx: -70, cz: -258, w: 130, d: 28 };

/* Promenade spine + secondary paths (polylines + half-width). */
export const PATHS = [
  { line: [[-70, -240], [-52, -188], [-26, -120], [-8, -56], [0, 0], [38, 38], [86, 78], [128, 112]], w: 9 }, // spine
  { line: [[-8, -56], [-46, -92], [-66, -106]], w: 5 },   // to north loop court
  { line: [[0, 18], [-38, 70], [-62, 110]], w: 5 },        // to south loop court
  { line: [[24, -32], [70, -76], [104, -106], [150, -148]], w: 5 },  // finger A spine
  { line: [[44, -8], [96, -42], [150, -66], [196, -92]], w: 5 },     // finger B spine
  { line: [[128, 112], [196, 152], [232, 178]], w: 5 },    // plaza → SE parking
  { line: [[-126, -244], [-70, -240], [-12, -244]], w: 5 }, // along arrival
  { line: [[-52, -188], [-100, -170], [-122, -150]], w: 4 },
  { line: [[38, 38], [92, 22], [128, 36], [150, 60]], w: 4 },
];

/* Ring path around the play heart. */
export const PLAY_RING = { cx: 4, cz: 6, r: 56, w: 4.5 };

/* Perimeter roads (axis-aligned strips, [x0,z0,x1,z1]) — outside the fence. */
export const ROADS = [
  [SITE.x0 - 26, SITE.z0 - 22, SITE.x1 + 26, SITE.z0 - 4],   // north street
  [SITE.x0 - 26, SITE.z1 + 4, SITE.x1 + 26, SITE.z1 + 22],   // south street
  [SITE.x0 - 24, SITE.z0 - 22, SITE.x0 - 4, SITE.z1 + 22],   // west street
  [SITE.x1 + 4, SITE.z0 - 22, SITE.x1 + 24, SITE.z1 + 22],   // east street
  [SITE.x0 - 320, -382, SITE.x1 + 460, -330],                 // highway (north)
];

/* Restaurant drums: x, z, radius. */
export const DRUMS = [
  [57, 110, 11], [165, 52, 10], [211, 110, 12],
  [97, 168, 10], [207, 170, 11], [141, 202, 9],
];

/* Tensile canopies: x, z, span, apex height. Two grand (plaza) + two play sails. */
export const CANOPIES = [
  { x: 122, z: 82, s: 40, h: 17 },
  { x: 155, z: 148, s: 36, h: 15 },
  { x: -27, z: -12, s: 19, h: 8.5 },
  { x: -42, z: 58, s: 17, h: 8 },
];

/* Woven play drums (lattice cylinders) + fountain. */
export const PLAY_RINGS = [[15, 30, 3.4], [31, 46, 2.8], [39, 18, 2.4], [9, 53, 3.0], [-14, 38, 2.6]];
export const FOUNTAIN = { x: -7, z: -55, r: 6.5 };

/* Zone discovery markers. */
export const ZONES = [
  { id: "arrival", x: -70, z: -232, r: 16 },
  { id: "truckNorth", x: -85, z: -125, r: 18 },
  { id: "truckSouth", x: -95, z: 140, r: 18 },
  { id: "play", x: 4, z: 8, r: 20 },
  { id: "kiosk", x: 168, z: -118, r: 24 },
  { id: "restaurant", x: 138, z: 116, r: 22 },
];

export const SPAWN = { x: -70, z: -228, yaw: deg(-160) }; // facing SE down the spine

/* Reference route (design/plan.md §5): visits all six zone hearts. */
export const REF_ROUTE = [
  [-70, -232], [-66, -106], [-85, -125], [-26, -120], [-18, -66], [0, 0], [4, 8],
  [24, -32], [104, -106], [168, -118], [150, -66], [44, -8], [38, 38],
  [128, 112], [138, 116], [60, 60], [0, 18], [-62, 110], [-95, 140],
];
