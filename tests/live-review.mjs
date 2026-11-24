// AC-18 in Chromium against the stand-in: the Completer never changes or removes an item the person
// entered (after Complete every entered item keeps its id and text); every AI item shows "AI", and its
// block's dialog shows its basis and confidence; before the challenge the person keeps, edits or removes
// each AI item, and the Red team's request carries the edited text and none of the removed items. An
// edited item says so. Prints LIVE REVIEW OK. Usage: node tests/live-review.mjs
import { APP_ROOT, launchBrowser, serveStatic, port, context, exit } from "./lib/harness.mjs";
import { install, live } from "./lib/standin.mjs";
import EN from "../js/i18n/en.js";

const results = [];
const check = (ok, what, detail = "") => results.push({ ok: !!ok, what, detail });
const server = await serveStatic(APP_ROOT, port(9215));
const browser = await launchBrowser();
const rows = (p, source) => p.$$eval(`#canvas .vc-item[data-source="${source}"]`, (els) => els.map((el) => ({ id: el.dataset.item, text: el.querySelector(".vc-item__text").textContent.trim(), tags: [...el.querySelectorAll(".vc-item__state")].map((s) => s.textContent.trim()) })));
const EDITED = "Sales offices in the port cities of northern Europe";

try {
  const { context: ctx } = await context(browser, { width: 1920, height: 1080 });
  const api = await install(ctx);
  const p = await ctx.newPage();
  await p.goto(`${server.base}?guide=0`);
  await p.waitForSelector('html[data-boot="ready"]');
  await live.enter(p);
  await live.sample(p);
  const before = await rows(p, "entered");
  await live.openDialog(p);
  await live.start(p);
  await live.waitFor(p, "review");

  // ---- the person's items stay as they are ----------------------------------------------------------------
  const after = await rows(p, "entered");
  const sent = JSON.parse(api.calls[0].body.messages[0].content).canvas;
  check(before.length > 0 && JSON.stringify(after.map(({ id, text }) => ({ id, text }))) === JSON.stringify(before.map(({ id, text }) => ({ id, text }))),
    `after Complete every one of the ${before.length} items entered keeps its id and its text`, JSON.stringify({ before: before.length, after: after.length }));
  check(Object.values(sent).flat().every((it) => it.by === "team") && Object.values(sent).flat().length === before.length, "the Completer reads the entered items only");

  // ---- every AI item says AI, with basis and confidence ---------------------------------------------------
  const ai = await rows(p, "ai");
  check(ai.length === api.defaults.completer.items.length && ai.every((r) => r.tags.includes(EN["item.ai"])), `every one of the ${ai.length} AI items carries "${EN["item.ai"]}"`, JSON.stringify(ai.slice(0, 3)));
  const blocks = [...new Set(ai.map((r) => r.id.replace(/-\d+$/, "")))];
  const missing = [];
  for (const b of blocks) {
    await p.click(`#canvas [data-block="${b}"] .block-open`);
    await p.waitForSelector("#block-dialog[open]");
    const notes = await p.$$eval('#block-dialog .vc-item[data-source="ai"]', (els) => els.map((el) => el.querySelector(".vc-item__body")?.textContent || ""));
    for (const n of notes) if (!n.includes(EN["item.basis"]) || !["high", "medium", "low"].some((c) => n.includes(EN[`conf.${c}`]))) missing.push(`${b}: ${n.slice(0, 60)}`);
    await p.keyboard.press("Escape");
  }
  check(!missing.length, "each AI item's dialog shows its basis and its confidence", missing.slice(0, 3).join("; "));

  // ---- keep, edit, remove ---------------------------------------------------------------------------------
  await p.click('#canvas [data-item="partners-2"] .item-toggle');
  await p.click('#canvas [data-block="channels"] .block-open');
  await p.waitForSelector("#edit-channels-1");
  await p.fill("#edit-channels-1", EDITED);
  await p.press("#edit-channels-1", "Tab");
  await p.keyboard.press("Escape");
  const edited = (await rows(p, "ai")).find((r) => r.id === "channels-1");
  check(edited?.text === EDITED && edited.tags.includes(EN["item.aiEdited"]), `an edited AI item shows the new text and "${EN["item.aiEdited"]}"`, JSON.stringify(edited));
  await p.click("#btn-cta");
  await p.waitForFunction(() => window.BMC.state.live.reached >= 2, null, { timeout: 15000 });
  const red = JSON.parse(api.calls.find((c) => c.agent === "redteam").body.messages[0].content).canvas;
  const ids = Object.values(red).flat().map((it) => it.id);
  check(!ids.includes("partners-2") && ids.includes("partners-1") && ids.includes("partners-3"), "the Red team's request leaves out the removed item and keeps the others", JSON.stringify(red.partners));
  check(red.channels.find((it) => it.id === "channels-1")?.text === EDITED, "the Red team's request carries the edited text", JSON.stringify(red.channels));
  await ctx.close();
} finally {
  await browser.close();
  await server.close();
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} review checks passed`);
if (!failed) console.log("LIVE REVIEW OK");
exit(failed ? 1 : 0);
