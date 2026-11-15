// Shared by the audit scripts: finds Playwright and lists the routes to visit.
// Playwright is not a project dependency. It is resolved from node_modules when
// installed, else from PLAYWRIGHT_PATH, else from a global @playwright/cli.
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

export function loadPlaywright() {
  const candidates = ["playwright", process.env.PLAYWRIGHT_PATH];
  try {
    const root = execSync("npm root -g", { encoding: "utf8" }).trim();
    candidates.push(path.join(root, "@playwright/cli/node_modules/playwright"), path.join(root, "playwright"));
  } catch {
    // no global npm: the first two candidates still apply
  }
  for (const c of candidates.filter(Boolean)) {
    try {
      return require(c);
    } catch {
      // try the next one
    }
  }
  throw new Error("Playwright not found. Install it or set PLAYWRIGHT_PATH.");
}

export const BASE = process.env.BASE || "http://localhost:3111";

/** Every route, always with ?demo=1 so readings and clocks are fixed. */
export const ROUTES = [
  { name: "home", path: "/?demo=1" },
  { name: "capsule", path: "/capsule?demo=1" },
  { name: "workshop", path: "/workshop?demo=1&still=1" },
  { name: "ds", path: "/ds?demo=1" },
];

/** Routes plus the states that change what is on screen. */
export const STATES = [
  ...ROUTES.flatMap((r) => [
    { name: `${r.name}, assistant closed`, path: r.path },
    { name: `${r.name}, assistant open`, path: `${r.path}&assistant=open`, wait: "[data-assistant-panel]" },
  ]),
  ...["type", "buttons", "switch", "rows", "tags", "data"].map((s) => ({ name: `ds, ${s}`, path: `/ds?demo=1&section=${s}` })),
  { name: "home, zone panel", path: "/?demo=1&open=heart", wait: "[role=dialog]" },
  { name: "home, privacy panel", path: "/?demo=1&open=privacy", wait: "[role=dialog]" },
];

export async function visit(page, state) {
  await page.goto(BASE + state.path);
  if (state.wait) await page.waitForSelector(state.wait, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1800);
}
