# Keturah Square Park — First-Person Web Experience · design/plan.md
Mode: **S** (jam-scale, §§1–5 merged into this file). Strictness recorded per §0.9.

## §1 Profile

| Axis | Choice |
|---|---|
| Time | real-time (continuous strolling, day/dusk lighting cycle toggle) |
| Space | continuous 3D — 1:1 walkable recreation of the Keturah Square Park masterplan (Al Safa, Dubai) |
| Player agency | one embodied first-person visitor |
| Conflict | none — curiosity, place-discovery and zone collection hold the player instead |
| Content | authored (the real site plan: 2 food-truck hubs, kiosk food hub fingers, kid's play zone, restaurant plaza, parking, perimeter roads) |
| Outcome | player sets own goals; optional completion = discover all 6 zones |
| Players | solo |
| Session | 5–15 minutes |
| Engagement source | **discovery** (primary), story-of-place (secondary) |

**Delivery context**
- Target platforms: desktop web + mobile web.
- Input methods: keyboard (physical key codes `KeyW/KeyA/KeyS/KeyD`, `ShiftLeft`, `KeyE`, `Space`) + pointer-lock mouse; touch (dual virtual sticks + tap-to-interact); gamepad (left stick move, right stick look, A interact, RT sprint) via Gamepad API.
- Languages: English; all player-visible strings external in `strings.js` data table from day one.
- Performance budgets (§7.5, weakest platform = mobile web): `draw_call_budget = 80`, `entity_count_estimate` = ~450 palms + ~120 shrubs clusters + ~40 kiosks + 14 food trucks + ~110 parked cars + 6 restaurant drums + 4 tensile canopies + ~60 light poles — all same-type swarms instanced (1 draw call per swarm). `worst_case_scene` = standing at the Kid's Play Zone centre at dusk, looking south-east across the restaurant plaza with both canopies, all drums, the palm field, the parking lot and both green fingers in frustum.

## §2 Laws
- **Patterns to learn:** (1) the three-finger salute geometry — the two green kiosk fingers + restaurant thumb radiate from the kid's-play palm centre, so navigation = reading the plan from inside; (2) zone discovery — walking into a zone's heart reveals its story plaque; (3) shade language — canopies/pergolas mark destinations.
- **Loops:** short (seconds) = walk/look/soak in vistas; medium (minutes) = reach a zone, trigger its discovery card; long (session) = collect all 6 zones → completion vista card.
- **Uncertainty sources (2):** *anticipation* (what does the next zone look like up close — carrier: zone discovery system) and *discovery* (finding viewpoints, the salute shape readable from the centre — carrier: free traversal + minimap).
- Horizon→source map: step = anticipation of next vista; minute = zone discovery; session = completing all six. No empty rows.

## §3 Concept
**Experience formula:** *The player feels like the first visitor let into a brand-new Dubai destination park at golden hour, because the game constantly rewards walking toward landmarks with new vistas, shade, ambient sound, and the story of each zone.*

Pillars: **Aesthetics is load-bearing** (faithful, high-fidelity recreation of the masterplan); Mechanics (frictionless first-person locomotion + discovery) serves it; Story (zone narratives from the concept deck) gives walking meaning; Technology (instanced WebGL, custom sky/lighting) makes the fidelity possible on phones. Each reinforces the others: locomotion exists to consume aesthetics; story is delivered at aesthetic peaks; tech budget shaped around vegetation/canopy fidelity.

Formal elements: Players=1 · Goals=discover 6 zones (game-suggested, optional) · Actions=walk, look, sprint, interact, toggle time-of-day · Rules=walkable surfaces bounded by site fence/roads · Resources=absent, because nothing is scarce — curiosity drives play instead · Conflict=absent, because the draw is place-discovery (meditative walking profile per §16) · Boundaries=one continuous open session · Outcome=optional 6/6 completion card.

Interest curve (session): spawn at the arrival drop-off facing the salute down the central axis (hook, 8/10) → first food-truck court (6) → kid's play centre with full panorama (7) → kiosk fingers promenade (6) → restaurant plaza under the great canopies at dusk (peak, 9) → completion card with aerial-style vista (10).

## §4 System
Verbs: **walk/look** (objects: paths, lawns, plazas — surface response: footstep audio differs on grass/paving/terracotta/sand; vista response: zones compose); **sprint** (stamina-free, FOV kick); **interact `KeyE`/tap/A** (objects: 6 zone markers → discovery card; gates: nothing else, so markers carry interactivity beacons); **toggle time `KeyT`** (objects: sky, sun, all materials, lamp emissives, firefly particles — whole-scene response). Walk/look is the strong verb (≥3 object types respond). Development: each discovered zone adds its label to the HUD minimap, so reading the salute from inside deepens.
Feedback loop: discovered zones light their minimap region (mild positive loop, no snowball risk — no failure state). Information map: all geometry open; zone stories hidden-until-visited, and the minimap's dimmed regions tell the player they exist and where (the "how the player learns" field).

## §5 Prototype question
*"Does first-person traversal of the full 1:1 site hold ≥60 fps on mid-range hardware within 80 draw calls with all vegetation/cars/kiosks instanced?"* — answered by the dev overlay (FPS + draw calls) on the worst-case scene before delivery; smoke numbers quoted in the final reply. Contrast/comeback criteria apply in their meditative-walking form (§16): the reference route visits all 6 zones; the contrast route (never entering zone hearts) ends with 0/6 — outcomes discernibly differ; no dead ends (open plane, fence-bounded).
