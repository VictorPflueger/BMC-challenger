// The report at the end of a run (PLAN.md §8; the shaped brief of 0.4.0): the dialog that shows every page
// at size with the three downloads in its footer, and the downloads themselves. Save as PDF prints the
// report alone through Vici's report pattern (Vici.report.print), with the page's title set to the file's
// name while the print dialog is open, since browsers name a saved PDF after it; Ctrl+P where a report is
// on offer prints it too (Vici.report.prepare). The HTML file is Vici.report.html(): the report with the
// style rules that reach it, its pictures as data, no script and a policy that loads nothing. The JSON
// file is the handoff file (js/handoff.js), checked before the page offers it. Nothing is kept: each file
// exists only as the download. Adapted from the SWOT Challenger's js/report_view.js (31a2ac3).

import { t } from "./i18n/index.js";
import { h, icon } from "./dom.js";
import { IDEATOR_URL } from "./config.js";
import { reportNodes, fileName } from "./report.js";
import { handoffFor, handoffProblems } from "./handoff.js";

/** Margin boxes print the footer with page numbers in Chromium from version 131; elsewhere the fixed footer prints, without them. */
export function marginBoxes() {
  try { if (window.CSS && CSS.supports("at-rule(@bottom-left)")) return true; } catch { /* an older engine */ }
  const m = /Chrom(?:e|ium)\/(\d+)/.exec(navigator.userAgent || "");
  return !!m && Number(m[1]) >= 131;
}

/** A file the person downloads: a Blob behind a link that is clicked once and let go. */
function download(text, type, name) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h("a", { href: url, download: name, hidden: true });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Waits until every picture in the report has loaded, so the HTML file can carry it as data. */
function pictures(el) {
  return Promise.all([...el.querySelectorAll("img")].map((img) => (img.complete ? null : new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); }))));
}

/**
 * The report's controller. els: { dialog, title, body, tools }; context() returns the report's context
 * (js/report.js reportNodes takes it) or null where no report is on offer; announce(text) says a result to
 * screen readers; onSaved() is told when a file has left the page, so the warning before the tab closes can
 * stand down.
 */
export function createReportView({ dialog, title, body, tools, context, announce, onSaved = () => {} }) {
  let current = null;
  let undoPrint = null;
  let titleBefore = null;
  let viaButton = false;

  const day = () => current.ctx.created.toISOString().slice(0, 10);
  const nameOf = (ext) => fileName(current.ctx.sc.company.name, day(), current.ctx.lang, ext);

  /** Draws the report of the run as it stands into the dialog. Returns false where no report is on offer. */
  function build() {
    const ctx = context();
    if (!ctx) return false;
    const el = reportNodes({ ...ctx, level: 3, id: "report" });
    current = { ctx, el };
    title.textContent = t("rp.dialog.title", { company: ctx.sc.company.name });
    body.replaceChildren(el);
    tools.replaceChildren(...actions());
    return true;
  }

  function setTitle() {
    if (titleBefore === null) titleBefore = document.title;
    document.title = nameOf("");
  }
  function restoreTitle() {
    if (titleBefore !== null) document.title = titleBefore;
    titleBefore = null;
  }

  function pdf() {
    if (!current || !window.Vici?.report) return;
    viaButton = true;
    setTitle();
    window.Vici.report.print(current.el);
  }

  async function html() {
    if (!current || !window.Vici?.report) return;
    const { el } = current;
    await pictures(el);
    const name = nameOf("html");
    download(window.Vici.report.html(el, { title: el.querySelector(".vc-report__title")?.textContent || name }), "text/html", name);
    announce(t("rp.saved", { file: name }));
    onSaved();
  }

  function json() {
    if (!current) return;
    const c = current.ctx;
    const file = handoffFor({ sc: c.sc, run: c.run, lang: c.lang, mode: c.mode, model: c.live?.model ?? null, applied: c.applied, created: new Date(), stopText: c.notice || "" });
    const problems = handoffProblems(file);
    // A file that fails its check is not offered; the dialog says why, beside the button, in words.
    const error = document.getElementById("rp-error");
    if (problems.length) {
      const words = t("rp.json.failed", { problem: problems[0] });
      if (error) { error.textContent = words; error.hidden = false; }
      announce(words);
      return;
    }
    if (error) { error.textContent = ""; error.hidden = true; }
    const name = nameOf("json");
    download(`${JSON.stringify(file, null, 2)}\n`, "application/json", name);
    announce(t("rp.saved", { file: name }));
    onSaved();
  }

  // Ctrl+P where a report is on offer prints the report, as the button does.
  window.addEventListener("beforeprint", () => {
    if (viaButton || !window.Vici?.report || !build()) return;
    undoPrint = window.Vici.report.prepare(current.el);
    setTitle();
  });
  window.addEventListener("afterprint", () => {
    // The print dialog cannot say whether a file was saved; printing the report counts as keeping it.
    if (viaButton || undoPrint) onSaved();
    viaButton = false;
    if (undoPrint) { undoPrint(); undoPrint = null; }
    restoreTitle();
  });

  /** The dialog's footer: the hint and the way on to the Prototype Ideator, then the three downloads. */
  function actions() {
    const hint = [t("rp.pdf.hint"), marginBoxes() ? null : t("rp.pdf.numbers")].filter(Boolean).join(" ");
    return [
      h("div", { class: "report-tools__notes" },
        h("p", { class: "report-hint", id: "rp-pdf-hint" }, hint),
        h("p", { class: "report-error", id: "rp-error", role: "alert", hidden: true }),
        h("p", { class: "report-hint" }, h("a", { class: "report-ideator", id: "rp-ideator", href: IDEATOR_URL, target: "_blank", rel: "noopener" }, icon("sparkle"), t("rp.ideator"), h("span", { class: "vc-visually-hidden" }, t("rp.newTab"))))),
      h("div", { class: "report-actions" },
        h("button", { type: "button", class: "vc-button vc-button--secondary", id: "rp-html", "aria-describedby": "rp-html-hint", on: { click: html } }, icon("download"), t("rp.htmlFile")),
        h("button", { type: "button", class: "vc-button vc-button--secondary", id: "rp-json", "aria-describedby": "rp-json-hint", on: { click: json } }, icon("download"), t("rp.jsonFile")),
        h("button", { type: "button", class: "vc-button", id: "rp-pdf", "aria-describedby": "rp-pdf-hint", on: { click: pdf } }, icon("download"), t("rp.pdf")),
        // What the two files are, for a screen reader as well as for the eye in the button's own words.
        h("span", { class: "vc-visually-hidden", id: "rp-html-hint" }, t("rp.html.hint")),
        h("span", { class: "vc-visually-hidden", id: "rp-json-hint" }, t("rp.json.hint")))
    ];
  }

  /** Opens the dialog on the report of the run as it stands. */
  function open() {
    if (!build()) return;
    if (!dialog.open) dialog.showModal();
    body.scrollTop = 0;
    document.getElementById("rp-pdf")?.focus();
  }

  /** Draws the report again where the dialog shows it, after the language or the run changed. */
  function refresh() {
    if (dialog.open) build();
  }

  return { open, refresh, pdf, html, json, get current() { return current; } };
}
