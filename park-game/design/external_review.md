# external_review.md — questions code cannot close (§15)

1. **Real-GPU frame rate.** The container's only renderer is SwiftShader (CPU); FPS numbers
   from it (≈1.6) measure the rasterizer, not the scene. Cheap part done: draw calls 34
   (budget 80), ~300k triangles, every >50-entity swarm is one instanced draw call, zero
   per-frame allocations, pixelRatio ≤1.5, shadow map ≤1024². Please confirm on a real
   device: dev overlay at `?dev=1` should read ≥60 fps on a mid-range desktop GPU and
   ≥30 fps on a recent phone. Global knobs if needed: shadow map size and palm count in
   world.js.
2. **Fun / mood.** §5.2 criteria hold in their meditative-walking form (route contrast 6/6
   vs 0/6; ≥2 alternative routes — the path network is a graph; no dead ends). Whether the
   golden-hour mood lands is a human judgement: which vista made you stop walking? Which
   zone did you want to retell?
3. **Perceptual quality.** Screenshots attached under store/shots/ (day vistas, dusk,
   top-down vs the real masterplan). All perceptual parameters are data (style.md-derived
   constants in world.js DAY/DUSK tables) — corrections are one-line edits.
4. **Audio mix on speakers/headphones.** Mix targets per audio.md (music −19 dBFS bed,
   ambience −12, steps −10/−12, compressor ceiling) — confirm the loop point of the
   40 s music bed is unobtrusive.
