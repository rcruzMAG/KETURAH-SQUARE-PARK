# STYLE FORMULA (approved-by-brief: derived from the user's photoreal site-plan renders; references/stylization.md §2, §8)

STYLE FORMULA (byte-identical in every asset generation, procedural generators included):

Photoreal contemporary landscape-architecture render style with crisp physically-lit surfaces and a subtle warm film grade; clean geometric silhouettes — circular drum pavilions, taut white tensile canopies, slender date palms; environment in sun-bleached lawn greens, warm terracotta plaza ochres and pale granite paving, architecture in warm white and corten bronze, interactive markers in luminous amber; golden Dubai light, long soft shadows, dusty desert haze, serene premium mood; high contrast between landmarks and ground plane, clean readable silhouettes, consistent eye-level three-quarter realism across all assets.

STYLE TOKEN (≤120 chars, frozen):

photoreal Dubai park, terracotta + sun-bleached green palette, warm white canopies, golden haze, amber accents

## Engine-lighting derivation (stylization.md §8 — lighting/fog/ambient from blocks 3–4)
- Day: sun #FFE3B8 warm-white directional, low-saturation sky #BFD7E8→#E8DCC8 horizon, fog #E5D9C3, hemisphere ambient ground-bounce #C9B89A.
- Dusk: sun #FF9E5E near horizon, sky #2E3C5C→#F2A65A, fog #C98A5E, lamp emissives #FFD9A0, amber markers brighten.
- Geometry clause for procedural 3D: smooth clean-edged contemporary forms, no faceted low-poly look at silhouette scale; instancing-friendly merged geometry.
