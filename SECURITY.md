# Security and privacy

ASTRA is a mock-up built for the NASA Space Apps Challenge 2026. This page says
what the app does with data today, checked against the code, and where the
mock-up stops. It makes no compliance claim (no HIPAA, no GDPR certification)
and it does not encrypt anything itself.

## Data model

| Data | Where it comes from | Where it lives | Leaves the device |
| --- | --- | --- | --- |
| Health readings (heart rate, blood pressure, glucose, temperature, sleep, mood) | Simulated in the browser (`src/lib/simulator.ts`), seeded from `src/data/baseline.ts` | Memory only, for the open tab (`src/store/useAppStore.ts`) | No |
| Readiness score, completed actions, consent choice, sensor fault | Computed in the browser (`src/lib/triage.ts`) | Memory only | No |
| Crew identity (simulated name and crew ID) | `src/data/baseline.ts` | Memory only | No. Only a coded ID derived from it appears in a packet preview |
| Time capsule files and notes | Added by the user | IndexedDB in this browser (`src/lib/capsule/repo.ts`) | No, under any consent level |
| Assistant questions and answers | Typed or spoken by the user | Memory only (`src/store/useAssistantStore.ts`) | No. See "Voice input" below |

All health data is simulated. There is no account, no login, no backend, no
database and no storage server. Nothing is transmitted: the Privacy panel shows
the packet that *would* leave the device for the chosen level, built by
`src/lib/packet.ts`.

## What each consent level shares

Built by `buildPacket` in `src/lib/packet.ts` and covered by
`scripts/packet.test.mjs`.

| Field | Private | My doctor only | Open NASA data |
| --- | --- | --- | --- |
| Packet | none | yes | yes |
| Recipient | - | Your doctor | NASA open data |
| Who | - | Coded ID (pseudonym) | Nothing |
| Name, crew ID | never | never | never |
| Time of reading | - | Exact, to the second | Rounded down to the hour |
| Six readings | - | Yes; an offline metric is sent as "No signal" | Yes; an offline metric is left out |
| Sensor status | - | Yes | No |
| Time capsule | never | never | never |
| Assistant conversation | never | never | never |
| Readiness score, actions | never | never | never |

The coded ID is a pseudonym, not anonymity: whoever holds the table that maps
it to a person can identify them. In this mock-up it is a plain hash of the
simulated crew ID. A real system would issue a random or keyed code from
medical operations.

Two ESLint rules (`eslint.config.mjs`) fail the build if `packet.ts`,
`PacketContent.tsx` or `useAppStore.ts` import anything from the Time capsule
or from the assistant.

## What is not stored

- No health reading is written to `localStorage`, `sessionStorage`, cookies or IndexedDB.
- No health reading is put in a URL. Query parameters (`?demo=1`, `?open=`, `?fail=`, `?profile=`, `?section=`) select a view or a simulated fault; none carries a value.
- The app writes nothing to the console and has no logging or error-reporting service.
- Assistant conversations are not saved. They are gone when the tab closes or reloads.
- Time capsule files stay in IndexedDB in this browser until the user deletes them. `?demo=1` entries are metadata only and are never written.

A repository search for `localStorage`, `sessionStorage`, `document.cookie`,
`console.`, `fetch(`, `XMLHttpRequest` and `sendBeacon` under `src/` finds
nothing. The only storage call is `indexedDB.open` in `src/lib/capsule/repo.ts`.

## No third parties

- No analytics, no tag manager, no error reporting, no ads, no embedded content.
- Fonts (Space Grotesk, DM Mono) are self-hosted by `next/font`; the browser never contacts Google Fonts.
- The 3D body is `public/models/body.glb`, served from this origin and loaded without WebAssembly decoders.
- `scripts/layout.mjs` loads every route and state and records each request: all of them go to the app's own origin.
- Links to NASA and other sources open only when the user clicks them, with `rel="noreferrer"`.

## HTTP headers

Set for every route in `next.config.ts`:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `microphone=(self)`; camera, geolocation, payment, USB, Bluetooth, serial, HID, MIDI, motion sensors, screen capture, wake lock, XR and topics are all `()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

Notes on the policy:

- There is no `'unsafe-eval'` in production. The development server adds it, and a WebSocket source for hot reload, because React's debugging tools need them.
- `script-src` and `style-src` allow `'unsafe-inline'`. The pages are prerendered static HTML that Next.js boots with inline scripts, and the animation library sets inline styles. Removing it needs a per-request nonce, which means rendering every page on a server. That is a known gap.
- `media-src` and `img-src` allow `blob:` so the Time capsule can show the user's own files from IndexedDB. No remote media is allowed.
- `Strict-Transport-Security` only takes effect over HTTPS (it does on Vercel; browsers ignore it on `http://localhost`).

Check locally:

```bash
npm run build && npx next start -p 3111
curl -I http://localhost:3111/
```

## Honest limits of the mock-up

- **Simulated data.** Every reading, the crew identity, the delivery estimate and the "report to mission control" are simulated. Nothing is medical advice.
- **No storage server.** There is nowhere for a packet to go. The consent levels are implemented as what the packet contains, not as a transmission.
- **No encryption by the app.** Data in memory and in IndexedDB is not encrypted by ASTRA. Transport encryption is whatever the host provides (HTTPS on Vercel).
- **Voice input may use a cloud service.** Speech recognition is the browser's own (`SpeechRecognition`). In Chrome and Edge the audio is sent to the browser vendor's speech service to be transcribed; ASTRA never receives or stores the audio. The panel says so before the first use, and typing always works instead. Spoken answers use the browser's built-in speech synthesis.
- **Shared device.** Anyone with access to this browser profile can open the Time capsule. There is no lock screen or passcode.
- **Pseudonym, not anonymity.** See above. Open data with readings rounded to the hour can still be re-identified in a crew of a few people; a real release would need aggregation and review.
- **Inline scripts are allowed by the CSP**, as explained above.

## Reporting a problem

Open an issue in the repository with the steps to reproduce. Do not include real health data.
