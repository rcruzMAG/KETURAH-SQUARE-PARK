/* World assembly — turns the layout contract (layout.js) into the scene.
   Engine lighting/fog derived from the STYLE FORMULA blocks 3–4 (design/style.md).
   Performance law: every same-type swarm is ONE InstancedMesh / merged mesh. */

import * as THREE from "./vendor/three.module.min.js";
import * as L from "./layout.js";
import { buildTextures } from "./textures.js";
import * as M from "./models.js";

const V3 = THREE.Vector3;

/* ---------- shared wind uniform ---------- */
export const uTime = { value: 0 };

function windify(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader =
      "uniform float uTime;\nattribute float aFlex;\n" +
      sh.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          float ph = 0.0;
          #ifdef USE_INSTANCING
            ph = instanceMatrix[3][0] * 1.7 + instanceMatrix[3][2] * 2.3;
          #endif
          float sway = sin(uTime * 1.25 + ph) * 0.5 + sin(uTime * 2.2 + ph * 1.31) * 0.28;
          float flut = sin(uTime * 4.6 + ph + position.y * 2.4 + position.x * 2.0) * 0.2;
          transformed.x += (sway + flut) * aFlex * 0.22;
          transformed.z += cos(uTime * 1.02 + ph) * 0.12 * aFlex;
        }`
      );
  };
  mat.customProgramCacheKey = () => "wind";
  return mat;
}

/* ---------- helpers ---------- */

/* Shape y is mirrored (-z) so that after rotateX(-PI/2) world z matches layout z
   and the face normal points UP. */
function shapeFromPoly(poly, holes = []) {
  const s = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  return s;
}

/* Flat surface mesh from polygon(s); planar world UVs. */
function surface(polys, mat, y) {
  const geos = polys.map(({ poly, holes }) => {
    const g = new THREE.ShapeGeometry(shapeFromPoly(poly, holes), 2).toNonIndexed();
    g.rotateX(-Math.PI / 2);
    return g;
  });
  const g = M.merge(geos);
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

function roundedRectPolygon(x0, z0, x1, z1, r, arcSteps = 7) {
  const pts = [];
  const corners = [
    [x1 - r, z0 + r, -Math.PI / 2, 0],       // NE
    [x1 - r, z1 - r, 0, Math.PI / 2],         // SE
    [x0 + r, z1 - r, Math.PI / 2, Math.PI],   // SW
    [x0 + r, z0 + r, Math.PI, Math.PI * 1.5], // NW
  ];
  for (const [cx, cz, a0, a1] of corners)
    for (let i = 0; i <= arcSteps; i++) {
      const t = a0 + ((a1 - a0) * i) / arcSteps;
      pts.push([cx + Math.cos(t) * r, cz + Math.sin(t) * r]);
    }
  return pts;
}

/* Ribbon strip along a polyline with width w; planar world UVs. */
function ribbon(line, w) {
  const pts = line.map(([x, z]) => new THREE.Vector2(x, z));
  const verts = [], uvs = [];
  const dirs = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const d = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
    dirs.push(new THREE.Vector2(-d.y, d.x)); // left normal
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i], p1 = pts[i + 1], n0 = dirs[i], n1 = dirs[i + 1];
    const h = w / 2;
    const a = [p0.x + n0.x * h, p0.y + n0.y * h], b = [p0.x - n0.x * h, p0.y - n0.y * h];
    const c = [p1.x + n1.x * h, p1.y + n1.y * h], d = [p1.x - n1.x * h, p1.y - n1.y * h];
    for (const v of [a, b, c, b, d, c]) { verts.push(v[0], 0, v[1]); uvs.push(v[0], v[1]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  const n = verts.length / 3, nor = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) nor[i * 3 + 1] = 1;
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return g;
}

function annulus(cx, cz, r, w, steps = 56) {
  const line = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    line.push([cx + Math.cos(t) * r, cz + Math.sin(t) * r]);
  }
  return ribbon(line, w);
}

function inst(geo, mat, transforms, { shadow = true, colors = null } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, transforms.length);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new V3(), P = new V3();
  const E = new THREE.Euler();
  transforms.forEach((t, i) => {
    E.set(0, t.ry || 0, 0);
    Q.setFromEuler(E);
    S.set(t.sx ?? t.s ?? 1, t.sy ?? t.s ?? 1, t.sz ?? t.s ?? 1);
    P.set(t.x, t.y || 0, t.z);
    M4.compose(P, Q, S);
    m.setMatrixAt(i, M4);
    if (colors) m.setColorAt(i, colors[i % colors.length]);
  });
  if (colors && m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = shadow;
  m.receiveShadow = false;
  return m;
}

/* transformed copy of a geometry (for one-off merges) */
function placed(geo, x, y, z, ry = 0, s = 1) {
  const g = geo.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(
    new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new V3(s, s, s)));
  return g;
}

/* ---------- planting blockers ---------- */

const blockPolys = [
  L.PLAZA, L.SAND, L.FINGER_A_POLY, L.FINGER_B_POLY,
  L.LOOP_N_POLY, L.LOOP_S_POLY, L.PARKING_SE,
];

function onSurface(x, z, pad = 2) {
  for (const p of blockPolys) if (L.pointInPolygon(x, z, p)) return true;
  for (const path of L.PATHS) {
    const hw = path.w / 2 + pad;
    if (L.distToPolylineSq(x, z, path.line) < hw * hw) return true;
  }
  const dx = x - L.PLAY_RING.cx, dz = z - L.PLAY_RING.cz;
  const d = Math.hypot(dx, dz);
  if (Math.abs(d - L.PLAY_RING.r) < L.PLAY_RING.w / 2 + pad) return true;
  if (Math.abs(x - L.ARRIVAL.cx) < L.ARRIVAL.w / 2 + 4 && Math.abs(z - L.ARRIVAL.cz) < L.ARRIVAL.d / 2 + 4) return true;
  if (Math.hypot(x - L.FOUNTAIN.x, z - L.FOUNTAIN.z) < L.FOUNTAIN.r + 3) return true;
  return false;
}

/* ---------- the world ---------- */

export function buildWorld(scene, isMobile) {
  const T = buildTextures();
  const colliders = [];
  const addCol = (x, z, r) => colliders.push({ x, z, r });

  const tex = (t, tile) => { const c = t.clone(); c.repeat.set(1 / tile, 1 / tile); c.needsUpdate = true; return c; };
  const std = (o) => new THREE.MeshStandardMaterial(o);

  const mats = {
    grass: std({ map: tex(T.grass, 9), roughness: 1 }),
    agrigrid: std({ map: tex(T.agrigrid, 16), roughness: 1 }),
    terracotta: std({ map: tex(T.terracotta, 6.4), roughness: 0.94 }),
    paving: std({ map: tex(T.paving, 5.2), roughness: 0.9 }),
    asphalt: std({ map: tex(T.asphalt, 11), roughness: 0.98 }),
    sand: std({ map: tex(T.sand, 8), roughness: 1 }),
    outer: std({ color: 0xc7b691, map: tex(T.sand, 26), roughness: 1 }),
    solid: std({ vertexColors: true, roughness: 0.82 }),
    wind: windify(std({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide })),
    sail: std({ map: T.fabric, color: 0xf6f3ea, roughness: 0.5, side: THREE.DoubleSide, emissive: 0xffc987, emissiveIntensity: 0 }),
    corten: std({ map: tex(T.corten, 1), roughness: 0.85 }),
    glass: std({ color: 0x1f2e2c, roughness: 0.18, metalness: 0.35, transparent: true, opacity: 0.92, emissive: 0xffc170, emissiveIntensity: 0 }),
    lampHead: std({ color: 0x2e2e2c, emissive: 0xffd9a0, emissiveIntensity: 0 }),
    mark: std({ color: 0xe8e6dd, roughness: 0.9 }),
    water: std({ color: 0x69a7b8, roughness: 0.12, metalness: 0.08, transparent: true, opacity: 0.92 }),
    skyline: new THREE.MeshBasicMaterial({ color: 0xb7becb }),
  };
  mats.corten.map.repeat.set(5, 1);
  mats.corten.map.needsUpdate = true;

  /* --- grounds --- */
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(4200, 4200), mats.outer);
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.06;
  outer.receiveShadow = true;
  scene.add(outer);

  const { x0, z0, x1, z1 } = L.SITE, R = 28;
  scene.add(surface([{ poly: roundedRectPolygon(x0, z0, x1, z1, R) }], mats.grass, 0.005));

  /* roads */
  {
    const geos = L.ROADS.map(([a, b, c, d]) => {
      const g = new THREE.PlaneGeometry(c - a, d - b).toNonIndexed();
      g.rotateX(-Math.PI / 2);
      g.translate((a + c) / 2, 0, (b + d) / 2);
      const uv = g.attributes.uv, pos = g.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
      return g;
    });
    const roads = new THREE.Mesh(M.merge(geos), mats.asphalt);
    roads.position.y = 0.02;
    roads.receiveShadow = true;
    scene.add(roads);
  }

  /* loop rings (asphalt with green island holes) + SE parking */
  scene.add(surface(
    [
      { poly: L.LOOP_N_POLY, holes: [L.ISLAND_N_POLY] },
      { poly: L.LOOP_S_POLY, holes: [L.ISLAND_S_POLY] },
      { poly: L.PARKING_SE },
    ],
    mats.asphalt, 0.045));

  scene.add(surface([{ poly: L.PLAZA }], mats.terracotta, 0.07));
  scene.add(surface([{ poly: L.SAND }], mats.sand, 0.07));
  scene.add(surface([{ poly: L.FINGER_A_POLY }, { poly: L.FINGER_B_POLY }], mats.agrigrid, 0.07));

  /* paths */
  {
    const geos = L.PATHS.map((p) => ribbon(p.line, p.w));
    geos.push(annulus(L.PLAY_RING.cx, L.PLAY_RING.cz, L.PLAY_RING.r, L.PLAY_RING.w));
    const paths = new THREE.Mesh(M.merge(geos), mats.paving);
    paths.position.y = 0.12;
    paths.receiveShadow = true;
    scene.add(paths);
  }

  /* --- placements (seeded → deterministic world) --- */
  const rnd = L.mulberry(2026);
  const palms = [], ghafs = [], shrubs = [], blobs = [];

  const planted = [];
  const minDistOk = (x, z, d) => {
    for (const [px, pz] of planted) {
      const dx = x - px, dz = z - pz;
      if (dx * dx + dz * dz < d * d) return false;
    }
    return true;
  };
  const plant = (arr, x, z, s, colR) => {
    arr.push({ x, z, ry: rnd() * Math.PI * 2, s });
    planted.push([x, z]);
    if (colR) addCol(x, z, colR * s);
  };

  /* spine allée */
  const spine = L.PATHS[0].line;
  for (let i = 0; i < spine.length - 1; i++) {
    const [ax, az] = spine[i], [bx, bz] = spine[i + 1];
    const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 16);
    for (let k = 0; k <= n; k++) {
      const t = k / Math.max(1, n);
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const dx = (bz - az) / len, dz = -(bx - ax) / len;
      for (const side of [-1, 1]) {
        const px = x + dx * side * 8, pz = z + dz * side * 8;
        if (!onSurface(px, pz, 1.4) && minDistOk(px, pz, 9)) plant(palms, px, pz, 0.92 + rnd() * 0.2, 0.4);
      }
    }
  }
  /* plaza palm grid (in grates) */
  for (let i = 0; i < 480 && palms.length < 96; i++) {
    const x = 20 + rnd() * 230, z = 20 + rnd() * 200;
    if (!L.pointInPolygon(x, z, L.PLAZA)) continue;
    let clear = true;
    for (const [dx2, dz2, dr] of L.DRUMS) if (Math.hypot(x - dx2, z - dz2) < dr + 4) clear = false;
    for (const c of L.CANOPIES) if (Math.hypot(x - c.x, z - c.z) < c.s * 0.32) clear = false;
    if (clear && minDistOk(x, z, 14)) plant(palms, x, z, 0.85 + rnd() * 0.25, 0.4);
  }
  /* play ring + island + arrival palms */
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2;
    const x = L.PLAY_RING.cx + Math.cos(a) * (L.PLAY_RING.r + 7), z = L.PLAY_RING.cz + Math.sin(a) * (L.PLAY_RING.r + 7);
    if (!onSurface(x, z, 1.2) && minDistOk(x, z, 9)) plant(palms, x, z, 0.9 + rnd() * 0.2, 0.4);
  }
  for (const loop of [L.LOOP_N, L.LOOP_S]) {
    for (let k = 0; k < 10; k++) {
      const t = (k / 9 - 0.5) * (loop.islandLen - 18);
      const off = (k % 2 ? 1 : -1) * (loop.islandW / 2 - 5);
      const c = Math.cos(loop.ang), s = Math.sin(loop.ang);
      const x = loop.cx + t * c - off * s, z = loop.cz + t * s + off * c;
      if (minDistOk(x, z, 8)) plant(palms, x, z, 0.85 + rnd() * 0.2, 0.4);
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = L.ARRIVAL.cx - L.ARRIVAL.w / 2 + 8 + i * 16, z = L.ARRIVAL.cz + L.ARRIVAL.d / 2 + 8;
    if (!onSurface(x, z, 1.2)) plant(palms, x, z, 0.95 + rnd() * 0.15, 0.4);
  }
  /* perimeter buffer palms */
  for (let i = 0; i < 4200 && palms.length < 360; i++) {
    const x = x0 + 8 + rnd() * (x1 - x0 - 16), z = z0 + 8 + rnd() * (z1 - z0 - 16);
    if (onSurface(x, z, 2.5)) continue;
    if (!minDistOk(x, z, 12)) continue;
    plant(palms, x, z, 0.78 + rnd() * 0.34, 0.4);
  }
  /* ghaf grove east + north berm + between fingers */
  for (let i = 0; i < 2400 && ghafs.length < 80; i++) {
    const x = x0 + 8 + rnd() * (x1 - x0 - 16), z = z0 + 8 + rnd() * (z1 - z0 - 16);
    const eastBias = x > 230 || z < -230 || (x > 60 && x < 220 && z > -140 && z < -40);
    if (!eastBias || onSurface(x, z, 2.5) || !minDistOk(x, z, 10)) continue;
    plant(ghafs, x, z, 0.8 + rnd() * 0.45, 0.45);
  }
  /* shrubs along the spine + rings */
  for (const path of [L.PATHS[0], L.PATHS[3], L.PATHS[4]]) {
    for (let i = 0; i < path.line.length - 1; i++) {
      const [ax, az] = path.line[i], [bx, bz] = path.line[i + 1];
      const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 11);
      for (let k = 0; k <= n; k++) {
        const t = k / Math.max(1, n);
        const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const dx = (bz - az) / len, dz = -(bx - ax) / len;
        const side = k % 2 ? 1 : -1;
        const px = x + dx * side * (path.w / 2 + 1.6), pz = z + dz * side * (path.w / 2 + 1.6);
        if (!onSurface(px, pz, 0.6)) shrubs.push({ x: px, z: pz, ry: rnd() * 6.28, s: 0.8 + rnd() * 0.5 });
      }
    }
  }
  /* context trees outside the fence */
  for (let i = 0; i < 130; i++) {
    let x, z;
    if (i < 70) { x = x1 + 40 + rnd() * 260; z = z0 + rnd() * (z1 - z0 + 120); }       // east forest
    else if (i < 100) { x = x0 - 320 + rnd() * 280; z = z0 - 10 + rnd() * (z1 - z0); } // west streetscape
    else { x = x0 + rnd() * (x1 - x0); z = z1 + 40 + rnd() * 160; }                     // south
    blobs.push({ x, z, ry: rnd() * 6.28, s: 0.7 + rnd() * 0.8 });
  }

  scene.add(inst(M.buildPalm(7), mats.wind, palms, { shadow: !isMobile }));
  scene.add(inst(M.buildGhaf(17), mats.wind, ghafs, { shadow: !isMobile }));
  scene.add(inst(M.buildShrub(27), mats.wind, shrubs, { shadow: false }));
  scene.add(inst(M.buildBlobTree(), mats.solid, blobs, { shadow: false }));

  /* --- kiosks on the green fingers --- */
  const kioskT = [];
  for (const F of [L.FINGER_A, L.FINGER_B]) {
    const c = Math.cos(F.ang), s = Math.sin(F.ang);
    for (let k = 0; k < 7; k++) {
      const t = (k / 6 - 0.5) * (F.len - 60);
      for (const side of [-1, 1]) {
        const off = side * 15;
        const x = F.cx + t * c - off * s, z = F.cz + t * s + off * c;
        const px = -s * side, pz = c * side; // outward
        kioskT.push({ x, z, ry: Math.atan2(px, pz) });
        addCol(x, z, 3.4);
      }
    }
  }
  scene.add(inst(M.buildKiosk(), mats.solid, kioskT, { shadow: !isMobile }));

  /* --- food trucks on the loop islands --- */
  const truckT = [];
  const pastel = [0xffd9b0, 0xc9e6da, 0xf6e7b2, 0xd9c9ee, 0xbcd9ea, 0xf2c4b8, 0xe8e6e0].map((h) => new THREE.Color(h));
  for (const loop of [L.LOOP_N, L.LOOP_S]) {
    const c = Math.cos(loop.ang), s = Math.sin(loop.ang);
    for (let k = 0; k < 7; k++) {
      const t = (k / 6 - 0.5) * (loop.islandLen - 26);
      const side = k % 2 ? 1 : -1;
      const off = side * (loop.islandW / 2 - 4.5);
      const x = loop.cx + t * c - off * s, z = loop.cz + t * s + off * c;
      const px = -s * side, pz = c * side;
      truckT.push({ x, z, ry: Math.atan2(px, pz) });
      addCol(x, z, 3.6);
    }
  }
  scene.add(inst(M.buildTruck(), mats.solid, truckT, { shadow: !isMobile, colors: pastel }));

  /* --- parked cars --- */
  const carT = [];
  const carCols = [0xf2f1ee, 0xf2f1ee, 0xd8d8d8, 0xb9bcbf, 0x3c4046, 0x6e2730, 0x2b3a55, 0xcfc6b4].map((h) => new THREE.Color(h));
  for (const loop of [L.LOOP_N, L.LOOP_S]) {
    const c = Math.cos(loop.ang), s = Math.sin(loop.ang);
    for (const off of [-(loop.w / 2 - 3.4), loop.w / 2 - 3.4, -(loop.islandW / 2 + 3.6), loop.islandW / 2 + 3.6]) {
      const n = Math.floor((loop.len - 50) / 5.4);
      for (let k = 0; k <= n; k++) {
        if (rnd() < 0.38) continue;
        const t = (k / n - 0.5) * (loop.len - 50);
        const x = loop.cx + t * c - off * s, z = loop.cz + t * s + off * c;
        carT.push({ x, z, ry: loop.ang + Math.PI / 2 + 0.5 * Math.sign(off) + (rnd() - 0.5) * 0.06 });
        addCol(x, z, 1.7);
      }
    }
  }
  for (let row = 0; row < 3; row++) {
    const z = 182 + row * 26;
    for (let x = 162; x < 292; x += 5.6) {
      if (rnd() < 0.42) continue;
      carT.push({ x, z, ry: Math.PI / 2 + (rnd() - 0.5) * 0.05 });
      addCol(x, z, 1.7);
    }
  }
  const carGeo = M.buildCar();
  scene.add(inst(carGeo, mats.solid, carT, { shadow: false, colors: carCols }));

  /* --- bay markings + lane dashes (one instanced unit box) --- */
  const markT = [];
  for (const loop of [L.LOOP_N, L.LOOP_S]) {
    const c = Math.cos(loop.ang), s = Math.sin(loop.ang);
    for (const off of [-(loop.w / 2 - 3.4), loop.w / 2 - 3.4, -(loop.islandW / 2 + 3.6), loop.islandW / 2 + 3.6]) {
      const n = Math.floor((loop.len - 50) / 5.4);
      for (let k = 0; k <= n; k++) {
        const t = (k / n - 0.5) * (loop.len - 50) + 2.7;
        const x = loop.cx + t * c - off * s, z = loop.cz + t * s + off * c;
        markT.push({ x, z, ry: loop.ang + Math.PI / 2 + 0.5 * Math.sign(off), sx: 0.12, sy: 0.02, sz: 5.2 });
      }
    }
  }
  for (let row = 0; row < 3; row++)
    for (let x = 159; x < 295; x += 5.6) markT.push({ x, z: 182 + row * 26, ry: Math.PI / 2, sx: 0.12, sy: 0.02, sz: 5.2 });
  for (const [a, b, c2, d] of L.ROADS) {
    const horiz = c2 - a > d - b;
    const len = horiz ? c2 - a : d - b;
    const n = Math.floor(len / 14);
    for (let k = 0; k < n; k++)
      markT.push(horiz
        ? { x: a + 7 + k * 14, z: (b + d) / 2, sx: 3.4, sy: 0.02, sz: 0.25 }
        : { x: (a + c2) / 2, z: b + 7 + k * 14, sx: 0.25, sy: 0.02, sz: 3.4 });
  }
  {
    const mk = inst(new THREE.BoxGeometry(1, 1, 1), mats.mark, markT.map((t) => ({ ...t, y: 0.055 })), { shadow: false });
    mk.receiveShadow = false;
    scene.add(mk);
  }

  /* --- restaurant drums (merged per material kind) --- */
  {
    const cortens = [], trims = [], glasses = [];
    for (const [x, z, r] of L.DRUMS) {
      cortens.push(placed(M.drumCorten(r), x, 0, z, rnd() * 6.28));
      trims.push(placed(M.drumTrim(r), x, 0, z, rnd() * 6.28));
      glasses.push(placed(M.drumGlass(r), x, 0, z));
      addCol(x, z, r + 0.4);
    }
    const corten = new THREE.Mesh(M.merge(cortens), mats.corten);
    corten.castShadow = true; corten.receiveShadow = true;
    scene.add(corten);
    const trim = new THREE.Mesh(M.merge(trims), mats.solid);
    trim.castShadow = true;
    scene.add(trim);
    scene.add(new THREE.Mesh(M.merge(glasses), mats.glass));
  }

  /* --- tensile canopies (sail + frame instanced, scaled per canopy) --- */
  {
    const t = L.CANOPIES.map((c) => ({ x: c.x, z: c.z, y: c.h * 0.28, sx: c.s, sy: c.h * 0.72, sz: c.s, ry: 0 }));
    const sail = inst(M.buildSail(), mats.sail, t, { shadow: true });
    scene.add(sail);
    const ft = L.CANOPIES.map((c) => ({ x: c.x, z: c.z, sx: c.s, sy: c.h, sz: c.s, ry: 0 }));
    scene.add(inst(M.buildFrame(), mats.solid, ft, { shadow: false }));
    for (const c of L.CANOPIES) {
      addCol(c.x, c.z, 0.5);
      for (const [ox, oz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]])
        addCol(c.x + ox * c.s, c.z + oz * c.s, 0.45);
    }
  }

  /* --- play structures --- */
  {
    const drums = L.PLAY_RINGS.map(([x, z, r]) => ({ x, z, ry: rnd() * 6.28, sx: r, sy: 0.95 + rnd() * 0.15, sz: r }));
    scene.add(inst(M.buildPlayDrum(), mats.solid, drums, { shadow: !isMobile }));
    for (const [x, z, r] of L.PLAY_RINGS) addCol(x, z, r + 0.25);
    const tower = new THREE.Mesh(M.buildPlayTower(), mats.solid);
    tower.position.set(-8, 0.07, 8);
    tower.rotation.y = 0.6;
    tower.castShadow = true;
    scene.add(tower);
    addCol(-8, 8, 3.2); addCol(-4.5, 11, 3);
  }

  /* --- fountain --- */
  let water;
  {
    const basin = new THREE.Mesh(M.buildFountainBasin(L.FOUNTAIN.r), mats.solid);
    basin.position.set(L.FOUNTAIN.x, 0.1, L.FOUNTAIN.z);
    basin.castShadow = true;
    scene.add(basin);
    water = new THREE.Mesh(new THREE.CircleGeometry(L.FOUNTAIN.r - 0.35, 28), mats.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(L.FOUNTAIN.x, 0.42, L.FOUNTAIN.z);
    scene.add(water);
    addCol(L.FOUNTAIN.x, L.FOUNTAIN.z, L.FOUNTAIN.r + 0.3);
  }

  /* --- arrival pavilion --- */
  {
    const a = new THREE.Mesh(M.buildArrival(L.ARRIVAL.w, L.ARRIVAL.d), mats.solid);
    a.position.set(L.ARRIVAL.cx, 0, L.ARRIVAL.cz);
    a.castShadow = true; a.receiveShadow = true;
    scene.add(a);
    addCol(L.ARRIVAL.cx - L.ARRIVAL.w * 0.12, L.ARRIVAL.cz, L.ARRIVAL.d * 0.28); // glass core
    for (let i = 0; i < 9; i++) {
      const px = L.ARRIVAL.cx - L.ARRIVAL.w / 2 + 6 + (i * (L.ARRIVAL.w - 12)) / 8;
      addCol(px, L.ARRIVAL.cz - L.ARRIVAL.d / 2 + 3, 0.45);
      addCol(px, L.ARRIVAL.cz + L.ARRIVAL.d / 2 - 3, 0.45);
    }
  }

  /* --- light poles + furniture --- */
  const poleT = [];
  for (let i = 1; i < spine.length - 1; i++) {
    const [x, z] = spine[i];
    poleT.push({ x: x + (i % 2 ? 6 : -6), z, ry: 0 });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    poleT.push({ x: L.PLAY_RING.cx + Math.cos(a) * (L.PLAY_RING.r + 2.5), z: L.PLAY_RING.cz + Math.sin(a) * (L.PLAY_RING.r + 2.5), ry: -a });
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    poleT.push({ x: 150 + Math.cos(a) * 88, z: 128 + Math.sin(a) * 88, ry: -a + Math.PI });
  }
  for (const t of poleT) addCol(t.x, t.z, 0.3);
  scene.add(inst(M.buildPole(), mats.solid, poleT, { shadow: false }));
  scene.add(inst(M.buildPoleHead(), mats.lampHead, poleT, { shadow: false }));

  const benchT = [];
  for (let i = 1; i < spine.length - 1; i++) {
    const [ax, az] = spine[i], [bx, bz] = spine[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const dx = (bz - az) / len, dz = -(bx - ax) / len;
    benchT.push({ x: ax + dx * 5.6, z: az + dz * 5.6, ry: Math.atan2(-dx, -dz) });
  }
  scene.add(inst(M.buildBench(), mats.solid, benchT, { shadow: false }));
  for (const b of benchT) addCol(b.x, b.z, 1.0);

  const umbT = [];
  for (const [x, z, r] of L.DRUMS)
    for (let i = 0; i < 3; i++) {
      const a = rnd() * Math.PI * 2;
      umbT.push({ x: x + Math.cos(a) * (r + 4), z: z + Math.sin(a) * (r + 4), ry: rnd() * 6.28 });
    }
  scene.add(inst(M.buildUmbrella(), mats.solid, umbT, { shadow: !isMobile }));
  for (const u of umbT) addCol(u.x, u.z, 0.3);

  /* --- hedge fence with entry gaps --- */
  {
    const gaps = [[-70, z0], [x0, -125], [x0, 140], [180, z1], [235, z1], [x1, 110]];
    const segs = [];
    const edge = (xa, za, xb, zb) => {
      const len = Math.hypot(xb - xa, zb - za), n = Math.floor(len / 4);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = xa + (xb - xa) * t, z = za + (zb - za) * t;
        let nearGap = false;
        for (const [gx, gz] of gaps) if (Math.hypot(x - gx, z - gz) < 9) nearGap = true;
        if (nearGap) continue;
        const g = new THREE.BoxGeometry(xa === xb ? 1.0 : 4.2, 1.15, xa === xb ? 4.2 : 1.0).toNonIndexed();
        g.translate(x, 0.58, z);
        segs.push(g);
      }
    };
    edge(x0 + R, z0, x1 - R, z0); edge(x0 + R, z1, x1 - R, z1);
    edge(x0, z0 + R, x0, z1 - R); edge(x1, z0 + R, x1, z1 - R);
    const hg = M.merge(segs);
    const n = hg.attributes.position.count, col = hg.attributes.color;
    for (let i = 0; i < n; i++) col.setXYZ(i, 0.16, 0.26, 0.11);
    const hedge = new THREE.Mesh(hg, mats.solid);
    hedge.castShadow = false;
    scene.add(hedge);
  }

  /* --- context: villas + skyline + highway cars --- */
  {
    const villaT = [], villaCols = [0xe9e2d2, 0xded5c2, 0xf0ebe0, 0xd2c7b2].map((h) => new THREE.Color(h));
    for (let i = 0; i < 1400 && villaT.length < 170; i++) {
      let x, z;
      const pick = rnd();
      if (pick < 0.45) { x = x0 - 360 + rnd() * 300; z = z0 - 20 + rnd() * (z1 - z0 + 140); }
      else if (pick < 0.8) { x = x1 + 330 + rnd() * 320; z = z0 - 20 + rnd() * (z1 - z0 + 160); }
      else { x = x0 - 200 + rnd() * (x1 - x0 + 400); z = z1 + 60 + rnd() * 240; }
      villaT.push({ x, z, ry: (Math.floor(rnd() * 4) * Math.PI) / 2, sx: 11 + rnd() * 9, sy: 4.5 + rnd() * 5.5, sz: 10 + rnd() * 8 });
    }
    scene.add(inst(M.buildUnitBox(), mats.solid, villaT, { shadow: false, colors: villaCols }));

    const sky = new THREE.Mesh(M.buildSkyline(), mats.skyline);
    sky.position.set(900, 0, -1500);
    scene.add(sky);
  }

  const movingCars = inst(carGeo, mats.solid, Array.from({ length: 12 }, (_, i) => ({
    x: -600 + i * 120, z: i % 2 ? -344 : -366, ry: i % 2 ? Math.PI / 2 : -Math.PI / 2,
  })), { shadow: false, colors: carCols });
  scene.add(movingCars);

  /* --- fireflies (dusk) --- */
  let fireflies;
  {
    const N = 240, pos = new Float32Array(N * 3), ph = new Float32Array(N);
    let i = 0, guard = 0;
    while (i < N && guard++ < 4000) {
      const x = x0 + 10 + rnd() * (x1 - x0 - 20), z = z0 + 10 + rnd() * (z1 - z0 - 20);
      if (onSurface(x, z, 0)) continue;
      pos[i * 3] = x; pos[i * 3 + 1] = 0.6 + rnd() * 2.2; pos[i * 3 + 2] = z;
      ph[i] = rnd() * 6.28;
      i++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime, uOpacity: { value: 0 } },
      vertexShader: `
        uniform float uTime; attribute float aPhase; varying float vTw;
        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.9 + aPhase) * 0.45;
          p.x += sin(uTime * 0.53 + aPhase * 2.1) * 0.8;
          vTw = 0.55 + 0.45 * sin(uTime * 2.2 + aPhase * 3.7);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = 130.0 * vTw / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uOpacity; varying float vTw;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.0, d);
          gl_FragColor = vec4(1.0, 0.82, 0.45, a * a * vTw * uOpacity);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    fireflies = new THREE.Points(g, mat);
    fireflies.visible = false;
    scene.add(fireflies);
  }

  /* --- sky dome --- */
  const skyU = {
    uDay: { value: 0 },
    uSunDir: { value: new V3(0.45, 0.62, -0.55).normalize() },
  };
  {
    const mat = new THREE.ShaderMaterial({
      uniforms: skyU,
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uDay; uniform vec3 uSunDir; varying vec3 vDir;
        void main(){
          float h = max(vDir.y, 0.0);
          vec3 zenD = vec3(0.42,0.62,0.80), horD = vec3(0.91,0.86,0.78);
          vec3 zenN = vec3(0.13,0.18,0.33), horN = vec3(0.95,0.60,0.33);
          vec3 zen = mix(zenD, zenN, uDay), hor = mix(horD, horN, uDay);
          vec3 col = mix(hor, zen, pow(h, 0.62));
          float s = max(dot(normalize(vDir), uSunDir), 0.0);
          vec3 sunCol = mix(vec3(1.0,0.95,0.82), vec3(1.0,0.62,0.30), uDay);
          col += sunCol * (pow(s, 700.0) * 1.6 + pow(s, 22.0) * mix(0.18, 0.55, uDay));
          col += vec3(0.92,0.80,0.62) * pow(1.0 - h, 5.0) * 0.12; // dust band
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1700, 32, 16), mat));
  }

  /* --- lights --- */
  const sun = new THREE.DirectionalLight(0xffe3b8, 2.35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 512 : 1024, isMobile ? 512 : 1024);
  const sc = sun.shadow.camera;
  sc.left = -95; sc.right = 95; sc.top = 95; sc.bottom = -95; sc.near = 1; sc.far = 650;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xbfd7e8, 0xc9b89a, 0.75);
  scene.add(hemi);

  scene.fog = new THREE.Fog(0xe5d9c3, 260, 1500);
  scene.background = null; // sky dome covers it

  /* --- time-of-day state --- */
  const DAY = {
    sunDir: new V3(0.45, 0.62, -0.55).normalize(), sunCol: new THREE.Color(0xffe3b8), sunInt: 2.35,
    hemiSky: new THREE.Color(0xbfd7e8), hemiGround: new THREE.Color(0xc9b89a), hemiInt: 0.7,
    fog: new THREE.Color(0xe5d9c3), fogNear: 260, fogFar: 1500,
    lamp: 0, glow: 0, ff: 0, sailGlow: 0,
  };
  const DUSK = {
    sunDir: new V3(-0.82, 0.13, 0.30).normalize(), sunCol: new THREE.Color(0xff9e5e), sunInt: 1.5,
    hemiSky: new THREE.Color(0x47557a), hemiGround: new THREE.Color(0x7a5a40), hemiInt: 0.42,
    fog: new THREE.Color(0xc98a5e), fogNear: 200, fogFar: 1150,
    lamp: 2.4, glow: 1.1, ff: 0.9, sailGlow: 0.28,
  };
  const tmpC = new THREE.Color();
  function applyTime(d) {
    sun.position.copy(DAY.sunDir).lerp(DUSK.sunDir, d).multiplyScalar(420).add(sun.target.position);
    sun.color.copy(DAY.sunCol).lerp(DUSK.sunCol, d);
    sun.intensity = DAY.sunInt + (DUSK.sunInt - DAY.sunInt) * d;
    hemi.color.copy(DAY.hemiSky).lerp(DUSK.hemiSky, d);
    hemi.groundColor.copy(DAY.hemiGround).lerp(DUSK.hemiGround, d);
    hemi.intensity = DAY.hemiInt + (DUSK.hemiInt - DAY.hemiInt) * d;
    scene.fog.color.copy(DAY.fog).lerp(DUSK.fog, d);
    scene.fog.near = DAY.fogNear + (DUSK.fogNear - DAY.fogNear) * d;
    scene.fog.far = DAY.fogFar + (DUSK.fogFar - DAY.fogFar) * d;
    mats.lampHead.emissiveIntensity = DAY.lamp + (DUSK.lamp - DAY.lamp) * d;
    mats.glass.emissiveIntensity = DAY.glow + (DUSK.glow - DAY.glow) * d;
    mats.sail.emissiveIntensity = DAY.sailGlow * (1 - d) + DUSK.sailGlow * d;
    fireflies.visible = d > 0.05;
    fireflies.material.uniforms.uOpacity.value = DAY.ff + (DUSK.ff - DAY.ff) * d;
    skyU.uDay.value = d;
    skyU.uSunDir.value.copy(DAY.sunDir).lerp(DUSK.sunDir, d).normalize();
    mats.skyline.color.setHex(0xb7becb).lerp(tmpC.setHex(0x4a4258), d);
  }
  applyTime(0);

  /* per-frame world animation (temps preallocated — zero allocations in loop) */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new V3(1, 1, 1), p3 = new V3();
  function tick(t, dt, playerPos) {
    uTime.value = t;
    water.rotation.z = t * 0.12;
    sun.target.position.set(playerPos.x, 0, playerPos.z);
    sun.target.updateMatrixWorld();
    const d = skyU.uDay.value;
    sun.position.copy(DAY.sunDir).lerp(DUSK.sunDir, d).normalize().multiplyScalar(420).add(sun.target.position);
    // highway traffic
    for (let i = 0; i < 12; i++) {
      const dir = i % 2 ? 1 : -1;
      const speed = 26 + (i % 3) * 6;
      let x = -600 + i * 120 + ((t * speed * dir) % 1450);
      if (x > 850) x -= 1450; if (x < -600) x += 1450;
      e.set(0, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      q.setFromEuler(e);
      p3.set(x, 0.02, i % 2 ? -344 : -366);
      m4.compose(p3, q, s3);
      movingCars.setMatrixAt(i, m4);
    }
    movingCars.instanceMatrix.needsUpdate = true;
  }

  /* surface classification for footsteps */
  function surfaceAt(x, z) {
    for (const p of L.PATHS) {
      const hw = p.w / 2;
      if (L.distToPolylineSq(x, z, p.line) < hw * hw) return "paving";
    }
    const dr = Math.hypot(x - L.PLAY_RING.cx, z - L.PLAY_RING.cz);
    if (Math.abs(dr - L.PLAY_RING.r) < L.PLAY_RING.w / 2) return "paving";
    if (L.pointInPolygon(x, z, L.SAND)) return "sand";
    if (L.pointInPolygon(x, z, L.PLAZA)) return "terracotta";
    if (L.pointInPolygon(x, z, L.FINGER_A_POLY) || L.pointInPolygon(x, z, L.FINGER_B_POLY)) return "grass";
    if (L.pointInPolygon(x, z, L.LOOP_N_POLY) || L.pointInPolygon(x, z, L.LOOP_S_POLY) || L.pointInPolygon(x, z, L.PARKING_SE)) return "asphalt";
    return "grass";
  }

  return { colliders, applyTime, tick, surfaceAt, _sun: sun };
}
