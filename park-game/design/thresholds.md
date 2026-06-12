# thresholds.md — fixed before implementation (§0.8)

- Target frame rate: **≥ 60 fps** on mid-range desktop; ≥ 30 fps floor on mobile. Smoke red line: average FPS on the reference route < 45 = red build.
- `draw_call_budget`: **80** (mobile-web budget; weakest declared platform).
- `worst_case_scene`: Kid's Play Zone centre at dusk, looking SE across restaurant plaza — all canopies, drums, palm swarm, parking, both green fingers in frustum.
- pixelRatio cap: 1.5. Shadow map ≤ 1024². Draw distance: fog.far + margin (no geometry beyond site + road ring + skyline blocks).
- Zero allocations in the frame loop (vectors pre-allocated).
- Launch → first meaningful action: ≤ 2 steps (load screen → click/tap "Enter the park" → walking). 
- Interaction: zone marker trigger radius 9 m; interact prompt visible ≤ 100 ms after entering radius; every input action acknowledges within ≤ 100 ms.
- Movement: walk 3.2 m/s, sprint 6.0 m/s, eye height 1.7 m; look sensitivity remappable; axes not inverted by default.
- Discovery contrast threshold: reference route = 6/6 zones, contrast route = 0/6 (must differ).
