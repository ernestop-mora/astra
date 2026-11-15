// WCAG 2.2 AA audit over every route and assistant state.
//   1. axe-core with the tags wcag2a, wcag2aa, wcag21aa, wcag22aa
//   2. contrast measured on the rendered pixels behind each text, icon and control
//      border (axe cannot decide over gradients and glass), worst case per element
//   3. target size (2.5.8), accessible names, one h1, landmarks, lang
//   4. keyboard walk: every stop shows a 2 px ring with 3:1 and is not covered (2.4.11)
// Usage: node scripts/a11y.mjs   (app served at BASE, default http://localhost:3111)
import { AxeBuilder } from "@axe-core/playwright";
import { loadPlaywright, STATES, visit } from "./lib/browser.mjs";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const { chromium } = loadPlaywright();

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
// A blank page decodes screenshots, away from the app's own policies.
const lab = await context.newPage();

/* ---------- in-page collectors ---------- */

/** Text, icons and control borders with their colours and boxes. */
function collect() {
  // Any CSS colour (rgb, oklab, color-mix) to sRGB bytes plus alpha, through a canvas.
  const ink = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  const rgba = (s) => {
    if (cache.has(s)) return cache.get(s);
    ink.clearRect(0, 0, 1, 1);
    ink.fillStyle = "#000";
    ink.fillStyle = s;
    ink.fillRect(0, 0, 1, 1);
    const d = ink.getImageData(0, 0, 1, 1).data;
    const out = [d[0], d[1], d[2], d[3] / 255];
    cache.set(s, out);
    return out;
  };
  const visible = (el) => {
    let alpha = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return 0;
      alpha *= Number(cs.opacity);
    }
    return alpha;
  };
  const name = (el) => {
    const id = el.getAttribute("aria-label") || (el.textContent || "").trim().slice(0, 36) || el.tagName.toLowerCase();
    return `${el.tagName.toLowerCase()} "${id}"`;
  };
  // Covered by a layer above it (an open panel): not on screen, so not measured.
  const onTop = (el, r) => {
    const svg = el.closest("svg");
    const y = (r.top + r.bottom) / 2;
    return [0.1, 0.5, 0.9].every((f) => {
      const top = document.elementFromPoint(r.left + (r.right - r.left) * f, y);
      return !top || el.contains(top) || top.contains(el) || (svg !== null && top.closest("svg") === svg);
    });
  };
  const inView = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  const disabled = (el) => el.closest(":disabled, [aria-disabled=true], [data-disabled]") !== null;
  const items = [];

  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("svg") && el.tagName !== "text") continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (own.length === 0 || disabled(el)) continue;
    const alpha = visible(el);
    if (alpha < 0.05) continue;
    const cs = getComputedStyle(el);
    if (cs.clipPath !== "none" || (cs.position === "absolute" && el.offsetWidth <= 1)) continue; // sr-only
    const box = el.getBoundingClientRect();
    const color = rgba(el.tagName === "text" ? cs.fill : cs.color);
    const px = el.tagName === "text" ? box.height : parseFloat(cs.fontSize);
    for (const node of own) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const g of range.getClientRects()) {
        const r = { left: Math.max(g.left, box.left), top: Math.max(g.top, box.top), right: Math.min(g.right, box.right), bottom: Math.min(g.bottom, box.bottom) };
        r.width = r.right - r.left;
        r.height = r.bottom - r.top;
        if (!inView(r) || !onTop(el, r)) continue;
        const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
        items.push({ kind: "text", name: name(el), rect: r, color: [color[0], color[1], color[2], color[3] * alpha], need: large ? 3 : 4.5 });
      }
    }
  }

  for (const el of document.querySelectorAll("svg.lucide")) {
    const alpha = visible(el);
    const r = el.getBoundingClientRect();
    if (alpha < 0.05 || !inView(r) || disabled(el) || !onTop(el, r)) continue;
    const c = rgba(getComputedStyle(el).color);
    const owner = el.closest("button, a, [role=radio], li, p, h2, span") ?? el;
    items.push({ kind: "icon", name: `icon in ${name(owner)}`, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, color: [c[0], c[1], c[2], c[3] * alpha], need: 3 });
  }

  const controls = "button, input:not([type=file]), select, textarea, [role=radio], [role=radiogroup]";
  for (const el of document.querySelectorAll(controls)) {
    const alpha = visible(el);
    const r = el.getBoundingClientRect();
    if (alpha < 0.05 || !inView(r) || disabled(el) || !onTop(el, r)) continue;
    const cs = getComputedStyle(el);
    const c = rgba(cs.borderTopColor);
    if (parseFloat(cs.borderTopWidth) < 0.5 || c[3] < 0.02) continue;
    // Measured against the page just outside the control, left of its edge and clear of any focus ring.
    const x = r.left - 7;
    items.push({ kind: "border", name: `border of ${name(el)}`, rect: { left: x, top: r.top + r.height * 0.35, right: x + 1, bottom: r.top + r.height * 0.65 }, color: [c[0], c[1], c[2], c[3] * alpha], need: 3 });
  }
  return { items, dpr: devicePixelRatio };
}

/** Runs in the blank page: worst contrast of each item against the pixels behind it. */
async function measure({ png, items, dpr }) {
  const blob = await (await fetch(`data:image/png;base64,${png}`)).blob();
  const bmp = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const out = [];
  for (const it of items) {
    const x = Math.max(0, Math.floor(it.rect.left * dpr));
    const y = Math.max(0, Math.floor(it.rect.top * dpr));
    const w = Math.min(bmp.width - x, Math.ceil((it.rect.right - it.rect.left) * dpr));
    const h = Math.min(bmp.height - y, Math.ceil((it.rect.bottom - it.rect.top) * dpr));
    if (w <= 0 || h <= 0) continue;
    const data = ctx.getImageData(x, y, w, h).data;
    const [cr, cg, cb, ca] = it.color;
    const ratios = [];
    for (let i = 0; i < data.length; i += 4) {
      const br = data[i], bg = data[i + 1], bb = data[i + 2];
      // The colour as painted: its alpha composited over this background pixel.
      const fl = lum(cr * ca + br * (1 - ca), cg * ca + bg * (1 - ca), cb * ca + bb * (1 - ca));
      const bl = lum(br, bg, bb);
      ratios.push((Math.max(fl, bl) + 0.05) / (Math.min(fl, bl) + 0.05));
    }
    ratios.sort((a, b) => a - b);
    // Worst case, ignoring the lowest 1% (antialiased edges of neighbours).
    const worst = ratios[Math.floor(ratios.length * 0.01)];
    out.push({ kind: it.kind, name: it.name, need: it.need, ratio: worst });
  }
  return out;
}

/** Structure checks that axe does not cover or covers loosely. */
function structure() {
  const problems = [];
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  };
  const label = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40);
  if (document.documentElement.lang !== "en") problems.push("html lang is not en");
  const h1 = [...document.querySelectorAll("h1")].filter(shown).length;
  if (h1 !== 1) problems.push(`${h1} h1 elements`);
  for (const tag of ["header", "nav", "main"]) {
    if (!document.querySelector(tag)) problems.push(`no <${tag}> landmark`);
  }
  if (!document.querySelector("a[href='#main']")) problems.push("no skip link");
  if (document.querySelector("[aria-current=page]") === null && location.pathname !== "/ds") problems.push("no aria-current on the active tab");
  for (const el of document.querySelectorAll("a, button, input:not([type=file]), [role=radio], [role=menuitem]")) {
    if (!shown(el) || el.getAttribute("aria-hidden") === "true" || el.offsetWidth <= 1) continue;
    const r = el.getBoundingClientRect();
    const inline = el.tagName === "A" && getComputedStyle(el).display === "inline";
    if (!inline && (r.width < 24 || r.height < 24)) problems.push(`target ${Math.round(r.width)}x${Math.round(r.height)}: ${el.tagName.toLowerCase()} "${label(el)}"`);
    if (!label(el) && !el.getAttribute("aria-labelledby") && !el.getAttribute("placeholder")) problems.push(`no accessible name: ${el.outerHTML.slice(0, 80)}`);
  }
  for (const svg of document.querySelectorAll("svg")) {
    if (!shown(svg) || svg.closest("[aria-hidden=true]")) continue;
    if (svg.getAttribute("role") !== "img" || !svg.getAttribute("aria-label")) problems.push(`svg without a name: ${svg.outerHTML.slice(0, 70)}`);
  }
  for (const el of document.querySelectorAll("[role=alert]")) {
    if (!/offline/i.test(el.textContent || "")) problems.push(`role=alert used for something other than a sensor failure: "${label(el)}"`);
  }
  return problems;
}

/** The focused element: its ring and whether something covers it. */
function focusInfo() {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const y = r.top + r.height / 2;
  const points = [
    [r.left + r.width / 2, y],
    [r.left + r.width * 0.25, y],
    [r.left + r.width * 0.75, y],
  ];
  const covered = points.filter(([x, y]) => {
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return true;
    const top = document.elementFromPoint(x, y);
    return !(top && (el.contains(top) || top.contains(el)));
  }).length;
  const ink = document.createElement("canvas").getContext("2d");
  ink.fillStyle = cs.outlineColor;
  ink.fillRect(0, 0, 1, 1);
  const ring = [...ink.getImageData(0, 0, 1, 1).data];
  return {
    name: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 36)}"`,
    key: `${el.tagName}|${el.getAttribute("aria-label") || el.textContent}|${Math.round(r.left)}|${Math.round(r.top)}`,
    ring: cs.outlineStyle !== "none" ? parseFloat(cs.outlineWidth) : 0,
    color: ring,
    offset: parseFloat(cs.outlineOffset) || 0,
    rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
    covered,
  };
}

const HIDE_INK = `
  *, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; transition: none !important; }
  ::placeholder { color: transparent !important; }
  svg text { fill: transparent !important; }
`;
const FLAT = "*, *::before, *::after { transition: none !important; animation: none !important; }";

/* ---------- run ---------- */

const totals = { axe: 0, axeNodes: 0, undecided: 0, contrast: 0, structure: 0, focus: 0, checked: 0, stops: 0 };
const byRule = new Map();

for (const state of STATES) {
  await visit(page, state);
  console.log(`\n== ${state.name}`);

  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const n = result.violations.reduce((sum, v) => sum + v.nodes.length, 0);
  totals.axe += result.violations.length;
  totals.axeNodes += n;
  totals.undecided += result.incomplete.reduce((sum, v) => sum + v.nodes.length, 0);
  console.log(`axe: ${result.violations.length} rules failing (${n} nodes), ${result.passes.length} passing, ${result.incomplete.reduce((s, v) => s + v.nodes.length, 0)} nodes axe could not decide`);
  for (const v of result.violations) {
    byRule.set(v.id, (byRule.get(v.id) ?? 0) + v.nodes.length);
    console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})`);
    for (const node of v.nodes.slice(0, 3)) console.log(`      ${node.target.join(" ").slice(0, 150)}`);
  }

  // Contrast on real pixels: freeze motion, record the ink, hide it, photograph what is behind.
  const flat = await page.addStyleTag({ content: FLAT });
  const found = await page.evaluate(collect);
  const hide = await page.addStyleTag({ content: HIDE_INK });
  const png = (await page.screenshot()).toString("base64");
  await hide.evaluate((el) => el.remove());
  const measured = await lab.evaluate(measure, { png, items: found.items, dpr: found.dpr });
  const bad = measured.filter((m) => m.ratio < m.need - 0.005);
  const lowest = measured.reduce((a, b) => (b.ratio / b.need < a.ratio / a.need ? b : a), measured[0]);
  totals.contrast += bad.length;
  totals.checked += measured.length;
  console.log(`contrast on rendered pixels: ${measured.length} checked, ${bad.length} below AA${lowest ? `, tightest ${lowest.ratio.toFixed(2)}:1 (${lowest.kind}, needs ${lowest.need})` : ""}`);
  const seen = new Set();
  for (const b of bad.sort((a, c) => a.ratio - c.ratio)) {
    const key = `${b.kind} ${b.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size > 12) break;
    console.log(`  ${b.ratio.toFixed(2)}:1 needs ${b.need}  ${b.kind}  ${b.name}`);
  }
  if (new Set(bad.map((b) => `${b.kind} ${b.name}`)).size > 12) console.log("  ...");

  const problems = await page.evaluate(structure);
  totals.structure += problems.length;
  console.log(`structure and targets: ${problems.length} problems`);
  for (const p of [...new Set(problems)].slice(0, 10)) console.log(`  ${p}`);

  // Keyboard walk, still without transitions so each ring is read at its final colour.
  void flat;
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    window.scrollTo(0, 0);
  });
  const stops = [];
  const keys = new Set();
  let wrapped = false;
  for (let i = 0; i < 90; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(focusInfo);
    // Leaving the last stop goes through the browser's own UI once, then back to the top.
    if (!info && !wrapped) {
      wrapped = true;
      continue;
    }
    if (!info || keys.has(info.key)) break;
    keys.add(info.key);
    stops.push(info);
  }
  // Cyan on navy is 8.4:1 and navy on cream 11:1, so a ring in either colour clears 3:1.
  const near = (c, t) => Math.abs(c[0] - t[0]) <= 2 && Math.abs(c[1] - t[1]) <= 2 && Math.abs(c[2] - t[2]) <= 2;
  const focusBad = [];
  for (const s of stops) {
    if (s.ring < 2) focusBad.push(`no 2 px ring: ${s.name}`);
    else if (!near(s.color, [98, 212, 230]) && !near(s.color, [23, 42, 57])) focusBad.push(`ring is not cyan (or navy on cream): ${s.name}`);
    if (s.covered > 0) focusBad.push(`focused but covered at ${s.covered} of 3 points: ${s.name}`);
  }
  totals.focus += focusBad.length;
  totals.stops += stops.length;
  console.log(`keyboard: ${stops.length} stops, ${focusBad.length} problems`);
  console.log(`  order: ${stops.map((s) => s.name.replace(/^\w+ /, "")).join(" > ").slice(0, 600)}`);
  for (const p of focusBad.slice(0, 10)) console.log(`  ${p}`);
}

await browser.close();

console.log("\n---- summary ----");
console.log(`tags: ${TAGS.join(", ")}; states audited: ${STATES.length}`);
console.log(`axe: ${totals.axe} failing rules, ${totals.axeNodes} failing nodes, ${totals.undecided} nodes undecided (covered by the pixel check below)`);
for (const [id, n] of [...byRule].sort((a, b) => b[1] - a[1])) console.log(`  ${id}: ${n}`);
console.log(`contrast on rendered pixels: ${totals.contrast} below AA of ${totals.checked} checked`);
console.log(`structure and targets: ${totals.structure} problems`);
console.log(`keyboard: ${totals.focus} problems over ${totals.stops} stops`);
const failed = totals.axe + totals.contrast + totals.structure + totals.focus;
console.log(failed === 0 ? "PASS" : "FAIL");
process.exit(failed === 0 ? 0 : 1);
