/* Boot for the WebGL layer. Feature-detects WebGL and respects
   prefers-reduced-motion; when unavailable the page keeps its DOM/CSS
   fallbacks (static hero image, CSS palm sway, DOM fireflies, plan photo). */

import { initHero } from "./hero-gl.js";

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reducedMotion && webglAvailable()) {
  document.body.classList.add("gl-on");
  try {
    initHero();
  } catch (err) {
    // fall back to the DOM presentation rather than a broken page
    document.body.classList.remove("gl-on");
    console.error("WebGL layer failed, using static fallback:", err);
  }
}
