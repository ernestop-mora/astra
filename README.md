# ASTRA

Health monitoring for astronauts that works for the astronaut, not on them. It
answers one question a day: can I do my job tomorrow? Built for the NASA Space
Apps Challenge 2026. Everything in it is a mock-up with simulated data.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Add `?demo=1` to any route for fixed readings and clocks.

| Route | What it is |
| --- | --- |
| `/` | Home: readiness, actions, the body with one tag per metric, the Privacy panel |
| `/capsule` | Time capsule: messages kept on this device only |
| `/workshop` | Workshop: a failed sensor, what to do meanwhile, when a spare arrives |
| `/ds` | The design system catalog |

The assistant is the round face at the bottom right of every route (key `A`).

## Checks

The audits drive a real browser against a production build:

```bash
npm run build && npx next start -p 3111   # in one terminal
npm test                                  # unit tests: assistant answers, data packets
npm run audit:a11y                        # WCAG 2.2 AA: axe, measured contrast, targets, keyboard
npm run audit:layout                      # no scroll at 1920x1080, 1366x768, 1280x720; 200% zoom; text spacing; captures
npm run audit:type                        # every computed font size against the type scale
```

They need Playwright, which is not a project dependency: install it
(`npm i -D playwright && npx playwright install chromium`), or set
`PLAYWRIGHT_PATH` to an existing install. A global `@playwright/cli` is found
on its own. Captures go to `.shots/` (ignored by git).

## Accessibility

Target: WCAG 2.2 AA. One screen without scrolling from 1280 x 720 at the default
text size; below that, at 200% zoom or with larger default text, the page
scrolls instead and nothing is cut. State is never colour alone (icon and
word). Every control works from the keyboard, including turning the 3D body.
All motion stops under `prefers-reduced-motion`.

## Privacy and security

See [SECURITY.md](SECURITY.md): what is shared at each consent level, what is
never stored, the HTTP headers, and the honest limits of the mock-up.

## The 3D body

`public/models/body.glb` is built from the Blender Studio **Human Base Meshes**
bundle (CC0, no attribution required): https://www.blender.org/download/demo-files/
The mesh used is `GEO-body_male_realistic`, subdivided once and exported with
positions and smooth normals only.

To rebuild it, put `human_base_meshes.blend` in `tools/raw/` (ignored by git) and run:

```bash
blender -b tools/raw/human_base_meshes.blend --python tools/convert-body.py
```

The same script writes `src/components/body/model.generated.ts`: the flat
silhouette used as fallback and loading state, and the surface point of each
body zone, so tags stay on their zone when the model changes.

## Stack

Next.js (App Router), React, TypeScript strict, Tailwind CSS, Zustand, Base UI,
motion, three.js with React Three Fiber. Deployed on Vercel.
