# Vici, copied into this prototype

These files come unchanged from Vici, Victor Pflüger's design system
(<https://victorpflueger.github.io/ViciDesign/index.html>): version **v1.0.0** as it stands on main at commit **`20e47d7`**
(24 November 2026), on the way to Vici 2.0. Besides the How it works guide (`vc-guide`) with one guide
per language, the 2.0 byline, the key-figure rule, the struck-through old value of a key figure
(`vc-stat__was`), `vc-attention` and `--vc-step-fill`, that commit brings the framework view with its
item and block states, the risk matrix with markers sized by what is at stake (both of them merged
from this tool and the SWOT Challenger), `vici-theme.js`, which applies the theme before the first
paint under a strict security policy, the live-run dialog (`vc-live`, from the SWOT Challenger, with
the Prototype Ideator's fit for short windows), callouts that keep their text and actions in their
own ink, the report's pages that print with the prototype's footer and lie on the page's own background
in the dark theme (from the PESTEL Challenger), dialogs whose backdrop keeps still under reduced motion,
the live-run dialog's fit for every window from 1280 × 720 to 1920 × 1080 and a report that prints in the light scheme from the dark theme (both from the SWOT Challenger), a honeycomb whose first column starts at the comb's edge (from the Prototype Ideator), segmented options, switches, sliders and the numbers' summary that take 40 px to hit (from the PESTEL Challenger), the live-run dialog's acknowledgement, which does too, and the framework view's compact form for one area alone (both from this tool). Its files still call themselves 1.0.0 until 2.0 is released. The
prototype loads them from here rather than from a CDN, so every page is served from this site alone.

| File here | What it is |
|---|---|
| `dist/vici.min.css` | Vici's stylesheet: tokens, light and dark theme, components, icons |
| `dist/vici.js` | Vici's small script: theme toggle, tooltips, the How it works guide and the behaviours of its components |
| `dist/vici-theme.js` | The theme before the first paint: the visitor's choice, else the light theme `index.html` names |
| `dist/tokens.json` | Vici's token values, light and dark, for scripts and tests |
| `assets/fonts/*.woff2` | Bricolage Grotesque, Inter, JetBrains Mono and Vici Mask, as the stylesheet expects them |
| `assets/fonts/OFL-*.txt` | The SIL Open Font License of each font family |
| `assets/marks/linkedin.png` | LinkedIn's [in] logo, as LinkedIn publishes it |
| `assets/marks/README.md` | Where the marks come from and how they may be used (it also names marks this copy leaves out) |
| `assets/brand/portrait-96.jpg` | Victor's portrait, 96 × 96 px, for the byline |
| `LICENSE` | Vici's licence |

Keep the folder structure: the stylesheet finds the fonts at `../assets/fonts/`. Never edit these
files; a fix belongs in Vici and comes here with the next copy. `tests/vici-files.mjs` and
`tests/vici.mjs` compare every file with ViciDesign at the commit above.

**Licence.** `LICENSE` covers all of it: Vici's code and its Vici Mask font are MIT-licensed;
Bricolage Grotesque, Inter and JetBrains Mono are under the SIL Open Font License; Victor Pflüger's
name, portrait and logo are reserved for his own use; LinkedIn's logo belongs to LinkedIn.

**Updating.** Copy the same files from a newer Vici main (from its `dist/` and `assets/` folders, and
`LICENSE`) over these, change the commit above and the one the tests workflow checks out, then run the
tests and look at the page in light and dark, in English and German.
