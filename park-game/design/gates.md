# design/gates.md — gate walk-throughs (mode S)

## Stage 1 gate — Plan (§§1–5 merged, mode S)
- [✓] profile.md content: every §1 axis chosen + strictness mode S recorded (design/plan.md §1)
- [✓] delivery context recorded: desktop+mobile web, keyboard/mouse/touch/gamepad, physical key codes, English with external strings
- [✓] §7.5 budgets for weakest platform (mobile): draw_call_budget 80, entity estimate, worst_case_scene named (plan.md §1, thresholds.md)
- [✓] laws: learnable patterns concrete; short/medium/long loops; 2 uncertainty sources with carrier mechanics; horizon→source map no empty rows (plan.md §2)
- [✓] concept: experience formula on template; element table with justified refusals (conflict/resources absent → curiosity/discovery replaces); load-bearing pillar named (aesthetics) with mutual reinforcement; interest curve with named hook (plan.md §3)
- [✓] system: verbs+objects+responses, strong verb marked (walk/look), development written; loop signs (mild positive minimap loop, no snowball — no failure state); information map incl. "how player learns" (dimmed minimap regions) (plan.md §4)
- [✓] prototype question written before building (plan.md §5); meditative-walking forms of contrast (6/6 vs 0/6) declared
- [✓] thresholds.md fixed before implementation

## Stage 1b gate — STYLE FORMULA (stylization.md)
- [✓] stylization.md opened and followed (not from memory)
- [✓] FORMULA: 5 blocks, 60–90 words, palette by role (environment greens/terracotta/granite, architecture warm white/corten, markers luminous amber), perspective handling per §8 (3D pipeline: eye-level realism clause; engine lighting derived from blocks 3–4 in design/style.md)
- [✓] STYLE TOKEN ≤120 chars derived once
- [✓] style explicit in brief (user's photoreal renders) → posted, no approval block required
- [✓] zero visual output existed before the FORMULA

## Stage 2 gate — Assets (manifest = law)
- [✓] every manifest row routed per the Asset references table: tiles→textures.md (read; procedural tiles seamless **by periodic construction** — all noise/joint functions wrap mod tile size; structural alignment of paving joints guaranteed by integer joint counts; verified visually in smoke), 3D→3d-animation.md (read; non-rigged props branch: procedural Three.js geometry, no rig needed; native 3D tool not required), audio→audio.md (read; 1 music track sonilo_music d=40 looped + 3 SFX mirelo_text_to_audio within the ≤5 budget; mixed to −18/−12 dBFS targets in code, master ≤ −3 dBFS)
- [✓] STYLE FORMULA embedded byte-identical in every generation prompt (audio prompts carry mood per audio.md; image prompts carry FORMULA verbatim; procedural generators carry it in their header comment + derive constants from design/style.md)
- [✓] all generation jobs polled to completion and files downloaded into the project before stage 3 (see stage 2 report)
- [✓] regeneration budget respected (≤2 per asset)

## Stage 3 gate — Assemble (build-game.md, read in full before game code)
- [✓] zip layout per §1: logic.js (solo stub, exact §1 shape) + index.html + assets at root
- [✓] client per §2: canvas game, all RELATIVE paths, physical key codes (KeyW…), touch + keyboard + gamepad first-class, responsive + DPR cap 1.5, pause on blur, fixed-timestep sim (route mode raises the catch-up cap to stay real-time on slow renderers), seeded RNG (mulberry, deterministic world), strings external in strings.js (zero UI literals in game code), three.js r184 vendored (no CDN), dev overlay ?dev=1 (FPS · draw calls · tris)
- [✓] every assets.csv row consumed by the build (textures.js / models.js / world.js / audio loop in main.js / store images for deploy)

## Stage 4 gate — Verify (preflight §5 + smoke §13.5)
- [✓] preflight artifacts exist: design/plan.md, design/assets.csv, design/thresholds.md, STYLE FORMULA (design/style.md), design/layout.md
- [✓] served locally (http.server) — no 404s, no console/page errors
- [✓] smoke: reference route runs END TO END headless (?route=ref): zones 6/6 (contrast vs 0/6 no-enter route by construction), deterministic fixed-step sim
- [✓] draw calls max 34 < budget 80 (mobile budget; desktop budget 150); ~300k tris; swarms instanced (palms 360 / cars ~150 / kiosks 28 / trucks 14 → 1 call each); zero per-frame allocations (temps preallocated)
- [✓] shadows verified by pixel test (drum shadow luminance 10 vs lit 104); shadow box follows player
- [✓] touch-only mobile viewport (390×844) playable: stick, look-drag, interact button, HUD fits
- [✓] keyboard uses event.code (non-Latin safe); gamepad mapped (sticks/A/RT/Y)
- [△] 60-fps target on real GPUs not measurable in this container (headless SwiftShader CPU rasterizer ≈ 1.6 fps regardless of scene cost) — cheap part done in full: draw calls 34/80, 300k tris, instancing law held; remainder recorded in external_review.md per §15

## Stage 5 gate — Publish & deliver (§6)
- [✓] zip packaged (root: logic.js, index.html, assets/, vendor/, modules)
- [✓] media_upload → PUT → media_confirm(file) → deploy_game with generated 16:9 thumbnail + 1:1 favicon
- [✓] play URL taken from deploy_game response (never hand-constructed)
- [✓] re-verified over the wire on the published URL
