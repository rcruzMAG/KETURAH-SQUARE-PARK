/* Visual QC v2: teleports to key vistas, captures day + dusk + top-down. */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shots = path.join(root, "store", "shots");
mkdirSync(shots, { recursive: true });
const server = spawn("python3", ["-m", "http.server", "8124"], { cwd: path.join(root, "public"), stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  await page.goto("http://localhost:8124/?dev=1", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById("enter").click());
  await page.waitForTimeout(1000);
  const VISTAS = [
    ["spawn", -82, -232, -2.76, -0.02],
    ["heart-to-plaza", 0, 0, -2.43, -0.02],
    ["plaza", 52, 76, -2.4, 0.02],
    ["drums", 130, 110, -2.0, 0.04],
    ["trucks", -96, -40, 0.0, 0.0],
    ["kiosks", 120, -75, 0.59, 0.0],
    ["play", -30, 28, 2.49, 0.0],
  ];
  for (const [name, x, z, yaw, pitch] of VISTAS) {
    await page.evaluate(([x, z, yaw, pitch]) => window.__park.teleport(x, z, yaw, pitch), [x, z, yaw, pitch]);
    await page.waitForTimeout(3600);
    await page.screenshot({ path: path.join(shots, `qc-${name}.png`) });
    console.log("shot", name);
  }
  await page.evaluate(() => window.__park.setDay(1));
  for (const [name, x, z, yaw, pitch] of [["plaza-dusk", 52, 76, -2.4, 0.02], ["spine-dusk", 0, 0, -2.43, -0.02]]) {
    await page.evaluate(([x, z, yaw, pitch]) => window.__park.teleport(x, z, yaw, pitch), [x, z, yaw, pitch]);
    await page.waitForTimeout(3600);
    await page.screenshot({ path: path.join(shots, `qc-${name}.png`) });
    console.log("shot", name);
  }
  await page.evaluate(() => window.__park.setDay(0));
  const data = await page.evaluate(() => {
    const { scene, renderer, THREE } = window.__park;
    const cam = new THREE.OrthographicCamera(-330, 330, 330, -330, 1, 1200);
    cam.position.set(52, 600, 0);
    cam.up.set(0, 0, -1);
    cam.lookAt(52, 0, 0);
    renderer.render(scene, cam);
    return renderer.domElement.toDataURL("image/png");
  });
  writeFileSync(path.join(shots, "qc-topdown.png"), Buffer.from(data.split(",")[1], "base64"));
  console.log("info:", JSON.stringify(await page.evaluate(() => window.__park.info())));
} finally {
  await browser.close();
  server.kill();
}
