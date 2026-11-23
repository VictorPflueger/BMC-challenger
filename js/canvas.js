// The nine blocks of the Business Model Canvas in its classic layout (brief 6.1): Key partners; Key
// activities above Key resources; Value propositions; Customer relationships above Channels; Customer
// segments; and below them Cost structure and Revenue streams. css/app.css places them with grid areas
// named after these ids. The ids stay in the data, the engine and the logs; the screen shows the names
// from js/i18n (Vici: names, not record ids).
//
// The Business Model Canvas is Strategyzer AG's, released under CC BY-SA 3.0; every canvas this tool
// draws carries the credit "The Business Model Canvas: Strategyzer.com · CC BY-SA 3.0" under it.

/** The block ids, in reading order of the classic layout. */
export const BLOCKS = Object.freeze(["partners", "activities", "resources", "value", "relationships", "channels", "segments", "costs", "revenue"]);

/** True for one of the nine block ids. */
export function isBlock(id) {
  return BLOCKS.includes(id);
}
