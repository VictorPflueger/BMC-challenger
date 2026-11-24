// The nine blocks of the Business Model Canvas in its classic layout (brief 6.1): Key partners; Key
// activities above Key resources; Value propositions; Customer relationships above Channels; Customer
// segments; and below them Cost structure and Revenue streams. css/app.css places them with grid areas
// named after these ids. The ids stay in the data, the engine and the logs; the screen shows the names
// from js/i18n (Vici: names, not record ids).
//
// A canvas is { blocks: { <block id>: [item] } } and an item { id, block, text, source: "user" | "ai",
// confidence, basis }, its id the block's and a number ("value-2"). This module completes a canvas with
// the Completer's items, takes out the items the person removed, and applies the changes of the
// responses the person chose to a copy (brief 6.6). Pure functions; the canvas passed in never changes.
//
// The Business Model Canvas is Strategyzer AG's, released under CC BY-SA 3.0; every canvas this tool
// draws carries the credit "The Business Model Canvas: Strategyzer.com · CC BY-SA 3.0" under it.

/** The block ids, in reading order of the classic layout. */
export const BLOCKS = Object.freeze(["partners", "activities", "resources", "value", "relationships", "channels", "segments", "costs", "revenue"]);

/** True for one of the nine block ids. */
export function isBlock(id) {
  return BLOCKS.includes(id);
}

/** The block an item id belongs to: "value-2" is in "value". */
export function blockOf(itemId) {
  return String(itemId).replace(/-\d+$/, "");
}

/** Every item id of a canvas, as a set. */
export function itemIds(canvas) {
  return new Set(BLOCKS.flatMap((b) => (canvas?.blocks?.[b] || []).map((it) => it.id)));
}

/** Every item of a canvas, block by block. */
export function itemsOf(canvas) {
  return BLOCKS.flatMap((b) => canvas?.blocks?.[b] || []);
}

const number = (id) => Number(String(id).match(/-(\d+)$/)?.[1] || 0);
const nextId = (block, items) => `${block}-${Math.max(0, ...items.map((it) => number(it.id))) + 1}`;

/**
 * The canvas the Completer leaves: the person's items as they are, then each new item in its block,
 * numbered on from the block's last item. Code adds the ids and the AI's source (PLAN.md §4).
 */
export function complete(entered, completion) {
  const blocks = Object.fromEntries(BLOCKS.map((b) => [b, (entered?.blocks?.[b] || []).map((it) => ({ ...it, block: b, source: it.source || "user" }))]));
  for (const it of completion?.items || []) {
    if (!isBlock(it.block)) continue;
    const list = blocks[it.block];
    list.push({ id: nextId(it.block, list), block: it.block, text: it.text, source: "ai", confidence: it.confidence, basis: it.basis, ...(it.edited ? { edited: true } : {}) });
  }
  return { blocks };
}

/** The canvas without the AI items the person removed at Complete. */
export function withoutRemoved(canvas, removed = new Set()) {
  return { blocks: Object.fromEntries(BLOCKS.map((b) => [b, (canvas.blocks[b] || []).filter((it) => !removed.has(it.id))])) };
}

/**
 * The chosen changes applied to a copy of the canvas, in the order given. A change: { block, action:
 * "add" | "change" | "remove", item, text }. Returns
 *   after    the adapted canvas: added items in place (source "added"), changed items with their new
 *            text, removed items gone;
 *   compare  the same canvas with the removed items still in it, each item marked: status "added",
 *            "changed" (with `was`, the old text) or "removed", or none;
 *   skipped  changes that name an item no longer there, such as one the person removed at Complete.
 * An added item takes the next free number of its block, counting every item the block ever held: pass
 * `held`, the ids of the completed canvas, so that an item the person removed keeps its number to itself.
 */
export function applyChanges(canvas, changes = [], held = new Set()) {
  const compare = Object.fromEntries(BLOCKS.map((b) => [b, (canvas.blocks[b] || []).map((it) => ({ ...it }))]));
  const gone = [...held].map((id) => ({ id, block: blockOf(id) }));
  const skipped = [];
  for (const c of changes) {
    const list = compare[c.block];
    if (!list) { skipped.push(c); continue; }
    if (c.action === "add") {
      list.push({ id: nextId(c.block, [...list, ...gone.filter((x) => x.block === c.block)]), block: c.block, text: c.text, source: "added", status: "added", change: c });
      continue;
    }
    const it = list.find((x) => x.id === c.item && x.status !== "removed");
    if (!it) { skipped.push(c); continue; }
    if (c.action === "remove") Object.assign(it, { status: "removed", change: c });
    else if (c.action === "change") Object.assign(it, { was: it.was ?? it.text, text: c.text, status: it.status === "added" ? "added" : "changed", change: c });
  }
  const after = { blocks: Object.fromEntries(BLOCKS.map((b) => [b, compare[b].filter((it) => it.status !== "removed")])) };
  return { after, compare: { blocks: compare }, skipped };
}
