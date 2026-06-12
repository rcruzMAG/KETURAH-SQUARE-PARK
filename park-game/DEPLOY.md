# Deployment record

- **Play URL:** https://sandy-house-574.higgsfield.gg/  (from the deploy_game response — source of truth)
- **game_id:** `51c7b0be-100b-4068-a2ba-8cf0f191bc90` — pass this back to `deploy_game` to update the game in place (keeps the URL). Never omit it when updating.
- Source zip layout: `logic.js` + `index.html` + modules + `assets/` + `vendor/` at archive root (see tools/ for the smoke/QC harness).
- Store images: `store/thumbnail.png` (16:9), `store/favicon.png` (1:1) — generated, CDN URLs in deploy.
- Re-deploy: `cp -r design public/design && (cd public && zip -qr /tmp/keturah-square-park.zip .) && rm -rf public/design`, upload via media_upload → media_confirm(file) → deploy_game with game_id.

## Smoke (this container, headless SwiftShader CPU rasterizer)
- Reference route end-to-end (v2 layout): zones 6/6, no 404s, no page errors.
- Draw calls max **36** (budget 80 mobile / 150 desktop), ~300k triangles.
- FPS in container ≈1.6 (software rasterizer measures CPU, not the scene) — real-GPU
  confirmation tracked in design/external_review.md. Dev overlay: append `?dev=1`.
- Reference-route executor: append `?route=ref&dev=1`.
