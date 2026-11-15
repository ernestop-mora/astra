// Type scale audit: lists every computed font size and weight on every route and
// state, and flags anything outside the scale defined in src/app/globals.css.
//   sizes   --text-xs 0.75rem, --text-sm 0.875rem, --text-md 1rem, --text-lg 1.25rem,
//           --text-xl 1.75rem, --text-figure 3rem
//   weights 400, 500, 600
//   --text-xs is for short labels and metadata only: long text at that size is flagged
// Usage: node scripts/type-audit.mjs   (app served at BASE, default http://localhost:3111)
import { loadPlaywright, STATES, visit } from "./lib/browser.mjs";

const SCALE = { 0.75: "--text-xs", 0.875: "--text-sm", 1: "--text-md", 1.25: "--text-lg", 1.75: "--text-xl", 3: "--text-figure" };
const WEIGHTS = [400, 500, 600];
/** Longest text allowed at --text-xs, in characters. */
const SHORT = 64;
const { chromium } = loadPlaywright();

function collect() {
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const svgText = el.tagName === "text";
    if (el.closest("svg") && !svgText) continue;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (!text) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (cs.clipPath !== "none" || (cs.position === "absolute" && el.offsetWidth <= 1)) continue; // screen-reader only
    let px = parseFloat(cs.fontSize);
    // Text inside a drawing: what counts is its size on screen.
    if (svgText) px *= el.getScreenCTM()?.a ?? 1;
    out.push({
      rem: px / rootPx,
      weight: Number(cs.fontWeight),
      lineHeight: cs.lineHeight === "normal" ? null : parseFloat(cs.lineHeight) / parseFloat(cs.fontSize),
      family: cs.fontFamily.includes("Mono") ? "DM Mono" : cs.fontFamily.includes("Grotesk") ? "Space Grotesk" : cs.fontFamily,
      text: text.replace(/\s+/g, " "),
      tag: el.tagName.toLowerCase(),
    });
  }
  return out;
}

const browser = await chromium.launch();
const sizes = new Map();
const weights = new Map();
const families = new Map();
const lineHeights = new Map();
const off = [];
let checked = 0;

for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  for (const state of STATES) {
    await visit(page, state);
    for (const t of await page.evaluate(collect)) {
      checked++;
      const where = `${state.name} @${viewport.width}: <${t.tag}> "${t.text.slice(0, 50)}"`;
      const key = Object.keys(SCALE).find((k) => Math.abs(Number(k) - t.rem) < 0.012);
      const name = key ? `${SCALE[key]} ${key}rem` : `${t.rem.toFixed(3)}rem`;
      sizes.set(name, (sizes.get(name) ?? 0) + 1);
      weights.set(t.weight, (weights.get(t.weight) ?? 0) + 1);
      families.set(t.family, (families.get(t.family) ?? 0) + 1);
      if (t.lineHeight !== null) {
        const lh = t.lineHeight.toFixed(2);
        lineHeights.set(lh, (lineHeights.get(lh) ?? 0) + 1);
      }
      if (!key) off.push(`size ${t.rem.toFixed(3)}rem  ${where}`);
      if (!WEIGHTS.includes(t.weight)) off.push(`weight ${t.weight}  ${where}`);
      if (key === "0.75" && t.text.length > SHORT) off.push(`long text (${t.text.length} chars) at --text-xs  ${where}`);
      if (!["DM Mono", "Space Grotesk"].includes(t.family)) off.push(`font ${t.family}  ${where}`);
    }
  }
  await context.close();
}
await browser.close();

const table = (title, map) => {
  console.log(`\n${title}`);
  for (const [k, n] of [...map].sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true }))) {
    console.log(`  ${String(k).padEnd(26)} ${n}`);
  }
};
console.log(`text elements checked: ${checked} (every route and state, at 1920 and 1366 wide)`);
table("computed font sizes", sizes);
table("font weights", weights);
table("line heights (ratio)", lineHeights);
table("families", families);
console.log(`\noff scale: ${off.length}`);
for (const o of [...new Set(off)].slice(0, 40)) console.log(`  ${o}`);
console.log(off.length === 0 ? "PASS: zero off scale" : "FAIL");
process.exit(off.length === 0 ? 0 : 1);
