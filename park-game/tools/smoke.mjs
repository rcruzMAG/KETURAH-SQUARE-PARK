/* Smoke run (design/thresholds.md): serves public/, drives the reference route
   in headless Chromium (SwiftShader WebGL), captures FPS/draw-call numbers and
   screenshots. Run: NODE_PATH=/tmp/node_modules PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/smoke.mjs */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const shots = path.join(root, "store", "shots");
mkdirSync(shots, { recursive: true });

const server = spawn("python3", ["-m", "http.server", "8123"], { cwd: pub, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
try {
  const page = await browser.newPage({ viewport: { width: 480, height: 300 } });
  const logs = [];
  page.on("console", (m) => { logs.push(m.text()); if (m.text().includes("[smoke]") || m.type() === "error") console.log("PAGE:", m.text()); });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  const fail404 = [];
  page.on("response", (r) => { if (r.status() >= 400) fail404.push(r.url()); });

  await page.goto("http://localhost:8123/?route=ref&dev=1", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(shots, "01-spawn.png") });

  let done = false;
  for (let i = 0; i < 160; i++) {
    await page.waitForTimeout(2000);
    if (i === 8) await page.screenshot({ path: path.join(shots, "02-mid.png") });
    if (i === 14) { // toggle dusk mid-route for the dusk QC shot (programmatic — pointer lock owns the cursor)
      await page.evaluate(() => document.getElementById("btnTime").click());
      await page.waitForTimeout(3500);
      await page.screenshot({ path: path.join(shots, "03-dusk.png") });
      await page.evaluate(() => document.getElementById("btnTime").click());
    }
    const dev = await page.textContent("#dev");
    if (dev && dev.includes("avgFPS")) { console.log("SMOKE RESULT:", dev); done = true; break; }
  }
  await page.screenshot({ path: path.join(shots, "04-end.png") });
  console.log("done:", done, "| 404s:", fail404.length ? fail404 : "none");
  await page.close();

  // plain load (intro screen) QC
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await p2.goto("http://localhost:8123/", { waitUntil: "load" });
  await p2.waitForTimeout(1500);
  await p2.screenshot({ path: path.join(shots, "00-intro.png") });
  await p2.close();

  // mobile viewport, touch-only sanity
  const p3 = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await p3.goto("http://localhost:8123/", { waitUntil: "load" });
  await p3.waitForTimeout(1200);
  await p3.tap("#enter");
  await p3.waitForTimeout(2500);
  await p3.screenshot({ path: path.join(shots, "05-mobile.png") });
} finally {
  await browser.close();
  server.kill();
}
