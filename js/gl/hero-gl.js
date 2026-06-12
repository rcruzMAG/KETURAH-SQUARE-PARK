/* WebGL hero — three layers in one renderer:
     1. fullscreen photo quad with a custom fragment shader
        (cover-fit, mouse parallax, ground heat-haze, vignette, film grain)
     2. GPU firefly particle system (THREE.Points, additive glow sprites)
     3. procedural 3D palm silhouettes with vertex-shader wind
   The perspective camera drifts against the photo's UV shift so the
   foreground palms separate from the render in true depth. */

import * as THREE from "../../assets/vendor/three.module.min.js";
import { buildPalmGeometry, createPalmMaterial } from "./palm.js";

const PHOTO_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2 uRes;
  uniform vec2 uImgRes;
  uniform vec2 uMouse;
  uniform float uTime;
  uniform float uScroll;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    // cover-fit the image into the viewport
    vec2 s = uRes / uImgRes;
    float scale = max(s.x, s.y);
    vec2 sz = uImgRes * scale;
    vec2 off = (uRes - sz) * 0.5;
    vec2 uv = (gl_FragCoord.xy - off) / sz;

    // zoom in slightly so parallax shift never samples outside the image
    uv = (uv - 0.5) * 0.94 + 0.5;
    uv += uMouse * vec2(0.014, 0.009);
    uv.y += uScroll * 0.06;

    // heat haze rising from the lit ground (bottom third)
    float heat = smoothstep(0.45, 0.0, uv.y);
    uv.x += sin(uv.y * 90.0 + uTime * 1.6) * 0.0016 * heat;
    uv.y += cos(uv.x * 70.0 + uTime * 1.1) * 0.0010 * heat;

    vec3 c = texture2D(uTex, uv).rgb;

    // warm dusk grade + vignette
    c *= vec3(1.03, 1.0, 0.97);
    vec2 v = (gl_FragCoord.xy / uRes) - 0.5;
    c *= 1.0 - dot(v, v) * 0.55;

    // film grain
    c += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.025;

    gl_FragColor = vec4(c, 1.0);
  }
`;

const FIREFLY_VERT = /* glsl */ `
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uPx;
  varying float vGlow;

  void main() {
    vec3 p = position;
    float t = uTime * aSpeed + aPhase;
    p.x += sin(t) * 0.55 + sin(t * 0.37) * 0.8;
    p.y += sin(t * 0.81 + 1.7) * 0.4 + uTime * aSpeed * 0.05;
    p.y = mod(p.y + 2.6, 5.2) - 2.6;
    p.z += cos(t * 0.62) * 0.4;

    vGlow = 0.45 + 0.55 * sin(t * 2.3);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uPx * (2.6 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FIREFLY_FRAG = /* glsl */ `
  precision mediump float;
  varying float vGlow;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vGlow;
    gl_FragColor = vec4(vec3(1.0, 0.82, 0.52) * a, a);
  }
`;

export function initHero() {
  const hero = document.getElementById("hero");
  const canvas = document.getElementById("heroCanvas");
  if (!hero || !canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.autoClear = false;

  /* ---- background photo quad ---- */
  const bgScene = new THREE.Scene();
  const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const photoUniforms = {
    uTex: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uImgRes: { value: new THREE.Vector2(1672, 941) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uTime: { value: 0 },
    uScroll: { value: 0 },
  };
  new THREE.TextureLoader().load("assets/img/hero-night.jpg", (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    photoUniforms.uTex.value = t;
    photoUniforms.uImgRes.value.set(t.image.width, t.image.height);
    canvas.classList.add("ready");
  });
  bgScene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: photoUniforms,
        vertexShader: "void main(){ gl_Position = vec4(position.xy, 0.999, 1.0); }",
        fragmentShader: PHOTO_FRAG,
        depthWrite: false,
        depthTest: false,
      })
    )
  );

  /* ---- foreground scene: palms + fireflies ---- */
  const fgScene = new THREE.Scene();
  const fgCam = new THREE.PerspectiveCamera(55, 1, 0.1, 40);
  fgCam.position.set(0, 0, 5);

  const palmMat = createPalmMaterial({
    trunk: 0x0a1410,
    frond: 0x0a1410,
    shade: 0.0,
    wind: 0.07,
  });
  const palmGroup = new THREE.Group();
  const palmSpecs = [
    { seed: 11, x: -1, z: 0.4, s: 1.15, rot: 0.12 },
    { seed: 23, x: -1, z: -1.6, s: 0.78, rot: -0.07 },
    { seed: 37, x: 1, z: 0.1, s: 1.05, rot: -0.14, flip: true },
  ];
  const palms = palmSpecs.map((spec) => {
    const mesh = new THREE.Mesh(buildPalmGeometry(spec.seed), palmMat);
    mesh.rotation.z = spec.rot;
    if (spec.flip) mesh.scale.x = -1;
    palmGroup.add(mesh);
    return { mesh, spec };
  });
  fgScene.add(palmGroup);

  const FLIES = 70;
  const fPos = new Float32Array(FLIES * 3);
  const fPhase = new Float32Array(FLIES);
  const fSpeed = new Float32Array(FLIES);
  const fSize = new Float32Array(FLIES);
  for (let i = 0; i < FLIES; i++) {
    fPos[i * 3] = (Math.random() - 0.5) * 9;
    fPos[i * 3 + 1] = (Math.random() - 0.5) * 5;
    fPos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    fPhase[i] = Math.random() * Math.PI * 2;
    fSpeed[i] = 0.25 + Math.random() * 0.6;
    fSize[i] = 5 + Math.random() * 11;
  }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute("position", new THREE.BufferAttribute(fPos, 3));
  fGeo.setAttribute("aPhase", new THREE.BufferAttribute(fPhase, 1));
  fGeo.setAttribute("aSpeed", new THREE.BufferAttribute(fSpeed, 1));
  fGeo.setAttribute("aSize", new THREE.BufferAttribute(fSize, 1));
  const flyUniforms = { uTime: { value: 0 }, uPx: { value: 1 } };
  fgScene.add(
    new THREE.Points(
      fGeo,
      new THREE.ShaderMaterial({
        uniforms: flyUniforms,
        vertexShader: FIREFLY_VERT,
        fragmentShader: FIREFLY_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
  );

  /* ---- layout / input ---- */
  const mouse = new THREE.Vector2();
  const mouseTarget = new THREE.Vector2();
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    mouseTarget.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -(((e.clientY - r.top) / r.height) * 2 - 1)
    );
  });

  function placePalms() {
    const halfH = Math.tan((fgCam.fov * Math.PI) / 360) * fgCam.position.z;
    const halfW = halfH * fgCam.aspect;
    for (const { mesh, spec } of palms) {
      const depthScale = 1 - spec.z / -8;
      mesh.position.set(
        spec.x * (halfW - 0.35) * (spec.x < 0 ? 1.06 : 1.0),
        -halfH * depthScale - 0.15,
        spec.z
      );
      mesh.scale.setScalar(spec.s * (halfH / 2.4));
      if (spec.flip) mesh.scale.x *= -1;
    }
  }

  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    fgCam.aspect = w / h;
    fgCam.updateProjectionMatrix();
    photoUniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    flyUniforms.uPx.value = renderer.getPixelRatio();
    placePalms();
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---- render loop (paused offscreen / hidden tab) ---- */
  const start = performance.now();
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 }).observe(hero);

  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    const t = (performance.now() - start) / 1000;

    mouse.lerp(mouseTarget, 0.05);
    photoUniforms.uTime.value = t;
    photoUniforms.uMouse.value.copy(mouse);
    photoUniforms.uScroll.value = Math.min(window.scrollY / Math.max(hero.clientHeight, 1), 1);

    palmMat.uniforms.uTime.value = t;
    flyUniforms.uTime.value = t;

    // camera drifts opposite the photo shift → depth separation
    fgCam.position.x = -mouse.x * 0.22;
    fgCam.position.y = -mouse.y * 0.12 + photoUniforms.uScroll.value * 0.9;
    fgCam.lookAt(fgCam.position.x * 0.4, fgCam.position.y * 0.4, 0);

    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.render(fgScene, fgCam);
  });
}
