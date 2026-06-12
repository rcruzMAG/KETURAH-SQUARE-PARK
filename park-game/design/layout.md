# design/layout.md — site geometry contract (derived from the user's aerial site plan + markup)

Coordinate system: meters. +X = east, +Z = south, origin at the Kid's Play Zone heart.
Mapping from the aerial image (1331×706 px): the park parcel spans px ≈ (430,115)–(940,665),
treated as 1 px ≈ 1 m → site ≈ 510 m (E–W) × 550 m... clipped to the visible parcel ≈ 510×550.
World transform: world.x = px.x − 615, world.z = px.y − 410.

| Element | Aerial px anchor | World (x,z) m | Notes |
|---|---|---|---|
| Site fence rectangle | (430,115)–(940,665) | (−185,−295)–(325,255) | rounded corners; perimeter lawn + palm buffer inside |
| Arrival bar (white facility/pergola) | (480–610, 138–166) | (−135..−5, −272..−244) | long white bar, NW corner |
| Food-truck loop NORTH | centre (530,285), island (495–575, 215–360) | centre (−85,−125) | elongated parking loop, angled bays both sides; truck court on island; 7 trucks |
| Food-truck loop SOUTH | centre (520,550), island (480–570, 470–635) | centre (−95,140) | same language; 7 trucks |
| Kid's Play Zone | heart (615,410) | (0,0) | sand field ≈ r 55 m; ring play structures at (15,30),(30,45),(38,18),(8,52); 2 shade sails (−25,−10),(−40,55) |
| Green finger A (north) | ellipse (680,180)–(845,320) | centre (147,−160), len 220, w 62, bearing ≈ 42° (NE) | pale agri-grid lawn, ring path, 2 rows × 7 kiosks |
| Green finger B (south) | ellipse (700,265)–(890,400) | centre (180,−78), len 230, w 62, bearing ≈ 40° | 2 rows × 7 kiosks |
| Restaurant plaza (thumb) | blob (620–885, 420–645) | centre (135,120), r≈115 teardrop SW–NE | terracotta paving; palm dots in grates |
| Restaurant drums ×6 | (672,520)(780,462)(826,520)(712,578)(822,580)(756,610) | (57,110)(165,52)(211,110)(97,168)(207,170)(141,200) | circular corten drums r 9–12 m, h 7 m, roof terrace |
| Tensile canopies ×2 | (737,492)(768,556) | (122,82)(153,146) | white pyramid, 38 m square, apex 16 m, 4 masts |
| SE parking | (745–905, 575–655) | (130..290, 165..245) | rows of stalls + access from S road |
| Promenade spine | from arrival (−70,−240) → play heart (0,0) → plaza (135,120) | | 8 m granite paving, the central axis |
| Ring/secondary paths | around fingers, loops, plaza edge | | 4 m paving |
| Perimeter roads | N (z=−295 outside), E (x=325), S (z=255), W (x=−185) | | asphalt + sidewalks; highway berm far north |
| Context blocks | outside fence | | low villas W/E/S, highway + interchange N — silhouette fidelity only |

Zone discovery markers (6): arrival (−70,−235) · food-truck hub N (−85,−125) · food-truck hub S (−95,140) ·
kid's play (0,0) · kiosk food hub (between fingers, 160,−115) · restaurant plaza (135,118).
Spawn: (−70,−238) facing SE down the promenade spine (the §3 hook vista).
