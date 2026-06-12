/* Visual QC: teleports to key vistas and captures day + dusk screenshots. */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shots = path.join(root, "store", "shots");
mkdirSync(shots, { recursive: true });

const server = spawn("python3", ["-m", "http.server", "8124"], { cwd: path.join(root, "public"), stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  await page.goto("http://localhost:8124/?dev=1", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById("enter").click());
  await page.waitForTimeout(1000);

  const VISTAS = [
    ["spawn", -70, -228, -2.79, -0.03],
    ["spine-to-plaza", 0, 0, -2.30, -0.02],
    ["plaza", 92, 82, -1.10, 0.02],
    ["trucks", -85, -98, 0.05, 0.0],
    ["kiosks", 138, -128, -0.30, 0.0],
    ["play", -24, -32, -2.55, 0.0],
  ];
  for (const [name, x, z, yaw, pitch] of VISTAS) {
    await page.evaluate(([x, z, yaw, pitch]) => window.__park.teleport(x, z, yaw, pitch), [x, z, yaw, pitch]);
    await page.waitForTimeout(3800);
    await page.screenshot({ path: path.join(shots, `qc-${name}.png`) });
    console.log("shot", name);
  }
  await page.evaluate(() => window.__park.setDay(1));
  for (const [name, x, z, yaw, pitch] of [["plaza-dusk", 92, 82, -1.10, 0.02], ["spine-dusk", 0, 0, -2.30, -0.02]]) {
    await page.evaluate(([x, z, yaw, pitch]) => window.__park.teleport(x, z, yaw, pitch), [x, z, yaw, pitch]);
    await page.waitForTimeout(3800);
    await page.screenshot({ path: path.join(shots, `qc-${name}.png`) });
    console.log("shot", name);
  }
  console.log("info:", JSON.stringify(await page.evaluate(() => window.__park.info())));
} finally {
  await browser.close();
  server.kill();
}
