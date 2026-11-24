// Shared test harness: finds Playwright and serves the tool's folder over HTTP. The tool loads nothing
// from a third party and reaches only api.anthropic.com, so every outside request in a test is either
// answered by a scripted stand-in or blocked. Adapted from the Sovereignty Assessment's harness.
import { createRequire } from "node:module";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

/** The tool's folder: the parent of tests/. */
export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8"
};

/** Where screenshots and result files go: outside the tool's folder unless BMC_TEST_OUT says otherwise. */
export async function outDir(suite) {
  const dir = path.join(process.env.BMC_TEST_OUT || path.join(os.tmpdir(), "bmc-challenger-tests"), suite);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Playwright is not part of the tool. Install it once, globally or in any folder:
 *   npm install -g playwright && npx playwright install chromium
 * and run with NODE_PATH="$(npm root -g)", or point PLAYWRIGHT_MODULE at its folder.
 */
export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [process.env.PLAYWRIGHT_MODULE, "playwright", "playwright-core"].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch { /* try the next one */ }
  }
  console.error("Playwright was not found. Install it with `npm install -g playwright` and `npx playwright install chromium`,\nthen run the tests with NODE_PATH=\"$(npm root -g)\" (or set PLAYWRIGHT_MODULE to the playwright folder).");
  process.exit(2);
}

/** Chromium from Playwright, or the browser at CHROME_PATH. */
export async function launchBrowser() {
  const { chromium } = loadPlaywright();
  return chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
}

/** Serves `root` on 127.0.0.1 at `port`. Returns { base, close }. */
export async function serveStatic(root, port) {
  const server = http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(root, path.normalize(p));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404); res.end("not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { base: `http://127.0.0.1:${port}/`, close: () => new Promise((r) => server.close(r)) };
}

/** A free port for one suite: each suite picks from its own range so suites never collide. */
export function port(base) {
  return base + Math.floor(Math.random() * 200);
}

/**
 * A browser context for the tool: the given viewport, language and colour scheme, every request that
 * leaves 127.0.0.1 blocked and recorded. Returns { context, outside }.
 */
export async function context(browser, { width = 1280, height = 720, locale = "en-GB", colorScheme = "light", hasTouch = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, hasTouch });
  const outside = [];
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => { outside.push(route.request().url()); return route.abort("blockedbyclient"); });
  return { context: ctx, outside };
}

/**
 * Ends a suite once everything it printed has left: process.exit() right after console.log can cut the
 * last lines, its success token among them, when stdout is a pipe that is read slowly.
 */
export function exit(code) {
  process.stdout.write("", () => process.exit(code));
}

/** Console noise that blocked outside requests cause. */
export const NETWORK_NOISE = /Failed to load resource|net::ERR_|ERR_BLOCKED_BY_CLIENT|ERR_FAILED/;

/** Arguments after the script: names of parts to run (tests/hexagon.mjs files). */
export const ONLY = process.argv.slice(2).filter((a) => !a.startsWith("--"));
export const wanted = (name) => ONLY.length === 0 || ONLY.includes(name);

/** The tool's browser storage keys (js/config.js STORAGE). */
export const KEYS = { lang: "bmc.lang" };

/** Suites that need ViciDesign fail without it on GitHub Actions or with --require-vici; else they skip. */
export const REQUIRE_VICI = process.argv.includes("--require-vici") || process.env.GITHUB_ACTIONS === "true";

/** A ViciDesign checkout: the folder in VICI_DIR, or ../ViciDesign next to this repository. */
export function viciDir() {
  return [process.env.VICI_DIR, path.resolve(APP_ROOT, "..", "ViciDesign")].filter(Boolean).find((d) => existsSync(path.join(d, "scripts", "lib", "guide.mjs"))) || null;
}
