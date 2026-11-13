// Renders a list of still frames of DomsShort in ONE bundle / browser session (fast QA).  node herramientas/stills_doms.mjs out/doms/qa 45,120,... [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const outDir = process.argv[2] ?? "out/doms/qa";
const frames = (process.argv[3] ?? "45").split(",").map(Number);
const scale = Number(process.argv[4] ?? 0.5);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), webpackOverride: (c) => c });
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle", enableMultiProcessOnLinux: true }, chromeMode: "headless-shell" });
const comp = await selectComposition({ serveUrl, id: "DomsShort", puppeteerInstance: browser });
for (const f of frames) {
  const output = path.join(outDir, `f${String(f).padStart(4, "0")}.jpg`);
  await renderStill({ composition: comp, serveUrl, output, frame: f, imageFormat: "jpeg", jpegQuality: 88, scale, puppeteerInstance: browser, chromiumOptions: { gl: "angle" }, timeoutInMilliseconds: 180000 });
  console.log("ok", output);
}
await browser.close({ silent: true });
