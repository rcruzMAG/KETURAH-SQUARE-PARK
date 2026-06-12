/* Procedural palm tree — geometry built in code, wind animation in GLSL.
   One merged BufferGeometry per palm with custom attributes:
     aFlex — 0 at trunk base → ~1.25 at frond tips; scales wind displacement
     aTint — 0 trunk / 1 frond; mixes the two material colours
   The material works for both regular and instanced meshes (three.js defines
   USE_INSTANCING automatically for InstancedMesh); per-instance wind phase is
   derived from the instance's world offset so a grove never sways in unison. */

import * as THREE from "../../assets/vendor/three.module.min.js";

function setScalarAttr(geo, name, fn) {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    arr[i] = fn(pos.getX(i), pos.getY(i), pos.getZ(i));
  }
  geo.setAttribute(name, new THREE.BufferAttribute(arr, 1));
}

function mergeGeoms(geoms) {
  let total = 0;
  for (const g of geoms) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const flex = new Float32Array(total);
  const tint = new Float32Array(total);
  let o = 0;
  for (const g of geoms) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    flex.set(g.attributes.aFlex.array, o);
    tint.set(g.attributes.aTint.array, o);
    o += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("aFlex", new THREE.BufferAttribute(flex, 1));
  out.setAttribute("aTint", new THREE.BufferAttribute(tint, 1));
  return out;
}

/* Builds a palm ~3.9 units tall with its base at the origin. */
export function buildPalmGeometry(seed = 1) {
  const rnd = mulberry(seed);
  const parts = [];
  const H = 2.2;

  // trunk — tapered cylinder with a gentle lean baked into the vertices
  const trunk = new THREE.CylinderGeometry(0.05, 0.1, H, 7, 6, true).toNonIndexed();
  trunk.translate(0, H / 2, 0);
  {
    const p = trunk.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i) / H;
      p.setX(i, p.getX(i) + t * t * 0.28);
    }
    p.needsUpdate = true;
  }
  setScalarAttr(trunk, "aFlex", (x, y) => Math.pow(y / H, 2) * 0.35);
  setScalarAttr(trunk, "aTint", () => 0);
  parts.push(trunk);

  // fronds — tapered, drooping planes radiating from the crown
  const FRONDS = 9;
  for (let i = 0; i < FRONDS; i++) {
    const L = 1.55 + rnd() * 0.45;
    const f = new THREE.PlaneGeometry(0.5, L, 1, 7).toNonIndexed();
    f.translate(0, L / 2, 0);
    const p = f.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const t = p.getY(j) / L;
      p.setX(j, p.getX(j) * (1 - 0.72 * t)); // taper to a tip
      p.setZ(j, p.getZ(j) - 0.78 * t * t);   // droop
    }
    p.needsUpdate = true;
    f.computeVertexNormals();
    setScalarAttr(f, "aFlex", (x, y) => {
      const t = y / L;
      return 0.3 + t * t * 0.95;
    });
    setScalarAttr(f, "aTint", () => 1);

    const pitch = 0.55 + (i % 4) * 0.27 + rnd() * 0.15;
    const yaw = (i / FRONDS) * Math.PI * 2 + rnd() * 0.4;
    const m = new THREE.Matrix4()
      .makeRotationY(yaw)
      .multiply(new THREE.Matrix4().makeRotationX(pitch));
    f.applyMatrix4(m);
    f.translate(0.28, H, 0); // crown sits atop the leaned trunk tip
    parts.push(f);
  }

  // coconuts
  for (let i = 0; i < 2; i++) {
    const c = new THREE.SphereGeometry(0.07, 6, 5).toNonIndexed();
    c.translate(0.28 + (i ? 0.09 : -0.07), H - 0.06, i ? 0.06 : -0.05);
    setScalarAttr(c, "aFlex", () => 0.18);
    setScalarAttr(c, "aTint", () => 0);
    parts.push(c);
  }

  return mergeGeoms(parts);
}

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  attribute float aFlex;
  attribute float aTint;
  varying float vTint;
  varying float vShade;

  void main() {
    vTint = aTint;

    float phase = 0.0;
    #ifdef USE_INSTANCING
      phase = instanceMatrix[3][0] * 1.7 + instanceMatrix[3][2] * 2.3;
    #endif

    // layered sway + high-frequency frond flutter
    float sway = sin(uTime * 1.35 + phase) * 0.55
               + sin(uTime * 2.3 + phase * 1.31) * 0.3;
    float flutter = sin(uTime * 5.1 + phase + position.y * 3.0 + position.x * 2.0) * 0.16;

    vec3 p = position;
    p.x += (sway + flutter) * aFlex * uWind;
    p.z += cos(uTime * 1.05 + phase) * 0.33 * aFlex * uWind;

    // cheap directional shading computed before projection
    vec3 n = normalize(normalMatrix * normal);
    vShade = 0.72 + 0.28 * max(dot(n, normalize(vec3(0.5, 0.85, 0.35))), 0.0);

    vec4 mp = vec4(p, 1.0);
    #ifdef USE_INSTANCING
      mp = instanceMatrix * mp;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * mp;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uTrunk;
  uniform vec3 uFrond;
  uniform float uShadeAmt;
  varying float vTint;
  varying float vShade;

  void main() {
    vec3 c = mix(uTrunk, uFrond, vTint);
    c *= mix(1.0, vShade, uShadeAmt);
    gl_FragColor = vec4(c, 1.0);
  }
`;

export function createPalmMaterial({ trunk, frond, shade = 0.0, wind = 0.06 }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: wind },
      uTrunk: { value: new THREE.Color(trunk) },
      uFrond: { value: new THREE.Color(frond) },
      uShadeAmt: { value: shade },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
  });
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
