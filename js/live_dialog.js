// The live-run dialog (brief 5.3, PLAN.md §10, Vici's .vc-live): the key, held in js/keystore.js and
// shown masked once held; the setting, each naming its model and effort; research with what it adds;
// the budget cap; the acknowledgement, unticked at every opening; what is usually private in the
// person's input, listed without blocking; the estimate for the canvas entered; and "Start the live
// run", disabled until the key looks right and the box is ticked. The key is checked with the free
// GET /v1/models first, which also confirms the setting's model is available. The dialog refuses to
// work inside a frame.

import { t, tn, getLang } from "./i18n/index.js";
import { getKey, setKey, hasKey, forgetKey, looksLikeKey, maskKey } from "./keystore.js";
import { checkKey, ApiError } from "./anthropic.js";
import { presetById, modelById, DEFAULT_PRESET, BUDGET, ANTHROPIC } from "./config.js";
import { scanInputs } from "./privacy.js";
import { causeOf } from "./api_messages.js";
import { fmtCents } from "./format.js";
import { h, icon } from "./dom.js";

const $ = (id) => document.getElementById(id);

/** True when the page runs inside another page, where a key must never be typed. */
function framed() {
  try { return window.top !== window.self; } catch { return true; }
}

/**
 * Wires the dialog. estimate(presetId, research) → { eur, seconds }; fields() → [{ where, text }];
 * onStart({ preset, research, capEur, lang }) starts the run. Returns { open }.
 */
export function setupLiveDialog({ estimate, fields, onStart }) {
  const d = $("live-dialog");
  const key = $("live-key");
  const show = $("live-key-show");
  const ack = $("live-ack");
  const start = $("live-start");
  const cap = $("live-cap");
  const research = $("live-research");
  const error = $("live-error");
  const presets = [...d.querySelectorAll('input[name="live-preset"]')];
  const preset = () => presets.find((r) => r.checked)?.value || DEFAULT_PRESET;
  let checking = false;

  function drawKey() {
    const held = hasKey();
    $("live-key-row").hidden = held;
    $("live-key-held").hidden = !held;
    $("live-key-masked").textContent = held ? maskKey() : "";
  }
  function drawEstimate() {
    const lang = getLang();
    const p = presetById(preset());
    const m = modelById(p.model);
    $("live-preset-help").textContent = t(`live.preset.${p.id}.help`, { model: m.label }, lang);
    // What research adds: the searches and what the Scout reads, the difference of two estimates.
    const e = estimate(p.id, research.checked);
    const extra = estimate(p.id, true).eur - estimate(p.id, false).eur;
    $("live-research-help").textContent = t("live.research.help", { n: ANTHROPIC.webSearchTool.max_uses, cost: fmtCents(extra, lang) }, lang);
    const minutes = Math.max(1, Math.round(e.seconds / 60));
    $("live-estimate").replaceChildren(
      t("live.estimate.lead", null, lang), " ", h("strong", {}, `≈ ${fmtCents(e.eur, lang)}`), " ", tn("live.estimate.time", minutes, {}, lang), " ",
      t("live.estimate.lang", { lang: t(`lang.${lang}`, null, lang) }, lang));
  }
  function drawWarning() {
    const found = scanInputs(fields());
    $("live-warning").hidden = !found.length;
    $("live-warning-list").replaceChildren(...found.slice(0, 6).map((f) => h("li", {}, t(`live.private.${f.kind}`, { sample: f.sample, where: f.where }, getLang()))));
  }
  function ready() {
    const ok = !framed() && !checking && (hasKey() || looksLikeKey(key.value)) && ack.checked;
    start.disabled = !ok;
  }
  function say(text) {
    error.hidden = !text;
    error.replaceChildren(...(text ? [icon("error"), h("span", {}, text)] : []));
  }

  show.addEventListener("click", () => {
    const reveal = key.type === "password";
    key.type = reveal ? "text" : "password";
    show.setAttribute("aria-pressed", String(reveal));
    show.setAttribute("aria-label", t(reveal ? "live.key.hide" : "live.key.show"));
  });
  // A pasted value that can't be a Claude key says so, rather than leaving the start button dimmed.
  key.addEventListener("input", () => { const v = key.value.trim(); say(v.length >= 12 && !looksLikeKey(v) ? t("live.key.shape") : ""); ready(); });
  key.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (!start.disabled) start.click(); } });
  ack.addEventListener("change", ready);
  for (const r of presets) r.addEventListener("change", drawEstimate);
  research.addEventListener("change", drawEstimate);
  $("live-forget").addEventListener("click", () => { forgetKey(); key.value = ""; drawKey(); ready(); key.focus(); });

  start.addEventListener("click", async () => {
    if (start.disabled) return;
    if (!hasKey()) setKey(key.value);
    key.value = "";
    key.type = "password";
    drawKey();
    checking = true;
    ready();
    const label = start.textContent;
    start.textContent = t("live.checking");
    say("");
    const p = presetById(preset());
    const res = await checkKey(getKey());
    checking = false;
    start.textContent = label;
    if (!res.ok) {
      const err = new ApiError({ status: res.status, type: res.error?.type || "network_error", message: res.error?.message || "" });
      const refused = ["key", "permission", "cors"].includes(causeOf(err));
      if (refused) { forgetKey(); drawKey(); }
      say(t(`err.${causeOf(err)}`, { detail: "" }));
      ready();
      (refused ? key : start).focus(); // a refused key is asked for again
      return;
    }
    if (res.missing?.includes(p.model)) { say(t("err.model", { detail: "" })); ready(); start.focus(); return; }
    d.close("start");
    onStart({ preset: p.id, research: research.checked, capEur: Math.min(BUDGET.maxEur, Math.max(BUDGET.minEur, Number(cap.value) || BUDGET.defaultEur)), lang: getLang() });
  });

  return {
    open() {
      ack.checked = false;
      key.value = "";
      key.type = "password";
      show.setAttribute("aria-pressed", "false");
      $("live-frame").hidden = !framed();
      say("");
      drawKey();
      drawWarning();
      drawEstimate();
      ready();
      d.showModal();
      (hasKey() ? ack : key).focus();
    },
    refresh() { if (d.open) { drawEstimate(); drawWarning(); } }
  };
}
