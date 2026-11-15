// Layout audit and captures.
//   - 1920x1080 and 1366x768 at 100%: no page scroll, no inner scrollers, nothing
//     cut by the window, nothing clipped, no text on top of other text, and the
//     assistant bubble over nothing.
//   - 200% page zoom (960x540 at 2x), 200% text size and WCAG 1.4.12 text spacing:
//     scrolling is allowed; nothing may be clipped or overlap, and no sideways scroll.
//   - every network request must stay on this origin; console errors are reported.
// Usage: node scripts/layout.mjs [out-dir]   (app served at BASE, default http://localhost:3111)
import fs from "node:fs";
import path from "node:path";
import { BASE, loadPlaywright, ROUTES, STATES, visit } from "./lib/browser.mjs";

const OUT = path.resolve(process.argv[2] || ".shots/wcag");
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = loadPlaywright();

const SPACING = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }`;
const TEXT_200 = "html { font-size: 200% !important; }";

const MODES = [
  { name: "1920x1080", viewport: { width: 1920, height: 1080 }, scale: 1, fit: true, states: STATES, shots: true },
  { name: "1366x768", viewport: { width: 1366, height: 768 }, scale: 1, fit: true, states: STATES, shots: true },
  { name: "zoom 200% (960x540 at 2x)", viewport: { width: 960, height: 540 }, scale: 2, fit: false, states: STATES, shots: true, file: "zoom200" },
  { name: "text size 200% at 1920x1080", viewport: { width: 1920, height: 1080 }, scale: 1, fit: false, states: STATES, css: TEXT_200 },
  { name: "text spacing 1.4.12 at 1366x768", viewport: { width: 1366, height: 768 }, scale: 1, fit: false, states: STATES, css: SPACING },
  { name: "1280x720 (smallest one-screen size)", viewport: { width: 1280, height: 720 }, scale: 1, fit: true, states: STATES },
];

/** Everything measured in the page. */
function inspect({ fit, checkBubble }) {
  const problems = [];
  const label = (el) => `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)}"`;
  const alpha = (el) => {
    let a = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return 0;
      a *= Number(cs.opacity);
    }
    return a;
  };
  const srOnly = (el) => {
    const cs = getComputedStyle(el);
    return cs.clipPath !== "none" || (cs.position === "absolute" && el.offsetWidth <= 1);
  };

  const root = document.scrollingElement;
  const scrollY = root.scrollHeight - innerHeight;
  const scrollX = root.scrollWidth - innerWidth;
  if (scrollX > 1) problems.push(`sideways page scroll: ${scrollX} px`);
  if (fit && scrollY > 1) problems.push(`page scrolls: ${scrollY} px taller than the window`);

  const all = [...document.querySelectorAll("body *")].filter((el) => !el.closest("svg") && alpha(el) > 0.05 && !srOnly(el));
  for (const el of all) {
    const cs = getComputedStyle(el);
    const over = [cs.overflowX, cs.overflowY];
    const dy = el.scrollHeight - el.clientHeight;
    const dx = el.scrollWidth - el.clientWidth;
    if (el.clientHeight === 0 || el.clientWidth === 0) continue;
    if (over.some((o) => o === "auto" || o === "scroll")) {
      if (fit && (dy > 1 || dx > 1)) problems.push(`inner scroll (${Math.max(dx, dy)} px): ${label(el)}`);
      else if (fit) problems.push(`inner scroller left in the one-screen layout: ${label(el)}`);
    } else if (over.some((o) => o === "hidden" || o === "clip")) {
      // A preview that is cut on purpose (line clamp) with the full text elsewhere is not a defect.
      if (cs.webkitLineClamp !== "none" || cs.textOverflow === "ellipsis") continue;
      // Each axis on its own: content may overflow visibly one way while the other is clipped.
      const cut = (o, d) => (o === "hidden" || o === "clip") && d > 1;
      if ((cut(cs.overflowX, dx) || cut(cs.overflowY, dy)) && el.textContent.trim()) problems.push(`clipped by ${Math.max(dx, dy)} px: ${label(el)}`);
    }
  }

  // Text boxes: cut by the window, or on top of each other.
  const texts = [];
  for (const el of all) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (own.length === 0) continue;
    const box = el.getBoundingClientRect();
    for (const node of own) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const g of range.getClientRects()) {
        const r = { left: Math.max(g.left, box.left), top: Math.max(g.top, box.top), right: Math.min(g.right, box.right), bottom: Math.min(g.bottom, box.bottom) };
        if (r.right - r.left < 1 || r.bottom - r.top < 1) continue;
        texts.push({ el, r });
      }
    }
  }
  // Layers that sit over the page on purpose: what is behind them is not an overlap.
  const layer = (el) => el.closest("[role=dialog], [role=alertdialog], [role=menu], [data-assistant-bubble]");
  for (const { el, r } of texts) {
    if (el.classList.contains("skip-link")) continue; // parked off screen until focused
    if (r.left < -1 || r.right > innerWidth + 1) problems.push(`text cut by the window edge: ${label(el)}`);
    if (fit && (r.top < -1 || r.bottom > innerHeight + 1)) problems.push(`text below the window: ${label(el)}`);
  }
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el) || layer(a.el) !== layer(b.el)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      // Line boxes of neighbours may touch by a couple of pixels; glyphs do not.
      if (w > 2 && h > 4) problems.push(`text overlaps: ${label(a.el)} and ${label(b.el)}`);
    }
  }

  // The closed assistant bubble covers no control and no text.
  const bubble = document.querySelector("[data-assistant-bubble]");
  if (bubble && checkBubble) {
    const b = bubble.getBoundingClientRect();
    const hit = (r) => r.right > b.left && r.left < b.right && r.bottom > b.top && r.top < b.bottom;
    for (const { el, r } of texts) if (!bubble.contains(el) && hit(r)) problems.push(`under the assistant bubble: ${label(el)}`);
    for (const el of document.querySelectorAll("a, button, input, [role=radio], [role=button]")) {
      if (el === bubble || bubble.contains(el) || alpha(el) < 0.05) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 1 && hit(r)) problems.push(`under the assistant bubble: ${label(el)}`);
    }
  }
  return [...new Set(problems)];
}

const browser = await chromium.launch();
const requests = new Set();
const consoleErrors = new Set();
let total = 0;

for (const mode of MODES) {
  const context = await browser.newContext({ viewport: mode.viewport, deviceScaleFactor: mode.scale });
  const page = await context.newPage();
  page.on("request", (r) => requests.add(new URL(r.url()).origin));
  page.on("pageerror", (e) => consoleErrors.add(String(e)));
  page.on("console", (m) => m.type() === "error" && consoleErrors.add(m.text()));
  console.log(`\n== ${mode.name}`);
  for (const state of mode.states) {
    await visit(page, state);
    if (mode.css) {
      await page.addStyleTag({ content: mode.css });
      await page.waitForTimeout(600);
    }
    // In the scrolling modes, look at the top and at the bottom of the page.
    // A scrolling page passes under the bubble; what matters is that the end of the page clears it.
    const found = new Set(await page.evaluate(inspect, { fit: mode.fit, checkBubble: mode.fit }));
    if (!mode.fit) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(200);
      for (const p of await page.evaluate(inspect, { fit: false, checkBubble: true })) found.add(p);
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    total += found.size;
    console.log(`${found.size === 0 ? "ok  " : "FAIL"} ${state.name}${found.size ? `: ${found.size}` : ""}`);
    for (const p of [...found].slice(0, 8)) console.log(`       ${p}`);
    if (mode.shots) {
      const file = `${state.name.replace(/, /g, "-").replace(/ /g, "-")}-${mode.file ?? mode.name}.png`;
      await page.screenshot({ path: path.join(OUT, file), fullPage: !mode.fit });
    }
  }
  await context.close();
}

// Security headers, as served.
const res = await fetch(`${BASE}${ROUTES[0].path}`);
console.log("\n== response headers on /");
for (const h of ["content-security-policy", "strict-transport-security", "x-content-type-options", "referrer-policy", "x-frame-options", "permissions-policy"]) {
  console.log(`${h}: ${res.headers.get(h) ?? "MISSING"}`);
  if (!res.headers.get(h)) total++;
}

await browser.close();

const origin = new URL(BASE).origin;
const foreign = [...requests].filter((o) => o !== origin && o !== "null");
console.log("\n---- summary ----");
console.log(`origins requested while loading every route and state: ${[...requests].join(", ")}`);
console.log(foreign.length === 0 ? "third-party requests: none" : `third-party requests: ${foreign.join(", ")}`);
console.log(consoleErrors.size === 0 ? "console errors: none" : `console errors:\n  ${[...consoleErrors].join("\n  ")}`);
console.log(`layout problems: ${total}`);
const failed = total + foreign.length + consoleErrors.size;
console.log(failed === 0 ? "PASS" : "FAIL");
process.exit(failed === 0 ? 0 : 1);
