/* Keturah Square Park — first-person park experience.
   App layer: renderer, input→commands, fixed-timestep sim, audio mix, HUD.
   Budgets per design/thresholds.md; smoke route via ?route=ref, overlay via ?dev=1. */

import * as THREE from "./vendor/three.module.min.js";
import { STR } from "./strings.js";
import * as L from "./layout.js";
import { buildWorld } from "./world.js";

const qs = new URLSearchParams(location.search);
const DEV = qs.has("dev");
const ROUTE = qs.get("route") === "ref";
const isMobile = matchMedia("(pointer: coarse)").matches;

const $ = (id) => document.getElementById(id);

/* ---------- renderer / scene / camera ---------- */

const renderer = new THREE.WebGLRenderer({ canvas: $("c"), antialias: true, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 2400);
camera.rotation.order = "YXZ";

const DPR_CAP = 1.5;
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, DPR_CAP);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
addEventListener("orientationchange", resize);
resize();

/* ---------- world ---------- */

const world = buildWorld(scene, isMobile);

/* ---------- player state (deterministic fixed-step sim) ---------- */

const player = {
  pos: new THREE.Vector3(L.SPAWN.x, 0, L.SPAWN.z),
  vel: new THREE.Vector3(),
  yaw: L.SPAWN.yaw,
  pitch: 0,
  bob: 0,
  speedSm: 0,
  stepAcc: 0,
};
const WALK = 3.2, SPRINT = 6.0, EYE = 1.7;

/* ---------- input → commands ---------- */

const BIND = {
  KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  ShiftLeft: "sprint", ShiftRight: "sprint",
  KeyE: "interact", KeyT: "time", KeyM: "mute",
};
const held = new Set();
const pressed = new Set(); // edge-triggered
addEventListener("keydown", (e) => {
  const c = BIND[e.code];
  if (!c) return;
  if (!held.has(c)) pressed.add(c);
  held.add(c);
  e.preventDefault();
});
addEventListener("keyup", (e) => { const c = BIND[e.code]; if (c) held.delete(c); });

/* pointer lock + drag-look fallback */
const canvas = $("c");
let dragging = false, lastX = 0, lastY = 0;
function lockPointer() { canvas.requestPointerLock?.(); }
addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === canvas) {
    player.yaw -= e.movementX * 0.0023;
    player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - e.movementY * 0.0023));
  } else if (dragging) {
    player.yaw -= (e.clientX - lastX) * 0.0035;
    player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - (e.clientY - lastY) * 0.0035));
    lastX = e.clientX; lastY = e.clientY;
  }
});
canvas.addEventListener("mousedown", (e) => {
  if (started && document.pointerLockElement !== canvas) {
    lockPointer();
    dragging = true; lastX = e.clientX; lastY = e.clientY;
  }
});
addEventListener("mouseup", () => (dragging = false));

/* touch: left zone = stick, right zone = look, buttons in DOM */
const touchState = { moveId: null, mx: 0, mz: 0, ox: 0, oy: 0, lookId: null, lx: 0, ly: 0, sprint: false };
canvas.addEventListener("touchstart", (e) => {
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.45 && touchState.moveId === null) {
      touchState.moveId = t.identifier;
      touchState.ox = t.clientX; touchState.oy = t.clientY;
      const s = $("stick"); s.style.display = "block";
      s.style.left = t.clientX - 52 + "px"; s.style.top = t.clientY - 52 + "px";
    } else if (touchState.lookId === null) {
      touchState.lookId = t.identifier;
      touchState.lx = t.clientX; touchState.ly = t.clientY;
    }
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener("touchmove", (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === touchState.moveId) {
      const dx = t.clientX - touchState.ox, dy = t.clientY - touchState.oy;
      const len = Math.hypot(dx, dy), max = 48;
      const k = len > max ? max / len : 1;
      touchState.mx = (dx * k) / max;
      touchState.mz = (dy * k) / max;
      touchState.sprint = len > max * 1.6;
      const kn = $("knob");
      kn.style.transform = `translate(${dx * k}px,${dy * k}px)`;
    } else if (t.identifier === touchState.lookId) {
      player.yaw -= (t.clientX - touchState.lx) * 0.005;
      player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - (t.clientY - touchState.ly) * 0.005));
      touchState.lx = t.clientX; touchState.ly = t.clientY;
    }
  }
  e.preventDefault();
}, { passive: false });
function endTouch(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === touchState.moveId) {
      touchState.moveId = null; touchState.mx = touchState.mz = 0; touchState.sprint = false;
      $("stick").style.display = "none";
      $("knob").style.transform = "";
    }
    if (t.identifier === touchState.lookId) touchState.lookId = null;
  }
  e.preventDefault();
}
canvas.addEventListener("touchend", endTouch, { passive: false });
canvas.addEventListener("touchcancel", endTouch, { passive: false });

/* gamepad */
const padPrev = {};
function pollPad(cmds) {
  for (const gp of navigator.getGamepads?.() ?? []) {
    if (!gp) continue;
    const dz = (v) => (Math.abs(v) > 0.18 ? v : 0);
    cmds.padX = dz(gp.axes[0] || 0);
    cmds.padZ = dz(gp.axes[1] || 0);
    player.yaw -= dz(gp.axes[2] || 0) * 0.045;
    player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - dz(gp.axes[3] || 0) * 0.035));
    if (gp.buttons[7]?.pressed || gp.buttons[10]?.pressed) cmds.sprint = true;
    const edge = (i, name) => {
      const p = gp.buttons[i]?.pressed;
      if (p && !padPrev[i]) pressed.add(name);
      padPrev[i] = p;
    };
    edge(0, "interact");
    edge(3, "time");
  }
}

/* ---------- audio (mix targets per references/audio.md) ---------- */

const audio = { ctx: null, buf: {}, muted: false, master: null };
async function initAudio() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audio.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 6; // ear-safety ceiling
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(ctx.destination);
    audio.master = master;
    const load = async (name, url) => {
      const r = await fetch(url);
      audio.buf[name] = await ctx.decodeAudioData(await r.arrayBuffer());
    };
    await Promise.all([
      load("amb", "./assets/audio/ambience.mp3"),
      load("music", "./assets/audio/music.m4a"),
      load("step", "./assets/audio/step.mp3"),
      load("chime", "./assets/audio/chime.mp3"),
    ]);
    const loop = (name, gain) => {
      const src = ctx.createBufferSource();
      src.buffer = audio.buf[name];
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g).connect(master);
      src.start();
    };
    loop("amb", 0.34);   // ambience ≈ −12 dBFS layer
    loop("music", 0.11); // music ≈ −19 dBFS bed
  } catch (e) { /* audio is optional — keep walking */ }
}
const STEP_MIX = { paving: [0.34, 1.0], terracotta: [0.34, 1.05], asphalt: [0.3, 0.95], grass: [0.16, 0.8], sand: [0.2, 0.7] };
function playStep(surfaceKind) {
  if (!audio.ctx || audio.muted || !audio.buf.step) return;
  const [vol, rate] = STEP_MIX[surfaceKind] || STEP_MIX.paving;
  const src = audio.ctx.createBufferSource();
  src.buffer = audio.buf.step;
  src.playbackRate.value = rate * (0.92 + Math.random() * 0.16);
  const g = audio.ctx.createGain();
  g.gain.value = vol * (0.85 + Math.random() * 0.3);
  src.connect(g).connect(audio.master);
  src.start();
}
function playChime() {
  if (!audio.ctx || audio.muted || !audio.buf.chime) return;
  const src = audio.ctx.createBufferSource();
  src.buffer = audio.buf.chime;
  const g = audio.ctx.createGain();
  g.gain.value = 0.5;
  src.connect(g).connect(audio.master);
  src.start();
}

/* ---------- zones / discovery ---------- */

const discovered = new Set();
let activeZone = null;
function nearestZone() {
  for (const z of L.ZONES) {
    const dx = player.pos.x - z.x, dz = player.pos.z - z.z;
    if (dx * dx + dz * dz < z.r * z.r) return z;
  }
  return null;
}
function discover(zone) {
  if (discovered.has(zone.id)) return;
  discovered.add(zone.id);
  playChime();
  const s = STR.zones[zone.id];
  $("cardKicker").textContent = s.kicker;
  $("cardTitle").textContent = s.title;
  $("cardBody").textContent = s.body;
  $("cardTag").textContent = `${STR.discoveredLabel} — ${discovered.size}/6`;
  const card = $("card");
  card.classList.add("show");
  clearTimeout(discover._t);
  discover._t = setTimeout(() => card.classList.remove("show"), 9000);
  $("zoneCount").textContent = `${discovered.size}/6 ${STR.hudZones}`;
  drawMapBase();
  if (discovered.size === L.ZONES.length) {
    setTimeout(() => {
      playChime();
      $("doneTitle").textContent = STR.completionTitle;
      $("doneBody").textContent = STR.completionBody;
      $("done").classList.add("show");
      setTimeout(() => $("done").classList.remove("show"), 14000);
    }, 1400);
  }
}

/* ---------- day / dusk ---------- */

let dayTarget = 0, dayCur = 0;
function toggleTime() {
  dayTarget = dayTarget > 0.5 ? 0 : 1;
  $("btnTime").textContent = dayTarget > 0.5 ? "☀" : "🌙";
  $("btnTime").title = dayTarget > 0.5 ? STR.btnDusk : STR.btnDay;
}

/* ---------- minimap ---------- */

const mapBase = document.createElement("canvas");
mapBase.width = mapBase.height = 320;
const MAP = { sx: 320 / 640, ox: 320 / 2 - ((L.SITE.x0 + L.SITE.x1) / 2) * (320 / 640), oy: 320 / 2 - ((L.SITE.z0 + L.SITE.z1) / 2) * (320 / 640) };
const mpx = (x) => x * MAP.sx + MAP.ox;
const mpy = (z) => z * MAP.sx + MAP.oy;
function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, z], i) => (i ? ctx.lineTo(mpx(x), mpy(z)) : ctx.moveTo(mpx(x), mpy(z))));
  ctx.closePath();
}
function drawMapBase() {
  const ctx = mapBase.getContext("2d");
  ctx.fillStyle = "#b3a37f";
  ctx.fillRect(0, 0, 320, 320);
  ctx.fillStyle = "#7e9447";
  ctx.beginPath();
  ctx.roundRect(mpx(L.SITE.x0), mpy(L.SITE.z0), (L.SITE.x1 - L.SITE.x0) * MAP.sx, (L.SITE.z1 - L.SITE.z0) * MAP.sx, 14);
  ctx.fill();
  for (const [a, b, c, d] of L.ROADS) {
    ctx.fillStyle = "#6e6e70";
    ctx.fillRect(mpx(a), mpy(b), (c - a) * MAP.sx, (d - b) * MAP.sx);
  }
  ctx.fillStyle = "#6e6e70";
  poly(ctx, L.LOOP_N_POLY); ctx.fill();
  poly(ctx, L.LOOP_S_POLY); ctx.fill();
  poly(ctx, L.PARKING_SE); ctx.fill();
  ctx.fillStyle = "#86a050";
  poly(ctx, L.ISLAND_N_POLY); ctx.fill();
  poly(ctx, L.ISLAND_S_POLY); ctx.fill();
  ctx.fillStyle = "#d8d2c0";
  poly(ctx, L.CENTRAL); ctx.fill();
  ctx.fillStyle = "#b65f3e";
  poly(ctx, L.PLAZA); ctx.fill();
  ctx.fillStyle = "#dec9a0";
  poly(ctx, L.SAND); ctx.fill();
  ctx.fillStyle = "#a8bd72";
  poly(ctx, L.FINGER_A_POLY); ctx.fill();
  poly(ctx, L.FINGER_B_POLY); ctx.fill();
  ctx.strokeStyle = "#d8d2c0";
  for (const p of L.PATHS) {
    ctx.lineWidth = Math.max(1.4, p.w * MAP.sx);
    ctx.beginPath();
    p.line.forEach(([x, z], i) => (i ? ctx.lineTo(mpx(x), mpy(z)) : ctx.moveTo(mpx(x), mpy(z))));
    ctx.stroke();
  }
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(mpx(L.PLAY_RING.cx), mpy(L.PLAY_RING.cz), L.PLAY_RING.r * MAP.sx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#f2efe6";
  ctx.fillRect(mpx(L.ARRIVAL.cx - L.ARRIVAL.w / 2), mpy(L.ARRIVAL.cz - L.ARRIVAL.d / 2), L.ARRIVAL.w * MAP.sx, L.ARRIVAL.d * MAP.sx);
  for (const [x, z, r] of L.DRUMS) {
    ctx.fillStyle = "#8a4a30";
    ctx.beginPath(); ctx.arc(mpx(x), mpy(z), Math.max(2.5, r * MAP.sx), 0, Math.PI * 2); ctx.fill();
  }
  for (const c of L.CANOPIES.slice(0, 2)) {
    ctx.fillStyle = "rgba(250,248,240,.92)";
    ctx.save();
    ctx.translate(mpx(c.x), mpy(c.z));
    ctx.rotate(Math.PI / 4);
    const s = c.s * MAP.sx * 0.62;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
  for (const z of L.ZONES) {
    const on = discovered.has(z.id);
    ctx.fillStyle = on ? "#ffb43c" : "rgba(30,28,24,.55)";
    ctx.beginPath(); ctx.arc(mpx(z.x), mpy(z.z), on ? 5 : 3.6, 0, Math.PI * 2); ctx.fill();
    if (on) { ctx.strokeStyle = "rgba(255,180,60,.55)"; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
drawMapBase();
const mapCv = $("map");
const mapCtx = mapCv.getContext("2d");
function drawMap() {
  mapCtx.clearRect(0, 0, 160, 160);
  mapCtx.save();
  mapCtx.beginPath();
  mapCtx.roundRect(0, 0, 160, 160, 12);
  mapCtx.clip();
  mapCtx.drawImage(mapBase, 0, 0, 320, 320, 0, 0, 160, 160);
  const px = mpx(player.pos.x) / 2, py = mpy(player.pos.z) / 2;
  mapCtx.translate(px, py);
  mapCtx.rotate(-player.yaw);
  mapCtx.fillStyle = "#fff";
  mapCtx.strokeStyle = "rgba(0,0,0,.5)";
  mapCtx.beginPath();
  mapCtx.moveTo(0, -6); mapCtx.lineTo(4, 5); mapCtx.lineTo(-4, 5);
  mapCtx.closePath();
  mapCtx.fill(); mapCtx.stroke();
  mapCtx.restore();
}

/* ---------- simulation ---------- */

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();
function step(dt) {
  let ix = 0, iz = 0, sprint = false;
  if (held.has("up")) iz -= 1;
  if (held.has("down")) iz += 1;
  if (held.has("left")) ix -= 1;
  if (held.has("right")) ix += 1;
  ix += touchState.mx + (step._padX || 0);
  iz += touchState.mz + (step._padZ || 0);
  if (held.has("sprint") || touchState.sprint || step._padSprint) sprint = true;
  const len = Math.hypot(ix, iz);
  if (len > 1) { ix /= len; iz /= len; }

  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(-fwd.z, 0, fwd.x);
  wish.copy(fwd).multiplyScalar(-iz).addScaledVector(right, ix);
  const target = (sprint ? SPRINT : WALK);
  wish.multiplyScalar(target);
  player.vel.lerp(wish, 1 - Math.exp(-10 * dt));
  player.pos.addScaledVector(player.vel, dt);

  // colliders (push-out circles)
  for (const c of world.colliders) {
    const dx = player.pos.x - c.x, dz = player.pos.z - c.z;
    const r = c.r + 0.45;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      player.pos.x = c.x + (dx / d) * r;
      player.pos.z = c.z + (dz / d) * r;
    }
  }
  // site bounds
  player.pos.x = Math.max(L.SITE.x0 + 2, Math.min(L.SITE.x1 - 2, player.pos.x));
  player.pos.z = Math.max(L.SITE.z0 + 2, Math.min(L.SITE.z1 - 2, player.pos.z));

  // footsteps + bob
  const sp = Math.hypot(player.vel.x, player.vel.z);
  player.speedSm += (sp - player.speedSm) * Math.min(1, 6 * dt);
  player.bob += sp * dt * 1.9;
  player.stepAcc += sp * dt;
  const strideLen = sprint ? 2.9 : 2.2;
  if (player.stepAcc > strideLen && sp > 0.7) {
    player.stepAcc = 0;
    playStep(world.surfaceAt(player.pos.x, player.pos.z));
  }
}

/* ---------- reference route executor (?route=ref) ---------- */

const route = { i: 0, fps: [], minFps: Infinity, maxCalls: 0, done: false };
function routeStep() {
  if (route.done) return;
  const [tx, tz] = L.REF_ROUTE[route.i];
  const dx = tx - player.pos.x, dz = tz - player.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 3) {
    route.i++;
    if (route.i >= L.REF_ROUTE.length) {
      route.done = true;
      held.delete("up");
      held.delete("sprint");
      const avg = route.fps.reduce((a, b) => a + b, 0) / Math.max(1, route.fps.length);
      const msg = `${STR.routeDone}: zones ${discovered.size}/6, avgFPS ${avg.toFixed(1)}, minFPS ${route.minFps.toFixed(0)}, maxCalls ${route.maxCalls}`;
      console.log("[smoke]", msg);
      $("dev").textContent = msg;
      return;
    }
  }
  player.yaw = Math.atan2(-dx, -dz);
  held.add("up");
  held.add("sprint");
  const z = nearestZone();
  if (z && !discovered.has(z.id)) discover(z);
}

/* ---------- HUD / buttons ---------- */

let started = false;
$("title").textContent = STR.title;
$("subtitle").textContent = STR.subtitle;
$("concept").textContent = STR.conceptLine;
$("ctrlHead").textContent = STR.controlsHeading;
$("ctrl1").textContent = STR.controlsMove;
$("ctrl2").textContent = STR.controlsLook;
$("ctrl3").textContent = STR.controlsSprint;
$("ctrl4").textContent = STR.controlsInteract;
$("ctrl5").textContent = STR.controlsTime;
$("enter").textContent = STR.enter;
$("zoneCount").textContent = `0/6 ${STR.hudZones}`;
$("btnTime").title = STR.btnDay;
$("btnMute").title = STR.btnSoundOn;

$("enter").addEventListener("click", () => {
  started = true;
  $("intro").classList.add("hide");
  initAudio();
  if (!isMobile) lockPointer();
});
$("btnTime").addEventListener("click", toggleTime);
$("btnMute").addEventListener("click", () => {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.9;
  $("btnMute").textContent = audio.muted ? "🔇" : "🔊";
  $("btnMute").title = audio.muted ? STR.btnSoundOff : STR.btnSoundOn;
});
$("btnAct").addEventListener("click", () => pressed.add("interact"));
$("prompt").addEventListener("click", () => pressed.add("interact"));

/* ---------- main loop (fixed timestep) ---------- */

const STEPMS = 1000 / 60;
let acc = 0, last = performance.now(), paused = false;
let frames = 0, fpsAt = last, fps = 60;
let simT = 0;
addEventListener("blur", () => (paused = true));
addEventListener("focus", () => { paused = false; last = performance.now(); });
if (DEV || ROUTE) $("dev").style.display = "block";

function frame(now) {
  requestAnimationFrame(frame);
  if (paused) return;
  acc += Math.min(ROUTE ? 2000 : 250, now - last); // route mode: keep sim real-time even on slow renderers
  last = now;

  if (started) {
    // gamepad → per-frame command state
    step._padX = 0; step._padZ = 0; step._padSprint = false;
    const cmds = { padX: 0, padZ: 0, sprint: false };
    pollPad(cmds);
    step._padX = cmds.padX; step._padZ = cmds.padZ; step._padSprint = cmds.sprint;
    while (acc >= STEPMS) {
      if (ROUTE && !route.done) routeStep();
      step(STEPMS / 1000);
      simT += STEPMS / 1000;
      acc -= STEPMS;
    }

    // edge commands
    if (pressed.has("time")) toggleTime();
    if (pressed.has("mute")) $("btnMute").click();
    if (pressed.has("interact")) {
      const z = nearestZone();
      if (z) discover(z);
    }
    pressed.clear();

    // zone prompt
    const z = nearestZone();
    if (z && !discovered.has(z.id)) {
      if (activeZone !== z.id) {
        activeZone = z.id;
        $("promptText").textContent = `${STR.interactPrompt} — ${STR.zones[z.id].title}`;
        $("prompt").classList.add("show");
        $("btnAct").classList.add("show");
      }
    } else if (activeZone) {
      activeZone = null;
      $("prompt").classList.remove("show");
      $("btnAct").classList.remove("show");
    }
  } else {
    acc = 0;
  }

  // day/dusk transition (time-based, frame-rate independent)
  const fdt = Math.min(0.25, (now - (frame._p || now)) / 1000);
  frame._p = now;
  if (Math.abs(dayCur - dayTarget) > 0.0005) {
    dayCur += (dayTarget - dayCur) * Math.min(1, fdt * 2.4);
    if (Math.abs(dayCur - dayTarget) < 0.0005) dayCur = dayTarget;
    world.applyTime(dayCur);
  }

  // camera
  const bobAmp = Math.min(1, player.speedSm / SPRINT);
  camera.position.set(player.pos.x, EYE + Math.sin(player.bob) * 0.055 * bobAmp, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, Math.sin(player.bob * 0.5) * 0.004 * bobAmp);
  const targetFov = 70 + 7 * Math.max(0, (player.speedSm - WALK) / (SPRINT - WALK));
  camera.fov += (targetFov - camera.fov) * 0.08;
  camera.updateProjectionMatrix();

  world.tick(simT, STEPMS / 1000, player.pos);
  renderer.render(scene, camera);
  drawMap();

  frames++;
  if (now - fpsAt >= 500) {
    fps = (frames * 1000) / (now - fpsAt);
    frames = 0; fpsAt = now;
    if (DEV || ROUTE) {
      const ri = renderer.info.render;
      $("dev").textContent = route.done ? $("dev").textContent
        : `${fps.toFixed(0)} ${STR.devFps} · ${ri.calls} ${STR.devCalls} · ${(ri.triangles / 1000).toFixed(0)}k ${STR.devTris}`;
    }
    if (ROUTE && !route.done && started) {
      route.fps.push(fps);
      route.minFps = Math.min(route.minFps, fps);
      route.maxCalls = Math.max(route.maxCalls, renderer.info.render.calls);
    }
  }
}
requestAnimationFrame(frame);

/* auto-start for the smoke route */
if (ROUTE) setTimeout(() => $("enter").click(), 600);

/* dev hook for QC tooling */
if (DEV || ROUTE) {
  window.__park = {
    teleport(x, z, yaw = 0, pitch = 0) { player.pos.set(x, 0, z); player.yaw = yaw; player.pitch = pitch; },
    setDay(v) { dayTarget = v; dayCur = v; world.applyTime(v); },
    info: () => renderer.info.render,
    sun: () => world._sun,
    route: () => ({ i: route.i, done: route.done, x: player.pos.x, z: player.pos.z, zones: discovered.size }),
    scene, renderer, THREE,
  };
}
