/* Interactive 3D masterplan of the Three-Finger Salute.
   Stylized scene built from primitives: sand ground, three extruded green
   finger lobes, terracotta civic-heart plaza, arrival spine, tensile
   canopies, pergola "outdoor rooms", and an InstancedMesh palm grove
   sharing the wind vertex shader with the hero.
   Interactions: slow auto-orbit, pointer drag to orbit, and hover on the
   anatomy list (data-zone) highlights the matching plan element. */

import * as THREE from "../../assets/vendor/three.module.min.js";
import { buildPalmGeometry, createPalmMaterial } from "./palm.js";

function roundedLobe(width, length) {
  // teardrop lobe: half-circle tip + tapering sides back to a rounded base
  const s = new THREE.Shape();
  const w = width / 2;
  s.moveTo(-w * 0.55, 0);
  s.quadraticCurveTo(-w, length * 0.35, -w * 0.85, length * 0.7);
  s.quadraticCurveTo(-w * 0.7, length * 0.97, 0, length);
  s.quadraticCurveTo(w * 0.7, length * 0.97, w * 0.85, length * 0.7);
  s.quadraticCurveTo(w, length * 0.35, w * 0.55, 0);
  s.quadraticCurveTo(0, -length * 0.12, -w * 0.55, 0);
  return s;
}

function flat(shape, depth, color, opts = {}) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 24,
  });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, ...opts }));
  mesh.receiveShadow = true;
  return mesh;
}

export function initMasterplan() {
  const host = document.getElementById("masterplanWindow");
  const img = host && host.querySelector("img");
  if (!host) return;

  const canvas = document.createElement("canvas");
  canvas.className = "masterplan-canvas";
  host.appendChild(canvas);
  if (img) img.style.display = "none";
  host.classList.add("gl");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);

  /* ---- lights ---- */
  scene.add(new THREE.HemisphereLight(0xfff3dc, 0x6b5a40, 1.05));
  const sun = new THREE.DirectionalLight(0xffe2b0, 1.6);
  sun.position.set(4.5, 6, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  scene.add(sun);

  /* ---- ground ---- */
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(5.4, 64).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xddcda6 })
  );
  ground.receiveShadow = true;
  scene.add(ground);
  const apron = new THREE.Mesh(
    new THREE.RingGeometry(5.4, 6.4, 64).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xe9dfc2, transparent: true, opacity: 0.6 })
  );
  apron.position.y = -0.005;
  scene.add(apron);

  const zones = {}; // data-zone → [{ mesh, baseY, baseEmissive }]
  function register(zone, mesh) {
    (zones[zone] = zones[zone] || []).push({
      mesh,
      baseY: mesh.position.y,
      boost: 0,
      target: 0,
    });
  }

  /* ---- three green fingers (north = -Z) ---- */
  const fingerAngles = [-0.55, 0, 0.5];
  for (const a of fingerAngles) {
    const lobe = flat(roundedLobe(0.95, 2.6), 0.07, 0x55795c);
    lobe.rotation.y = a; // shape's +Y maps to -Z (north), yawed per finger
    // offset each lobe from the plaza edge so the gaps between fingers read
    lobe.position.set(-Math.sin(a) * 0.8, 0.012, -Math.cos(a) * 0.8);
    scene.add(lobe);
    register("fingers", lobe);
  }

  /* ---- civic heart plaza ---- */
  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.18, 0.09, 48),
    new THREE.MeshLambertMaterial({ color: 0xb46a4a })
  );
  plaza.position.y = 0.045;
  plaza.receiveShadow = true;
  scene.add(plaza);
  register("heart", plaza);

  // tensile canopies on the plaza
  const canopyMat = new THREE.MeshLambertMaterial({
    color: 0xf4ecd9,
    emissive: 0x332c1e,
    side: THREE.DoubleSide,
  });
  const canopySpots = [
    [0, 0.32, 0.46],
    [0.62, 0.25, 0.34],
    [-0.6, 0.3, 0.36],
    [0.25, -0.55, 0.3],
    [-0.3, -0.5, 0.28],
  ];
  for (const [x, z, r] of canopySpots) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.35, 4, 1, true), canopyMat);
    cone.position.set(x, 0.09 + r * 0.72, z);
    cone.rotation.y = Math.random() * Math.PI;
    cone.castShadow = true;
    scene.add(cone);
    register("heart", cone);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, r * 1.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x6e604a })
    );
    pole.position.set(x, 0.09 + r * 0.7, z);
    scene.add(pole);
  }

  /* ---- arrival spine (south → plaza) ---- */
  const spineShape = new THREE.Shape();
  spineShape.moveTo(-0.34, 0);
  spineShape.lineTo(-0.34, 2.4);
  spineShape.quadraticCurveTo(0, 2.62, 0.34, 2.4);
  spineShape.lineTo(0.34, 0);
  spineShape.quadraticCurveTo(0, -0.18, -0.34, 0);
  const spine = flat(spineShape, 0.05, 0xe6d9b8);
  spine.position.set(0, 0.014, 3.4); // runs from the south edge to the plaza
  scene.add(spine);
  register("spine", spine);

  /* ---- shaded outdoor rooms between the fingers ---- */
  const roomMat = new THREE.MeshLambertMaterial({ color: 0xcdb083 });
  for (const m of [-0.275, 0.25]) { // midway between adjacent fingers
    const room = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.5), roomMat.clone());
    room.position.set(-Math.sin(m) * 1.9, 0.07, -Math.cos(m) * 1.9);
    room.rotation.y = m;
    room.castShadow = true;
    scene.add(room);
    register("rooms", room);
  }

  /* ---- instanced palm grove ---- */
  const palmGeo = buildPalmGeometry(7);
  const palmMat = createPalmMaterial({
    trunk: 0x7a6243,
    frond: 0x4a7a55,
    shade: 0.45,
    wind: 0.05,
  });
  const spots = [];
  for (const a of fingerAngles) {
    for (let i = 0; i < 4; i++) {
      const d = 1.2 + i * 0.62;
      for (const side of [-0.58, 0.58]) {
        spots.push([
          Math.sin(a) * -d + Math.cos(a) * side,
          -Math.cos(a) * d - Math.sin(a) * side * 0.3,
        ]);
      }
    }
  }
  for (let i = 0; i < 6; i++) spots.push([(i % 2 ? 0.6 : -0.6), 1.5 + Math.floor(i / 2) * 0.85]);
  const grove = new THREE.InstancedMesh(palmGeo, palmMat, spots.length);
  grove.castShadow = true;
  const dummy = new THREE.Object3D();
  spots.forEach(([x, z], i) => {
    dummy.position.set(x, 0.02, z);
    dummy.rotation.y = (x * 7 + z * 13) % (Math.PI * 2);
    dummy.scale.setScalar(0.18 + ((i * 37) % 10) * 0.006);
    dummy.updateMatrix();
    grove.setMatrixAt(i, dummy.matrix);
  });
  scene.add(grove);

  /* ---- orbit: slow auto-rotate + pointer drag ---- */
  let azimuth = 0.45;
  let polar = 0.72; // angle from +Y — near-plan view so the salute reads
  let dragging = false;
  let autoSpin = true;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    autoSpin = false;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    azimuth -= (e.clientX - lastX) * 0.006;
    polar = THREE.MathUtils.clamp(polar - (e.clientY - lastY) * 0.004, 0.45, 1.25);
    lastX = e.clientX;
    lastY = e.clientY;
  });
  const endDrag = () => {
    dragging = false;
    setTimeout(() => { if (!dragging) autoSpin = true; }, 4000);
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  /* ---- anatomy hover sync ---- */
  const HIGHLIGHT = new THREE.Color(0xa98e5c);
  document.querySelectorAll(".anatomy li[data-zone]").forEach((li) => {
    const zone = li.dataset.zone;
    const set = (v) => () => (zones[zone] || []).forEach((z) => (z.target = v));
    li.addEventListener("mouseenter", set(1));
    li.addEventListener("mouseleave", set(0));
    li.addEventListener("focusin", set(1));
    li.addEventListener("focusout", set(0));
  });

  /* ---- sizing / loop ---- */
  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 }).observe(host);

  const start = performance.now();
  let prev = start;
  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    const now = performance.now();
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    const t = (now - start) / 1000;

    if (autoSpin && !dragging) azimuth += dt * 0.12;

    const R = 7.6;
    camera.position.set(
      R * Math.sin(polar) * Math.sin(azimuth),
      R * Math.cos(polar),
      R * Math.sin(polar) * Math.cos(azimuth)
    );
    camera.lookAt(0, 0, -0.6);

    palmMat.uniforms.uTime.value = t;

    for (const zone of Object.values(zones)) {
      for (const z of zone) {
        z.boost += (z.target - z.boost) * Math.min(dt * 7, 1);
        if (z.boost > 0.001) {
          z.mesh.position.y = z.baseY + z.boost * 0.08;
          z.mesh.material.emissive = HIGHLIGHT.clone().multiplyScalar(z.boost * 0.45);
        } else {
          z.mesh.position.y = z.baseY;
        }
      }
    }

    renderer.render(scene, camera);
  });
}
