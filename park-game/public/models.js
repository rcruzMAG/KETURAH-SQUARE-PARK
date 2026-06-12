/* Procedural 3D asset builders — references/3d-animation.md “procedural props in
   Three.js code” branch. Each builder returns merged BufferGeometry with vertex
   colors (+ aFlex wind weight on vegetation). Geometry clause from the STYLE
   FORMULA (design/style.md): smooth clean-edged contemporary forms. */

import * as THREE from "./vendor/three.module.min.js";
import { mulberry } from "./layout.js";

const C = (hex) => new THREE.Color(hex);

function paint(geo, color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}

function paintFn(geo, fn) {
  const p = geo.attributes.position;
  const arr = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    fn(c, p.getX(i), p.getY(i), p.getZ(i));
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}

function flex(geo, fn) {
  const p = geo.attributes.position;
  const arr = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) arr[i] = fn(p.getX(i), p.getY(i), p.getZ(i));
  geo.setAttribute("aFlex", new THREE.BufferAttribute(arr, 1));
  return geo;
}

/* Merge non-indexed geometries; carries position/normal/color, optional aFlex/uv. */
export function merge(parts) {
  const list = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  for (const g of list) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const fl = new Float32Array(total);
  const uv = new Float32Array(total * 2);
  let o = 0;
  for (const g of list) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) col.set(g.attributes.color.array, o * 3);
    else col.fill(1, o * 3, (o + n) * 3);
    if (g.attributes.aFlex) fl.set(g.attributes.aFlex.array, o);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  out.setAttribute("aFlex", new THREE.BufferAttribute(fl, 1));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}

const M4 = new THREE.Matrix4();

/* ---------- Vegetation ---------- */

/* Date palm ≈ 9 m, base at origin. One geometry, instanced as a swarm. */
export function buildPalm(seed = 7) {
  const rnd = mulberry(seed);
  const parts = [];
  const H = 8.6;

  const trunk = new THREE.CylinderGeometry(0.17, 0.30, H, 8, 8, true).toNonIndexed();
  trunk.translate(0, H / 2, 0);
  {
    const p = trunk.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i) / H;
      p.setX(i, p.getX(i) + t * t * 0.9); // gentle lean
    }
    trunk.computeVertexNormals();
  }
  paintFn(trunk, (c, x, y) => {
    const band = Math.sin(y * 7.2) > 0.25 ? 0.82 : 1.0; // frond-scar rings
    c.setRGB(0.42 * band, 0.33 * band, 0.24 * band);
  });
  flex(trunk, (x, y) => Math.pow(y / H, 2) * 0.3);
  parts.push(trunk);

  const FRONDS = 15;
  for (let i = 0; i < FRONDS; i++) {
    const L = 3.1 + rnd() * 1.1;
    const f = new THREE.PlaneGeometry(1.05, L, 1, 8).toNonIndexed();
    f.translate(0, L / 2, 0);
    const p = f.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const t = p.getY(j) / L;
      p.setX(j, p.getX(j) * (1 - 0.8 * t)); // taper
      p.setZ(j, p.getZ(j) - 1.55 * t * t);  // droop
    }
    f.computeVertexNormals();
    paintFn(f, (c, x, y) => {
      const t = y / L;
      c.setRGB(0.27 + t * 0.18, 0.42 + t * 0.2, 0.13 + t * 0.08);
    });
    flex(f, (x, y) => 0.35 + Math.pow(y / L, 2) * 1.05);
    M4.makeRotationY((i / FRONDS) * Math.PI * 2 + rnd() * 0.5)
      .multiply(new THREE.Matrix4().makeRotationX(0.5 + (i % 4) * 0.3 + rnd() * 0.18));
    f.applyMatrix4(M4);
    f.translate(0.9, H + 0.15, 0);
    parts.push(f);
  }

  for (let i = 0; i < 3; i++) { // date clusters
    const d = new THREE.SphereGeometry(0.17, 6, 5).toNonIndexed();
    d.scale(1, 1.5, 1);
    d.translate(0.9 + Math.cos(i * 2.2) * 0.32, H - 0.3, Math.sin(i * 2.2) * 0.32);
    paint(d, C(0xb4742c));
    flex(d, () => 0.3);
    parts.push(d);
  }
  return merge(parts);
}

/* Ghaf-like shade tree ≈ 7 m. */
export function buildGhaf(seed = 17) {
  const rnd = mulberry(seed);
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.14, 0.26, 3.4, 7, 3).toNonIndexed();
  trunk.translate(0, 1.7, 0);
  paint(trunk, C(0x5c4632));
  flex(trunk, () => 0.05);
  parts.push(trunk);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.IcosahedronGeometry(1.9 + rnd() * 0.8, 1).toNonIndexed();
    const p = b.attributes.position;
    for (let j = 0; j < p.count; j++) {
      p.setX(j, p.getX(j) * (1 + (rnd() - 0.5) * 0.22));
      p.setY(j, p.getY(j) * 0.72);
      p.setZ(j, p.getZ(j) * (1 + (rnd() - 0.5) * 0.22));
    }
    b.computeVertexNormals();
    const ang = (i / 4) * Math.PI * 2;
    b.translate(Math.cos(ang) * 1.1, 3.9 + rnd() * 0.9, Math.sin(ang) * 1.1);
    paintFn(b, (c, x, y) => c.setRGB(0.18 + (y - 3) * 0.012, 0.30 + (y - 3) * 0.016, 0.10));
    flex(b, () => 0.35);
    parts.push(b);
  }
  return merge(parts);
}

export function buildShrub(seed = 27) {
  const rnd = mulberry(seed);
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.IcosahedronGeometry(0.55 + rnd() * 0.35, 1).toNonIndexed();
    b.scale(1.15, 0.7, 1.15);
    b.translate((rnd() - 0.5) * 0.9, 0.32 + rnd() * 0.18, (rnd() - 0.5) * 0.9);
    paint(b, C().setHSL(0.26 + rnd() * 0.05, 0.42, 0.26 + rnd() * 0.1));
    flex(b, () => 0.18);
    parts.push(b);
  }
  return merge(parts);
}

/* Context tree blob (outside the fence). */
export function buildBlobTree() {
  const trunk = new THREE.CylinderGeometry(0.2, 0.3, 2.6, 6, 1).toNonIndexed();
  trunk.translate(0, 1.3, 0);
  paint(trunk, C(0x4e3b2a));
  const crown = new THREE.IcosahedronGeometry(2.6, 1).toNonIndexed();
  crown.scale(1, 0.85, 1);
  crown.translate(0, 4.3, 0);
  paint(crown, C(0x2c4420));
  return merge([trunk, crown]);
}

/* ---------- Buildings & structures ---------- */

const WHITE = C(0xf2efe6), STEEL = C(0xd5d3cc), DARKGLASS = C(0x22302f), WOOD = C(0x8a6a44);

/* Artisan kiosk 6×4 m, opening faces +Z. */
export function buildKiosk() {
  const p = [];
  const add = (g, col, x, y, z) => { g.translate(x, y, z); paint(g, col); p.push(g); };
  add(new THREE.BoxGeometry(6, 0.25, 4.4), C(0xddd8cc), 0, 0.12, 0);             // plinth
  add(new THREE.BoxGeometry(6, 3.0, 0.2), WHITE, 0, 1.62, -1.9);                  // back wall
  add(new THREE.BoxGeometry(0.2, 3.0, 3.6), WHITE, -2.9, 1.62, 0);                // side
  add(new THREE.BoxGeometry(0.2, 3.0, 3.6), WHITE, 2.9, 1.62, 0);                 // side
  add(new THREE.BoxGeometry(5.6, 2.6, 0.15), C(0x2a2622), 0, 1.45, -1.0);         // interior panel
  add(new THREE.BoxGeometry(5.8, 0.12, 0.9), WOOD, 0, 1.06, 1.6);                 // counter
  const roof = new THREE.BoxGeometry(6.7, 0.18, 5.4);
  roof.rotateX(-0.085);
  add(roof, WHITE, 0, 3.32, 0.25);                                                // mono-pitch roof
  add(new THREE.BoxGeometry(0.14, 3.2, 0.14), STEEL, -2.6, 1.7, 1.9);             // posts
  add(new THREE.BoxGeometry(0.14, 3.2, 0.14), STEEL, 2.6, 1.7, 1.9);
  add(new THREE.BoxGeometry(2.6, 0.5, 0.08), C(0x3a3a36), 0, 2.65, 1.86);         // signage band
  return merge(p);
}

/* Food truck ≈ 6.5 m, service hatch faces +Z. Near-white base for instance tinting. */
export function buildTruck() {
  const p = [];
  const add = (g, col, x, y, z) => { g.translate(x, y, z); paint(g, col); p.push(g); };
  add(new THREE.BoxGeometry(5.0, 2.15, 2.3), C(0xf5f2ea), -0.5, 1.55, 0);          // box body
  const cab = new THREE.BoxGeometry(1.7, 1.5, 2.2);
  add(cab, C(0xe8e4da), 2.7, 1.05, 0);                                             // cab
  const shield = new THREE.BoxGeometry(0.9, 1.0, 2.0);
  shield.rotateZ(-0.5);
  add(shield, DARKGLASS, 2.35, 1.85, 0);                                           // windshield
  add(new THREE.BoxGeometry(3.4, 1.0, 0.06), C(0x232a28), -0.5, 1.75, 1.16);       // service window
  const flap = new THREE.BoxGeometry(3.7, 0.07, 1.25);
  flap.rotateX(0.62);
  add(flap, C(0xf7f4ec), -0.5, 2.85, 1.45);                                        // awning flap
  add(new THREE.BoxGeometry(3.6, 0.1, 0.5), WOOD, -0.5, 1.18, 1.35);               // serving shelf
  for (const [wx, wz] of [[-1.9, 1.05], [-1.9, -1.05], [1.9, 1.05], [1.9, -1.05]]) {
    const w = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
    w.rotateX(Math.PI / 2);
    add(w, C(0x1c1c1e), wx, 0.42, wz);
  }
  add(new THREE.BoxGeometry(1.2, 0.5, 0.8), C(0x9aa0a2), -2.0, 2.85, -0.4);        // roof vent
  return merge(p);
}

/* Parked car ≈ 4.5 m, faces +X. Near-white base for instance tinting. */
export function buildCar() {
  const p = [];
  const add = (g, col, x, y, z) => { g.translate(x, y, z); paint(g, col); p.push(g); };
  add(new THREE.BoxGeometry(4.4, 0.95, 1.85), C(0xf0eeea), 0, 0.78, 0);
  const cab = new THREE.BoxGeometry(2.3, 0.62, 1.68);
  add(cab, DARKGLASS, -0.2, 1.55, 0);
  for (const [wx, wz] of [[-1.45, 0.95], [-1.45, -0.95], [1.45, 0.95], [1.45, -0.95]]) {
    const w = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10);
    w.rotateX(Math.PI / 2);
    add(w, C(0x17171a), wx, 0.34, wz);
  }
  return merge(p);
}

/* Restaurant drum parts — built per radius (not instanced; 6 unique radii merged
   into ONE static mesh per material kind to stay within draw-call budget). */
export function drumCorten(r) {
  const g = new THREE.CylinderGeometry(r, r, 6.4, 28, 1, true);
  g.translate(0, 3.2, 0);
  return g; // textured (corten) — no vertex color
}
export function drumTrim(r) {
  const p = [];
  const lip = new THREE.CylinderGeometry(r + 0.18, r + 0.18, 0.5, 28, 1, true).toNonIndexed();
  lip.translate(0, 6.55, 0);
  paint(lip, WHITE); p.push(lip);
  const deck = new THREE.CylinderGeometry(r - 0.1, r - 0.1, 0.12, 28).toNonIndexed();
  deck.translate(0, 6.4, 0);
  paint(deck, C(0xcdc4b2)); p.push(deck);
  const door = new THREE.BoxGeometry(2.6, 2.6, 0.3).toNonIndexed();
  door.translate(0, 1.3, r - 0.05);
  paint(door, C(0x2e2a24)); p.push(door);
  return merge(p);
}
export function drumGlass(r) {
  const g = new THREE.CylinderGeometry(r + 0.05, r + 0.05, 1.7, 28, 1, true);
  g.translate(0, 2.6, 0);
  return g; // glass band — emissive interior glow at dusk
}

/* Tensile canopy sail — unit span 1, apex 1; instanced with per-axis scale. */
export function buildSail() {
  const seg = 14;
  const g = new THREE.PlaneGeometry(1, 1, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = Math.abs(p.getX(i)) * 2, v = Math.abs(p.getZ(i)) * 2;
    const e = Math.max(u, v);
    p.setY(i, Math.pow(Math.max(0, 1 - e), 1.32));
  }
  g.computeVertexNormals();
  return g.toNonIndexed();
}

/* Canopy frame for unit sail (scaled with it): center mast + corner masts + stays. */
export function buildFrame() {
  const p = [];
  const mast = new THREE.CylinderGeometry(0.012, 0.016, 1.12, 8).toNonIndexed();
  mast.translate(0, 0.56, 0);
  paint(mast, STEEL); p.push(mast);
  for (const [cx, cz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    const m = new THREE.CylinderGeometry(0.008, 0.010, 0.3, 6).toNonIndexed();
    m.translate(cx, 0.15, cz);
    paint(m, STEEL); p.push(m);
    // stay cable corner-top → apex
    const dx = 0 - cx, dz = 0 - cz, dy = 1.05 - 0.3;
    const len = Math.hypot(dx, dy, dz);
    const cab = new THREE.CylinderGeometry(0.004, 0.004, len, 4).toNonIndexed();
    cab.translate(0, len / 2, 0);
    const m4 = new THREE.Matrix4().lookAt(
      new THREE.Vector3(0, 1.05, 0), new THREE.Vector3(cx, 0.3, cz), new THREE.Vector3(0, 1, 0));
    cab.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    cab.applyMatrix4(m4);
    cab.translate(cx, 0.3, cz);
    paint(cab, C(0x8e8c86)); p.push(cab);
  }
  return merge(p);
}

/* Woven play drum (lattice cylinder), unit radius 1, h 3.4. */
export function buildPlayDrum() {
  const p = [];
  const SLATS = 18;
  for (let i = 0; i < SLATS; i++) {
    const a = (i / SLATS) * Math.PI * 2;
    const s = new THREE.BoxGeometry(0.10, 3.4, 0.04).toNonIndexed();
    s.rotateZ(Math.sin(i * 1.7) * 0.06);
    s.rotateY(-a);
    s.translate(Math.cos(a), 1.7, Math.sin(a));
    paint(s, C().setHSL(0.085, 0.45, 0.5 + (i % 3) * 0.06));
    p.push(s);
  }
  for (const hy of [0.5, 1.7, 2.9]) {
    const hoop = new THREE.TorusGeometry(1.01, 0.045, 6, 28).toNonIndexed();
    hoop.rotateX(Math.PI / 2);
    hoop.translate(0, hy, 0);
    paint(hoop, C(0x9a7544));
    p.push(hoop);
  }
  return merge(p);
}

/* Play tower + slide cluster (one-off). */
export function buildPlayTower() {
  const p = [];
  const add = (g, col, x, y, z) => { g.translate(x, y, z); paint(g, col); p.push(g); };
  for (const [tx, tz] of [[0, 0], [4.5, 2.2]]) {
    add(new THREE.BoxGeometry(2.2, 0.18, 2.2), WOOD, tx, 1.8, tz);                  // deck
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      add(new THREE.CylinderGeometry(0.09, 0.09, 1.9, 6), STEEL, tx + lx, 0.95, tz + lz);
    const roof = new THREE.ConeGeometry(1.8, 1.2, 4);
    roof.rotateY(Math.PI / 4);
    add(roof, C(0xd96f4a), tx, 3.1, tz);                                            // terracotta hat
  }
  const bridge = new THREE.BoxGeometry(2.8, 0.14, 1.1);
  bridge.rotateY(Math.atan2(2.2, 4.5));
  add(bridge, WOOD, 2.25, 1.82, 1.1);
  const slide = new THREE.BoxGeometry(0.9, 0.1, 3.6);
  slide.rotateX(0.62);
  add(slide, C(0xe0b33c), 0, 1.05, -2.4);                                           // slide chute
  for (const o of [-0.45, 0.45]) {
    const rail = new THREE.BoxGeometry(0.08, 0.26, 3.6);
    rail.rotateX(0.62);
    add(rail, C(0xc99a26), o, 1.2, -2.4);
  }
  return merge(p);
}

/* Fountain basin (water disc is a separate animated mesh in world.js). */
export function buildFountainBasin(r) {
  const p = [];
  const wall = new THREE.CylinderGeometry(r, r + 0.15, 0.55, 32, 1, true).toNonIndexed();
  wall.translate(0, 0.27, 0);
  paint(wall, C(0xd8d2c4)); p.push(wall);
  const lip = new THREE.TorusGeometry(r + 0.05, 0.14, 8, 32).toNonIndexed();
  lip.rotateX(Math.PI / 2); lip.translate(0, 0.55, 0);
  paint(lip, C(0xe5e0d2)); p.push(lip);
  const bowl = new THREE.CylinderGeometry(0.7, 0.5, 1.1, 16).toNonIndexed();
  bowl.translate(0, 0.55, 0);
  paint(bowl, C(0xcfc8b8)); p.push(bowl);
  return merge(p);
}

/* Arrival pavilion — long white shade bar on columns + glass core. */
export function buildArrival(w, d) {
  const p = [];
  const add = (g, col, x, y, z) => { g.translate(x, y, z); paint(g, col); p.push(g); };
  add(new THREE.BoxGeometry(w, 0.7, d), WHITE, 0, 6.0, 0);                          // roof slab
  add(new THREE.BoxGeometry(w + 1.5, 0.18, d + 1.5), C(0xf7f4ec), 0, 5.6, 0);       // soffit lip
  const cols = 9;
  for (let i = 0; i < cols; i++) {
    const x = -w / 2 + 6 + (i * (w - 12)) / (cols - 1);
    for (const z of [-d / 2 + 3, d / 2 - 3])
      add(new THREE.CylinderGeometry(0.32, 0.32, 5.6, 10), C(0xe8e4d8), x, 2.8, z);
  }
  add(new THREE.BoxGeometry(w * 0.42, 4.2, d * 0.45), DARKGLASS, -w * 0.12, 2.1, 0); // glass core
  add(new THREE.BoxGeometry(w * 0.42 + 0.4, 0.5, d * 0.45 + 0.4), WHITE, -w * 0.12, 4.4, 0);
  add(new THREE.BoxGeometry(w + 4, 0.3, d + 4), C(0xd9d3c5), 0, 0.15, 0);            // plinth
  return merge(p);
}

/* Light pole (head is a separate emissive instanced mesh). */
export function buildPole() {
  const g = new THREE.CylinderGeometry(0.06, 0.09, 5.6, 7).toNonIndexed();
  g.translate(0, 2.8, 0);
  paint(g, C(0x55564f));
  return g;
}
export function buildPoleHead() {
  const g = new THREE.BoxGeometry(0.55, 0.16, 0.22).toNonIndexed();
  g.translate(0.18, 5.7, 0);
  return g;
}

/* Bench + umbrella (plaza furniture). */
export function buildBench() {
  const p = [];
  const seat = new THREE.BoxGeometry(2.2, 0.12, 0.55).toNonIndexed();
  seat.translate(0, 0.46, 0); paint(seat, WOOD); p.push(seat);
  for (const o of [-0.85, 0.85]) {
    const leg = new THREE.BoxGeometry(0.16, 0.44, 0.5).toNonIndexed();
    leg.translate(o, 0.22, 0); paint(leg, C(0x6f6a5e)); p.push(leg);
  }
  return merge(p);
}
export function buildUmbrella() {
  const p = [];
  const pole = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6).toNonIndexed();
  pole.translate(0, 1.3, 0); paint(pole, STEEL); p.push(pole);
  const top = new THREE.ConeGeometry(1.9, 0.65, 8).toNonIndexed();
  top.translate(0, 2.65, 0); paint(top, C(0xefe9d8)); p.push(top);
  return merge(p);
}

/* Context villa unit box (origin at base) — instanced with non-uniform scale. */
export function buildUnitBox() {
  const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  g.translate(0, 0.5, 0);
  paint(g, C(0xffffff));
  return g;
}

/* Distant skyline silhouette (placed far north-east, fog does the grading). */
export function buildSkyline() {
  const p = [];
  const rnd = mulberry(99);
  for (let i = 0; i < 9; i++) {
    const h = 120 + rnd() * 380;
    const w = 40 + rnd() * 60;
    const b = new THREE.BoxGeometry(w, h, w).toNonIndexed();
    b.translate(-300 + i * 110 + (rnd() - 0.5) * 60, h / 2, (rnd() - 0.5) * 220);
    paint(b, C(0xffffff));
    p.push(b);
  }
  const spire = new THREE.ConeGeometry(34, 700, 6).toNonIndexed();
  spire.translate(180, 350, -60);
  paint(spire, C(0xffffff));
  p.push(spire);
  return merge(p);
}
