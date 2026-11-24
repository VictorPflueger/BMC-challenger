// The report (brief 9 and 9.1; PLAN.md §8; AC-13, AC-20): the run as a document, assembled by code from the
// run's state on Vici's report pattern (components/report.html). Eight pages, each opening a new sheet: the
// cover; the management summary on page two, with the key figures as the tiles show them; the canvas as the
// team entered it and the Completer completed it, with the blocks under pressure marked; the issues, one
// block each; the risk matrix with its table; the responses, the chosen ones in full; the canvas after the
// decision; and method, assumptions and sources, ending with About this report and the byline. The model
// writes no layout and no figure: the Writer's text comes with its {{fact:key}} placeholders filled from the
// engine, every other figure is the engine's or an agent's estimate marked as one, in the report's own
// language (a scenario's follows the page, a live run's its own). A run stopped early says so on every
// page. The footer's words live on the report's root, where Vici's script puts them in the margin boxes of
// every printed page. Nothing here is a control: the report holds no button, field or script.

import { t, tn } from "./i18n/index.js";
import { h, icon } from "./dom.js";
import { APP, AUTHOR, CREDIT, KNOWLEDGE_CUTOFF, modelById, presetById } from "./config.js";
import { BLOCKS } from "./canvas.js";
import { STEP } from "./run.js";
import { band, riskScore } from "./risk.js";
import { fmtMoney, fmtRange, fmtChange, fmtBaseline, fmtDate, fmtPressure, fmtInt, factTexts } from "./format.js";
import { renderFacts } from "./facts.js";
import { sizeOf, effectWords, changeLine } from "./view.js";
import { sourcesOf } from "./handoff.js";
import { kpiById, SECTORS } from "../data/kpis.js";
import { GENERAL_KNOWLEDGE } from "./guards.js";

const STEP_KEYS = ["p.step.start", "p.step.complete", "p.step.challenge", "p.step.assess", "p.step.adapt", "p.step.summary"];
const SETTING = { fast: "rp.setting.fast", balanced: "rp.setting.balanced", thorough: "rp.setting.thorough" };
const RANK = ["low", "medium", "high", "critical"];
const isoDay = (d) => d.toISOString().slice(0, 10);

/** What a stopped run's report says on every page: where it stopped. Empty for a run that finished. */
export function stopNotice(live, lang) {
  if (!live?.stopped) return "";
  const step = t(STEP_KEYS[live.reached] || STEP_KEYS[0], null, lang);
  return t(live.stopped.cause === "cap" ? "rp.notice.cap" : "rp.notice", { step }, lang);
}

/** bmc-challenger-<company>-<YYYY-MM-DD>-<lang>.<ext>, umlauts written out (ä as ae, ß as ss). */
export function fileName(company, day, lang, ext) {
  const map = { ä: "ae", ö: "oe", ü: "ue", ß: "ss", Ä: "ae", Ö: "oe", Ü: "ue" };
  const slug = String(company || "").replace(/[äöüßÄÖÜ]/g, (c) => map[c]).normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/, "") || "company";
  return `bmc-challenger-${slug}-${day}-${lang}${ext ? `.${ext}` : ""}`;
}

/**
 * The report's nodes. ctx: { sc (the scenario, or the live run in its shape), run (js/run.js buildRun),
 * lang, mode ("simulation" | "live"), applied (the decision is applied), tiles (js/story.js tileWords in
 * the report's language), created (a Date), removed (how many AI items the person removed of how many),
 * live (a live run's { model, preset, research, capEur, reached, stopped, researchState, unchecked }) or
 * null, level (the title's heading level: 3 inside the page's dialog), id (a prefix for ids) }.
 */
export function reportNodes(ctx) {
  const { sc, run, lang, mode, applied } = ctx;
  const live = ctx.live || null;
  const id = ctx.id || "report";
  const level = ctx.level || 3;
  const tr = (key, vars = null) => t(key, vars, lang);
  const H = (n, attrs, ...children) => h(`h${Math.min(6, level + n)}`, attrs, ...children);
  const page = (key, ...children) => h("section", { class: ["vc-report__page", "report-page", `report-page--${key}`], "aria-labelledby": `${id}-${key}` }, H(1, { id: `${id}-${key}` }, tr(`rp.${key}.h`)), ...children);
  const note = (words) => h("p", { class: "report-note" }, words);
  const aiTag = (words = tr("p.estimate")) => h("span", { class: "vc-tag vc-tag--sm vc-tag--feature report-ai" }, icon("sparkle"), words);
  const reached = live ? live.reached : STEP.summary;
  const stopped = !!live?.stopped;
  const notRun = (step) => note(tr("rp.notRun", { step: tr(STEP_KEYS[step]) }));
  const facts = factTexts(run.after, lang);
  const fill = (text) => renderFacts(text, facts);
  const s = sc.answers.summary;
  const blockName = (b) => tr(`block.${b}.name`);
  const textOf = new Map(Object.values(run.completed.blocks).flat().map((it) => [it.id, it.text]));
  const no = (issue) => h("span", { class: "report-no", "aria-hidden": "true" }, issue.id.slice(1));

  // ---- 1 cover ----------------------------------------------------------------------------------------
  const sector = SECTORS.find((x) => x.id === sc.company.sector)?.name?.[lang];
  const country = /^[A-Z]{2}$/.test(sc.company.country || "") && mode !== "live" ? tr(`country.${sc.company.country}`) : sc.company.country;
  const preset = live ? presetById(live.preset) : presetById("balanced");
  const model = modelById(preset.model)?.label || preset.model;
  const setting = live
    ? tr("rp.model.live", { model, setting: tr(SETTING[preset.id]), research: tr(live.research ? "rp.research.on" : "rp.research.off"), cap: new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }).format(live.capEur) })
    : tr("rp.model.sim", { model, setting: tr(SETTING[preset.id]) });
  const meta = [
    [tr("rp.meta.date"), fmtDate(isoDay(ctx.created), lang)],
    [tr("rp.meta.mode"), tr(mode === "live" ? "rp.mode.live" : "rp.mode.sim")],
    [tr("rp.meta.model"), setting],
    sc.company.description ? [tr("rp.meta.company"), sc.company.description] : null,
    sector ? [tr("rp.meta.sector"), sector] : null,
    country ? [tr("rp.meta.country"), country] : null,
    [tr("rp.meta.lang"), tr(`lang.${lang}`)]
  ].filter(Boolean);
  const cover = h("section", { class: "vc-report__page vc-report__cover report-page--cover", "aria-labelledby": `${id}-title` },
    h("p", { class: "vc-report__brand" }, h("span", { class: "vc-cell vc-cell--sm vc-cell--lilac", "aria-hidden": "true" }, icon("layout")), APP.name),
    h("div", { class: "vc-report__heading" },
      H(0, { class: "vc-report__title", id: `${id}-title` }, tr("rp.title", { company: sc.company.name })),
      h("p", { class: "vc-report__subtitle" }, s ? fill(s.headline) : tr("rp.sub.none")),
      h("p", { class: "report-tags" },
        h("span", { class: "vc-tag vc-tag--feature" }, icon("sparkle"), tr("rp.ai")),
        mode !== "live" ? h("span", { class: "vc-tag" }, icon("info"), tr("p.fictional")) : null,
        stopped ? h("span", { class: "vc-tag vc-tag--danger" }, icon("warning"), tr("rp.stopped")) : null)),
    h("dl", { class: "vc-report__meta" }, meta.map(([k, v]) => [h("dt", {}, k), h("dd", {}, v)])));

  // ---- 2 management summary ---------------------------------------------------------------------------
  // The key figures as the tiles show them, the old value struck through before the new one.
  const figure = (key) => {
    const x = ctx.tiles?.[key];
    const waiting = !x || x.state === "idle";
    return h("div", { class: "vc-stat report-figure", dataset: { kpi: key } },
      h("p", { class: "vc-stat__label" }, tr(`p.kpi.${key}.label`)),
      h("p", { class: "vc-stat__value" }, !waiting && x.was ? h("s", { class: "vc-stat__was" }, x.was) : null, h("span", {}, waiting ? tr("rp.fig.none") : x.value)),
      h("p", { class: "vc-stat__note" }, waiting ? tr("rp.fig.noneNote") : x.note));
  };
  // A response's kind as a small tag before its title, as Adapt's cards name it: never a bold label and a
  // colon. The decisions table on page two takes the short word, as Adapt's switches do.
  const kindTag = (opt, short = false) => h("span", { class: "vc-tag vc-tag--sm report-kind" }, tr(`choice.${short ? "short." : ""}${opt ? opt.kind : "accept"}`));
  const titleOf = (opt) => (opt ? opt.title : tr("rp.accept.title"));
  // The decisions taken, one row an issue: the issue, the chosen response, its first step with owner and time.
  const decision = (o) => {
    const issue = run.issues.find((i) => i.id === o.issue);
    const opt = o.chosen === "accept" ? null : o.list[o.chosen];
    return h("tr", { dataset: { issue: o.issue, kind: opt ? opt.kind : "accept" } },
      h("th", { scope: "row" }, no(issue), " ", issue.title),
      h("td", {}, kindTag(opt, true), " ", titleOf(opt)),
      h("td", {}, opt ? [opt.first_step, h("span", { class: "report-owner" }, [opt.owner, tr(`time.${opt.time_to_impact}`)].join(" · "))] : h("span", { class: "report-owner" }, tr("rp.accept.none"))));
  };
  const th = (key) => h("th", { scope: "col" }, tr(key));
  const unchecked = live?.unchecked || [];
  const summaryPage = page("sum",
    s ? h("p", { class: "report-headline" }, fill(s.headline)) : note(reached >= STEP.adapt ? tr("rp.sum.noWriter") : tr("rp.sum.none")),
    // Who wrote the summary stands under its headline, across the page, so the columns stay short.
    s ? h("p", { class: "report-by" }, aiTag(tr("rp.sum.ai")), " ", tr("rp.sum.by")) : null,
    h("div", { class: "report-figures" }, figure("stake"), figure("pressure"), figure("cost")),
    s ? h("div", { class: "report-cols" },
      h("div", {},
        unchecked.length ? h("p", { class: "report-warn" }, h("strong", {}, tr("live.unchecked")), " ", tr("live.unchecked.text", { where: unchecked.map((u) => u.where).join(", ") })) : null,
        h("p", {}, fill(s.situation)),
        H(2, {}, tr("p.summary.findings")),
        h("ol", { class: "report-list" }, s.findings.map((x) => h("li", {}, fill(x))))),
      h("div", {},
        H(2, {}, tr("p.summary.recommendation")),
        h("p", {}, fill(s.recommendation)),
        H(2, {}, tr("p.summary.assumptions")),
        h("ul", { class: "report-list" }, s.assumptions.map((x) => h("li", {}, fill(x)))))) : null,
    H(2, {}, tr("rp.decisions.h")),
    applied
      ? h("table", { class: "vc-table vc-table--compact report-decisions" },
        h("colgroup", {}, h("col", { class: "report-col--issue" }), h("col", { class: "report-col--decision" }), h("col", {})),
        h("thead", {}, h("tr", {}, th("p.assess.col.issue"), th("rp.decision"), th("rp.first"))),
        h("tbody", {}, run.options.map(decision)))
      : note(tr("rp.decisions.none")));

  // ---- 3 the canvas, completed and challenged; 7 the canvas after the decision ------------------------
  const removed = ctx.removed || { n: 0, of: 0 };
  const canvasPage = page("canvas",
    h("p", { class: "report-lead" }, tr("rp.canvas.lead"), removed.n ? [" ", tr("rp.canvas.removed", { n: removed.n, of: removed.of })] : null),
    legend(["entered", "ai", "challenged", "pressure", "watch", "count"], lang),
    canvasUnit(canvasFigure({ blocks: run.kept.blocks, side: "before", run, lang, H, id: `${id}-c1` }), lang));
  const compare = run.adapted.compare.blocks;
  const count = (status) => Object.values(compare).flat().filter((it) => it.status === status).length;
  const adaptedPage = page("adapted",
    applied ? [
      h("p", { class: "report-lead" }, tr("rp.adapted.lead", { added: count("added"), changed: count("changed"), removed: count("removed"), before: fmtPressure(run.before.pressure.before, run.before.pressure.of, lang), after: fmtPressure(run.after.pressure.after, run.after.pressure.of, lang) }),
        run.adapted.skipped.length ? [" ", tn("rp.adapted.skipped", run.adapted.skipped.length, { n: run.adapted.skipped.length })] : null),
      legend(["entered", "addressed", "removed", "pressure", "watch", "count"], lang),
      canvasUnit(canvasFigure({ blocks: compare, side: "after", run, lang, H, id: `${id}-c2` }), lang)
    ] : note(tr("rp.adapted.none")));

  // ---- 4 the issues -----------------------------------------------------------------------------------
  const sources = sourcesOf(sc);
  const readOn = new Map(sources.map((x) => [x.url, x]));
  const priced = new Set((sc.answers.impacts?.impacts || []).map((im) => im.issue));
  const issueBlock = (i) => {
    const r = run.before.issues.find((x) => x.id === i.id);
    const money = !priced.has(i.id)
      ? tr("rp.issue.notAssessed")
      : r.before.expected === null
        ? tr("p.assess.notEuros", { reason: i.reason })
        : [h("strong", {}, tr("rp.issue.expected", { eur: fmtMoney(r.before.expected, lang) })), " ", tr("rp.issue.range", { range: fmtRange(i.eur_year_low, i.eur_year_high, lang), likelihood: i.likelihood }), " ", aiTag(), i.eur_basis ? h("span", { class: "report-basis" }, i.eur_basis) : null];
    return h("li", { class: "vc-report__keep report-issue", dataset: { issue: i.id } },
      h("p", { class: "report-issue__head" }, no(i),
        h("span", { class: "report-issue__title" }, i.title),
        h("span", { class: "vc-tag vc-tag--sm band-tag", dataset: { band: r.before.band } }, tr(`band.${r.before.band}`)),
        h("span", { class: "vc-tag vc-tag--sm" }, tr(`type.${i.type}`))),
      h("p", { class: "report-issue__desc" }, i.description),
      h("dl", { class: "report-facts report-facts--aligned" },
        h("dt", {}, tr("p.issue.blocks")), h("dd", {}, i.blocks.map(blockName).join(", ")),
        i.items.length ? [h("dt", {}, tr("rp.issue.items")), h("dd", {}, i.items.map((x) => textOf.get(x)).filter(Boolean).join(" · "))] : null,
        i.contradicts ? [h("dt", {}, tr("p.issue.contradicts")), h("dd", {}, i.contradicts)] : null,
        h("dt", {}, tr("rp.issue.band")), h("dd", {}, tr("rp.issue.bandText", { band: tr(`band.${r.before.band}`), impact: i.impact, likelihood: i.likelihood, horizon: tr(`horizon.${i.horizon}`) })),
        i.kpis.length ? [h("dt", {}, tr("p.assess.col.kpis")), h("dd", {}, h("ul", { class: "report-list report-list--tight" }, i.kpis.map((k) => h("li", {}, `${k.name}: `, h("span", { class: "report-figure-ai" }, fmtChange(k, lang)), kpiById(k.id) ? null : [" ", h("span", { class: "vc-tag vc-tag--sm" }, tr("p.kpi.new"))]))), aiTag())] : null,
        h("dt", {}, tr("rp.issue.money")), h("dd", {}, money),
        h("dt", {}, tr("p.issue.rests")), h("dd", {}, h("ul", { class: "report-list report-list--tight" }, (i.evidence || []).map((u) => (u === GENERAL_KNOWLEDGE || !readOn.has(u)
          ? h("li", {}, tr("p.source.general"))
          : h("li", {}, h("a", { href: u }, readOn.get(u).title), " ", tr("rp.readOn", { date: fmtDate(readOn.get(u).read_on, lang) })))))),
        h("dt", {}, tr("rp.issue.confidence")), h("dd", {}, tr(`conf.${i.confidence}`))));
  };
  const issuesPage = page("issues",
    reached < STEP.challenge ? notRun(STEP.challenge) : [
      h("p", { class: "report-lead" }, tn("rp.issues.lead", run.issues.length, { n: run.issues.length })),
      h("ol", { class: "report-issues" }, run.issues.map(issueBlock))
    ]);

  // ---- 5 the risk matrix ------------------------------------------------------------------------------
  const matrixPage = page("matrix",
    reached < STEP.challenge ? notRun(STEP.challenge) : [
      h("p", { class: "report-lead" }, tr(reached >= STEP.assess ? "rp.matrix.lead" : "rp.matrix.leadNoEuros")),
      riskFigure(run, lang, `${id}-risk`, reached >= STEP.assess)
    ]);

  // ---- 6 the responses --------------------------------------------------------------------------------
  const oneLine = (o, key, issue) => {
    const e = o.effects[key === "accept" ? o.list.length : key];
    const opt = key === "accept" ? null : o.list[key];
    return h("li", { dataset: { kind: opt ? opt.kind : "accept" } }, kindTag(opt), " ", titleOf(opt), h("span", { class: "report-effect" }, effectWords(e, lang)));
  };
  const responseBlock = (o) => {
    const issue = run.issues.find((i) => i.id === o.issue);
    const keys = [...o.list.map((_, k) => k), "accept"];
    const chosen = applied ? o.chosen : null;
    const opt = chosen === null || chosen === "accept" ? null : o.list[chosen];
    const e = chosen === null ? null : o.effects[chosen === "accept" ? o.list.length : chosen];
    return h("div", { class: "vc-report__keep report-resp", dataset: { issue: o.issue } },
      h("p", { class: "report-resp__issue" }, no(issue), " ", issue.title),
      chosen === "accept" ? h("div", { class: "report-resp__chosen", dataset: { kind: "accept" } },
        h("p", { class: "report-resp__title" }, h("span", { class: "vc-tag vc-tag--sm report-chosen" }, icon("check"), tr("rp.chosen")), " ", kindTag(null), " ", titleOf(null)),
        h("p", { class: "report-effect" }, effectWords(e, lang))) : null,
      opt ? h("div", { class: "report-resp__chosen", dataset: { kind: opt.kind } },
        h("p", { class: "report-resp__title" }, h("span", { class: "vc-tag vc-tag--sm report-chosen" }, icon("check"), tr("rp.chosen")), " ", kindTag(opt), " ", h("strong", {}, opt.title), opt.recommended ? [" ", aiTag(tr("p.adapt.recommended"))] : null),
        h("dl", { class: "report-facts report-facts--aligned" },
          h("dt", {}, tr("rp.resp.changes")), h("dd", {}, h("ul", { class: "report-list report-list--tight report-changes" }, opt.changes.map((c) => changeLine(c, { run, lang })))),
          h("dt", {}, tr("rp.resp.effect")), h("dd", {}, effectWords(e, lang), " ", aiTag()),
          h("dt", {}, tr("rp.resp.effort")), h("dd", {}, [tr(`effort.${opt.effort}`), tr(`time.${opt.time_to_impact}`)].join(" · ")),
          h("dt", {}, tr("rp.first")), h("dd", {}, opt.first_step),
          h("dt", {}, tr("rp.owner")), h("dd", {}, opt.owner))) : null,
      h("ul", { class: "report-others" }, keys.filter((k) => k !== chosen).map((k) => oneLine(o, k, issue))));
  };
  const responsesPage = page("resp",
    reached < STEP.adapt ? notRun(STEP.adapt) : [
      h("p", { class: "report-lead" }, tr(applied ? "rp.resp.lead" : "rp.resp.leadUndecided")),
      run.options.map(responseBlock)
    ]);

  // ---- 8 method, assumptions and sources; about this report -------------------------------------------
  const para = (key, vars) => h("p", {}, tr(key, vars));
  const baselines = sc.answers.impacts?.baselines || [];
  const research = [];
  if (live) {
    if (!live.research) research.push(tr("rp.cutoff", { month: new Date(`${KNOWLEDGE_CUTOFF}-01T12:00:00Z`).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { month: "long", year: "numeric" }) }));
    else if (live.researchState?.disabled) research.push(tr("live.research.off"));
  }
  const bare = (url) => url.replace(/^https:\/\/(www\.)?/, "").replace(/\/index\.html$/, "").replace(/\/$/, "");
  const methodPage = page("method",
    H(2, {}, tr("rp.method.figures")),
    para("rp.m.band"), para("rp.m.money"), para("rp.m.blocks"),
    para(applied ? "rp.m.resilience" : "rp.m.resilienceBefore", { before: fmtInt(run.before.resilience.before, lang), after: fmtInt(run.after.resilience.after, lang) }),
    para("rp.m.canvas"),
    H(2, {}, tr("rp.method.assumptions")),
    baselines.length
      ? h("ul", { class: "report-list" }, baselines.map((b) => h("li", {}, `${b.name}: `, h("strong", {}, fmtBaseline(b, lang)), ". ", b.basis, " ", aiTag())))
      : note(tr(reached >= STEP.assess ? "rp.assumptions.none" : "rp.assumptions.notRun")),
    H(2, {}, tr("rp.method.sources")),
    research.map((x) => h("p", { class: "report-warn" }, x)),
    sources.length
      ? h("ul", { class: "report-list report-sources" }, sources.map((x) => h("li", {}, h("a", { href: x.url }, x.title), h("br"), h("code", { class: "report-url" }, x.url), " ", tr("rp.readOn", { date: fmtDate(x.read_on, lang) }))))
      : note(tr("rp.sources.none")),
    h("div", { class: "vc-report__keep report-imprint" },
    H(2, {}, tr("rp.about.h")),
    h("p", {}, tr("rp.about.tool"), " ", h("a", { href: APP.url }, APP.url)),
    para("rp.about.made"),
    mode !== "live" ? para("rp.about.fiction") : null,
    h("p", { class: "report-public" }, tr("rp.public")),
    para("rp.about.generated"),
    // The byline as Vici's profile links set it out, both links rel="author". Paper shows no link, so the
    // two addresses stand beside the name in small type.
    h("p", { class: "vc-byline report-byline" },
      h("span", { class: "vc-byline__label" }, tr("p.byline.label")),
      h("a", { class: "vc-byline__person", href: AUTHOR.linkedin, rel: "author" },
        h("span", { class: "vc-avatar vc-avatar--xs" }, h("img", { src: AUTHOR.portrait, alt: "", width: "96", height: "96" })),
        h("span", { class: "vc-byline__name" }, AUTHOR.name)),
      h("span", { class: "report-byline__where" },
        h("span", {}, bare(AUTHOR.linkedin)), " · ",
        h("a", { href: AUTHOR.website, rel: "author", "aria-label": tr("rp.byline.website") }, bare(AUTHOR.website))))));

  const notice = stopNotice(live, lang);
  return h("article", {
    class: ["vc-report", "report"],
    id,
    lang: lang === "de" ? "de" : "en-GB",
    "data-theme": "light",
    "data-mode": mode,
    "data-vc-footer-start": [tr("rp.foot.created"), APP.url].join("\n"),
    "data-vc-footer-end": tr("rp.foot.end"),
    "data-vc-footer-of": tr("rp.foot.of"),
    "data-vc-notice": notice || null,
    "aria-label": tr("rp.label", { company: sc.company.name })
  },
  cover, summaryPage, canvasPage, issuesPage, matrixPage, responsesPage, adaptedPage, methodPage,
  h("footer", { class: "vc-report__footer" }, h("span", {}, [tr("rp.foot.created"), APP.url].join(" · ")), h("span", {}, tr("rp.foot.by"))));
}

/**
 * A canvas with the credit under it, "The Business Model Canvas: Strategyzer.com · CC BY-SA 3.0", both
 * linked: one unit, which a printed page keeps together.
 */
function canvasUnit(canvas, lang) {
  return h("div", { class: "vc-report__keep report-canvas-unit" }, canvas,
    h("p", { class: "credit report-credit" }, t("p.credit.label", null, lang), " ", h("a", { href: CREDIT.strategyzer }, "Strategyzer.com"), " · ", h("a", { href: CREDIT.licence }, "CC BY-SA 3.0")));
}

/** Every mark the canvas above uses, with its word (Vici's framework legend). */
function legend(marks, lang) {
  const ICON = { ai: "sparkle", challenged: "warning", addressed: "check", removed: "minus", pressure: "warning", watch: "eye" };
  // Every entry but the count has its mark; the count explains the number in a block's state in words.
  return h("ul", { class: "vc-framework__legend report-legend" }, marks.map((m) => h("li", { dataset: { mark: m } }, m === "count" ? null : h("span", { class: "vc-item__mark", "aria-hidden": "true" }, ICON[m] ? icon(ICON[m]) : null), t(`rp.legend.${m}`, null, lang))));
}

/**
 * A canvas on paper: the nine blocks in the classic layout, Vici's framework view without a control. side
 * "before": the canvas the Red team challenged, blocks with their state before the decision and items
 * named by an issue marked with their worst band. side "after": the comparison canvas of the decision,
 * added and changed items marked Adapted (a changed item's old text struck through above the new), removed
 * items struck through, blocks with their state after it.
 */
function canvasFigure({ blocks, side, run, lang, H, id }) {
  const tr = (key, vars = null) => t(key, vars, lang);
  const engine = side === "before" ? run.before : run.after;
  const worstOf = new Map();
  if (side === "before") {
    for (const i of run.issues) {
      const b = run.before.issues.find((x) => x.id === i.id).before.band;
      for (const it of i.items) if (!worstOf.has(it) || RANK.indexOf(b) > RANK.indexOf(worstOf.get(it))) worstOf.set(it, b);
    }
  }
  const changed = new Set(Object.values(blocks).flat().filter((it) => it.status).map((it) => it.block));
  const areas = BLOCKS.map((b) => {
    const state = engine.blocks.find((x) => x.id === b)[side];
    let status = state.state !== "clear" ? state.state : null;
    if (side === "after" && changed.has(b) && status !== "pressure") status = "addressed";
    const tags = [];
    if (status) {
      const n = engine.blocks.find((x) => x.id === b).issues.length;
      const words = [];
      if (status === "addressed") words.push(tr("state.adapted"));
      if (status !== "addressed" || (state.worst && n)) {
        if (words.length) words.push(" · ");
        // "2 · high" on paper, as on a tight screen: the noun stays for screen readers and the legend says
        // what the number counts, since "Adapted · 2 issues · low" is wider than a narrow block on A4.
        words.push(String(n), h("span", { class: "tag-long" }, ` ${tn("state.noun", n, {}, lang)}`), ` · ${tr(`band.${state.worst}`)}`);
      }
      tags.push(h("span", { class: "vc-tag vc-tag--sm vc-framework__state vc-framework__state--status" }, icon(status === "pressure" ? "warning" : status === "watch" ? "eye" : "check"), words));
    }
    const items = blocks[b] || [];
    return h("section", { class: "vc-framework__area report-block", dataset: { block: b, ...(status ? { status } : {}) }, "aria-labelledby": `${id}-${b}` },
      h("header", { class: "vc-framework__head" },
        H(2, { class: "vc-framework__title", id: `${id}-${b}` }, tr(`block.${b}.name`)),
        tags.length ? h("p", { class: "vc-framework__states" }, tags) : null),
      items.length ? h("ul", { class: "vc-framework__items" }, items.map((it) => itemRow(it, side, worstOf, lang))) : h("p", { class: "vc-framework__empty" }, tr("rp.block.empty")));
  });
  return h("div", { class: "vc-framework report-canvas", role: "group", "aria-label": tr(side === "before" ? "rp.canvas.h" : "rp.adapted.h") }, areas);
}

/** One item on paper: its mark, its text and its state in words. */
function itemRow(it, side, worstOf, lang) {
  const tr = (key) => t(key, null, lang);
  const source = it.source === "user" ? "entered" : it.source;
  let status = null;
  let word = "";
  if (side === "before" && worstOf.has(it.id)) { status = "challenged"; word = tr(`band.${worstOf.get(it.id)}`); }
  if (it.status === "added" || it.status === "changed") { status = "addressed"; word = tr("item.adapted"); }
  if (it.status === "removed") { status = "removed"; word = tr("item.removed"); }
  const states = [];
  if (source === "ai") states.push(h("span", { class: "vc-tag vc-tag--sm vc-item__state vc-item__state--source" }, it.edited ? tr("item.aiEdited") : tr("item.ai")));
  else if (source !== "added") states.push(h("span", { class: "vc-item__state vc-visually-hidden" }, tr("item.entered")));
  if (status) states.push(h("span", { class: "vc-tag vc-tag--sm vc-item__state vc-item__state--status" }, word));
  const mark = status === "removed" ? icon("minus") : status === "addressed" ? icon("check") : status === "challenged" ? icon("warning") : source === "ai" || source === "added" ? icon("sparkle") : null;
  return h("li", { class: "vc-item", dataset: { source, item: it.id, ...(status ? { status } : {}) } },
    h("div", { class: "vc-item__summary" },
      h("span", { class: "vc-item__mark", "aria-hidden": "true" }, mark),
      h("span", { class: "vc-item__text" }, it.was && status !== "removed" ? [h("s", { class: "vc-item__was" }, it.was), " ", it.text] : it.text),
      h("span", { class: "vc-item__states" }, states)));
}

/**
 * The risk matrix of the issues, Vici's markup, with its numbers in the table under it: impact up,
 * likelihood across, one numbered mark per issue sized by its expected euros a year. The matrix is a
 * picture for the eye; the table carries every figure in words, so a screen reader and a grey printout
 * lose nothing.
 */
function riskFigure(run, lang, id, euros) {
  const tr = (key, vars = null) => t(key, vars, lang);
  const rows = run.before.issues;
  const max = euros ? Math.max(0, ...rows.map((r) => r.before.expected || 0)) : 0;
  const cells = [];
  for (let impact = 5; impact >= 1; impact--) {
    cells.push(h("span", { class: "vc-risk__tick" }, String(impact)));
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      const here = run.issues.filter((i) => i.impact === impact && i.likelihood === likelihood);
      cells.push(h("div", { class: "vc-risk__cell", dataset: { impact: String(impact), likelihood: String(likelihood), band: band(impact, likelihood) } },
        h("span", { class: "vc-risk__score" }, String(riskScore(impact, likelihood))),
        here.map((i) => h("span", { class: ["vc-risk__marker", sizeOf(rows.find((x) => x.id === i.id).before.expected, max)], dataset: { impact: String(impact), likelihood: String(likelihood) } }, i.id.slice(1)))));
    }
  }
  cells.push(h("span", { class: "vc-risk__tick", "aria-hidden": "true" }));
  for (let l = 1; l <= 5; l++) cells.push(h("span", { class: "vc-risk__tick" }, String(l)));
  const sizes = new Set(rows.map((r) => sizeOf(r.before.expected, max)));
  const th = (key) => h("th", { scope: "col" }, tr(`p.assess.col.${key}`));
  return h("figure", { class: "vc-risk vc-report__keep report-risk", "aria-labelledby": `${id}-cap` },
    h("figcaption", {}, h("p", { class: "vc-chart__title", id: `${id}-cap` }, tn("p.assess.matrix", rows.length, {}, lang))),
    h("div", { class: "report-risk__picture", "aria-hidden": "true" },
      h("div", { class: "vc-risk__plot" },
        h("p", { class: "vc-risk__axis vc-risk__axis--impact" }, tr("p.assess.impact")),
        h("div", { class: "vc-risk__grid" }, cells),
        h("p", { class: "vc-risk__axis vc-risk__axis--likelihood" }, tr("p.assess.likelihood"))),
      h("ul", { class: "vc-risk__key" },
        RANK.map((b) => h("li", { dataset: { band: b } }, tr(`p.assess.key.${b}`))),
        sizes.has("vc-risk__marker--sm") ? h("li", { dataset: { size: "sm" } }, tr("p.assess.key.sm")) : null,
        sizes.has("vc-risk__marker--lg") ? h("li", { dataset: { size: "lg" } }, tr("p.assess.key.lg")) : null)),
    h("table", { class: "vc-table vc-table--compact report-risk__table" },
      h("thead", {}, h("tr", {}, th("issue"), th("impact"), th("likelihood"), th("score"), th("band"), th("stake"))),
      h("tbody", {}, rows.map((r) => {
        const i = run.issues.find((x) => x.id === r.id);
        return h("tr", { dataset: { issue: i.id } },
          h("th", { scope: "row" }, h("span", { class: "report-no", "aria-hidden": "true" }, i.id.slice(1)), " ", i.title),
          h("td", { class: "vc-num" }, String(i.impact)), h("td", { class: "vc-num" }, String(i.likelihood)), h("td", { class: "vc-num" }, String(r.before.score)),
          h("td", {}, tr(`band.${r.before.band}`)),
          h("td", { class: "vc-num" }, !euros ? tr("rp.fig.notYet") : r.before.expected === null ? tr("fig.noEuros") : fmtMoney(r.before.expected, lang)));
      }))));
}
