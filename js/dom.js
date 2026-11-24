// Small DOM helpers. Every text the page shows goes in through textContent, never innerHTML, so nothing
// an agent or a person wrote can become markup. Adapted from the Prototype Ideator's dom.js (ec368c3).

/**
 * Creates an element. attrs: class (string or array), text, dataset {}, on {event: fn}, and any other
 * attribute (true sets it empty; false, null and undefined leave it out). children: strings, nodes,
 * arrays, or null and false, which are skipped.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = Array.isArray(v) ? v.filter(Boolean).join(" ") : v;
    else if (k === "text") el.textContent = String(v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k === "on") for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

/** An icon from Vici's set, hidden from screen readers: the text beside it carries the meaning. */
export function icon(name) {
  return h("span", { class: `vc-icon vc-icon--${name}`, "aria-hidden": "true" });
}
