/* Procedural tileable textures — seamless BY CONSTRUCTION (periodic value noise,
   joints at integer divisions of the tile). Technique-independent rules from
   references/textures.md apply: wrap on both axes, aligned structural patterns,
   flat lighting, no focal object.
   STYLE FORMULA (design/style.md) governs every palette below:
   sun-bleached lawn greens, warm terracotta ochres, pale granite paving,
   warm white architecture, golden dusty grade. */

import * as THREE from "./vendor/three.module.min.js";
import { mulberry } from "./layout.js";

/* Periodic value noise: lattice values hashed mod `period` so the field tiles. */
function makeNoise(seed, period) {
  const rnd = mulberry(seed);
  const lat = new Float32Array(period * period);
  for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const at = (x, y) => lat[((y % period + period) % period) * period + ((x % period + period) % period)];
  return function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function fbm(noise, x, y, oct = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += noise(x * f, y * f) * amp; amp *= 0.5; f *= 2; }
  return v;
}

function canvasTexture(size, draw, { repeat = 1, srgb = true } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function fillNoise(ctx, size, base, vary, noise, scale, oct) {
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(noise, (x / size) * scale, (y / size) * scale, oct);
      const i = (y * size + x) * 4;
      d[i] = Math.max(0, Math.min(255, base[0] + (n - 0.5) * vary[0]));
      d[i + 1] = Math.max(0, Math.min(255, base[1] + (n - 0.5) * vary[1]));
      d[i + 2] = Math.max(0, Math.min(255, base[2] + (n - 0.5) * vary[2]));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function buildTextures() {
  const T = {};

  /* tex-grass — sun-bleached lawn. */
  T.grass = canvasTexture(512, (ctx, s) => {
    const n = makeNoise(11, 8);
    fillNoise(ctx, s, [100, 134, 62], [48, 50, 34], n, 8, 5);
    const rnd = mulberry(12);
    ctx.globalAlpha = 0.22; // blade speckle, wrapped
    for (let i = 0; i < 5200; i++) {
      const x = rnd() * s, y = rnd() * s, l = 2 + rnd() * 3.2;
      const g = 96 + (rnd() * 90) | 0;
      ctx.strokeStyle = `rgb(${g - 50},${g},${(g * 0.42) | 0})`;
      ctx.beginPath();
      const a = rnd() * Math.PI;
      for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
        ctx.moveTo(x + ox, y + oy);
        ctx.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

  /* tex-agrigrid — pale lattice planting grid for the green fingers. */
  T.agrigrid = canvasTexture(512, (ctx, s) => {
    const n = makeNoise(21, 8);
    fillNoise(ctx, s, [152, 172, 104], [56, 56, 40], n, 8, 4);
    const cells = 8; // integer count → wraps
    ctx.strokeStyle = "rgba(236,238,224,0.55)";
    ctx.lineWidth = 3;
    for (let i = 0; i <= cells; i++) {
      const p = (i * s) / cells;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
    }
    const rnd = mulberry(22);
    ctx.fillStyle = "rgba(96,118,58,0.5)";
    for (let i = 0; i < cells; i++)
      for (let j = 0; j < cells; j++) {
        if (rnd() < 0.5) continue;
        const x = ((i + 0.5) * s) / cells, y = ((j + 0.5) * s) / cells;
        ctx.beginPath(); ctx.arc(x, y, 9 + rnd() * 9, 0, Math.PI * 2); ctx.fill();
      }
  });

  /* tex-terracotta — warm plaza paving with tonal patches + joints. */
  T.terracotta = canvasTexture(512, (ctx, s) => {
    const n = makeNoise(31, 8);
    fillNoise(ctx, s, [176, 96, 64], [54, 38, 30], n, 6, 4);
    const tiles = 8;
    const rnd = mulberry(32);
    for (let i = 0; i < tiles; i++) // per-tile tonal patching, aligned to grid
      for (let j = 0; j < tiles; j++) {
        ctx.fillStyle = `rgba(${150 + (rnd() * 50) | 0},${80 + (rnd() * 30) | 0},${52 + (rnd() * 22) | 0},0.30)`;
        ctx.fillRect((i * s) / tiles, (j * s) / tiles, s / tiles, s / tiles);
      }
    ctx.strokeStyle = "rgba(96,48,34,0.65)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= tiles; i++) {
      const p = (i * s) / tiles;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
    }
  });

  /* tex-paving — pale granite promenade slabs. */
  T.paving = canvasTexture(512, (ctx, s) => {
    const n = makeNoise(41, 8);
    fillNoise(ctx, s, [206, 198, 182], [40, 38, 36], n, 10, 4);
    const tiles = 4;
    ctx.strokeStyle = "rgba(132,124,112,0.7)";
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= tiles; i++) {
      const p = (i * s) / tiles;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
    }
    const rnd = mulberry(42);
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 2200; i++) { // speckle (point features wrap trivially)
      const g = 120 + (rnd() * 110) | 0;
      ctx.fillStyle = `rgb(${g},${g - 6},${g - 14})`;
      ctx.fillRect(rnd() * s, rnd() * s, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  });

  /* tex-asphalt. */
  T.asphalt = canvasTexture(512, (ctx, s) => {
    const n = makeNoise(51, 8);
    fillNoise(ctx, s, [64, 64, 66], [26, 26, 28], n, 12, 4);
    const rnd = mulberry(52);
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 3000; i++) {
      const g = 60 + (rnd() * 80) | 0;
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(rnd() * s, rnd() * s, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;
  });

  /* tex-sand — pale play sand with warped ripple bands (periodic phases). */
  T.sand = canvasTexture(512, (ctx, s) => {
    const n = makeNoise(61, 8);
    fillNoise(ctx, s, [224, 200, 158], [36, 34, 30], n, 7, 4);
    const img = ctx.getImageData(0, 0, s, s);
    const d = img.data;
    const warp = makeNoise(62, 4);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const w = warp((x / s) * 4, (y / s) * 4) * 2.2;
        const band = Math.sin(((y / s) * 14 + w) * Math.PI * 2) * 9; // integer band count → wraps
        const i = (y * s + x) * 4;
        d[i] += band; d[i + 1] += band * 0.92; d[i + 2] += band * 0.8;
      }
    ctx.putImageData(img, 0, 0);
  });

  /* corten — rust drum cladding (vertical streaks wrap horizontally). */
  T.corten = canvasTexture(512, (ctx, s) => {
    const n = makeNoise(71, 8);
    fillNoise(ctx, s, [128, 70, 46], [60, 40, 30], n, 5, 5);
    const rnd = mulberry(72);
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 240; i++) {
      const x = rnd() * s, w = 2 + rnd() * 8;
      const t = 90 + rnd() * 70;
      ctx.fillStyle = `rgb(${t | 0},${(t * 0.52) | 0},${(t * 0.34) | 0})`;
      ctx.fillRect(x, 0, w, s);
      if (x + w > s) ctx.fillRect(x - s, 0, w, s); // wrap streaks crossing the seam
    }
    ctx.globalAlpha = 1;
  });

  /* canopy fabric — warm white with radial seam hints (used non-repeating). */
  T.fabric = canvasTexture(256, (ctx, s) => {
    const n = makeNoise(81, 8);
    fillNoise(ctx, s, [243, 240, 232], [16, 16, 18], n, 6, 3);
  });

  return T;
}
