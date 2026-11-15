// Data minimisation: what each consent level puts in a packet. Run: npm test
import assert from "node:assert/strict";
import { register } from "node:module";
import { test } from "node:test";

register("./ts-alias-loader.mjs", import.meta.url);

const { buildPacket, pseudonym, formatStamp } = await import("@/lib/packet");
const { BASELINE, CREW } = await import("@/data/baseline");

const AT = Date.UTC(2026, 10, 14, 6, 42, 17);
const FAULT = { sensor: "glucose", since: AT - 3 * 3_600_000, last: BASELINE };
const text = (p) => JSON.stringify(p);

test("private builds no packet", () => {
  assert.deepEqual(buildPacket("private", BASELINE, AT, CREW, FAULT), { kind: "none" });
});

test("no level ever carries the name or the crew ID", () => {
  for (const level of ["doctor", "open"]) {
    const p = text(buildPacket(level, BASELINE, AT, CREW, FAULT));
    assert.ok(!p.includes(CREW.name), `${level}: name`);
    assert.ok(!p.includes(CREW.id), `${level}: crew id`);
  }
});

test("doctor: pseudonym, exact time, six readings, sensor status", () => {
  const p = buildPacket("doctor", BASELINE, AT, CREW, FAULT);
  assert.equal(p.kind, "shared");
  assert.equal(p.pseudonym, pseudonym(CREW));
  assert.match(p.pseudonym, /^P-[0-9A-F]{6}$/);
  assert.equal(p.timestamp, AT);
  assert.equal(p.precision, "second");
  assert.equal(p.rows.length, 6);
  assert.equal(p.rows.find((r) => r.name === "Glucose").value, "No signal");
  assert.equal(p.sensors.filter((s) => !s.online).length, 1);
});

test("open: no identifier, time rounded to the hour, no sensors", () => {
  const p = buildPacket("open", BASELINE, AT, CREW, FAULT);
  assert.equal(p.kind, "shared");
  assert.equal(p.pseudonym, null);
  assert.equal(p.sensors, null);
  assert.equal(p.timestamp, Date.UTC(2026, 10, 14, 6, 0, 0));
  assert.equal(p.precision, "hour");
  assert.equal(formatStamp(p.timestamp, p.precision), "14 Nov 2026, 06:00 GMT");
  // The offline metric is left out, so the packet does not reveal sensor health.
  assert.equal(p.rows.length, 5);
  assert.ok(!text(p).includes("No signal") && !text(p).includes("offline"));
  assert.equal(buildPacket("open", BASELINE, AT, CREW, null).rows.length, 6);
});

test("a packet has only the documented fields", () => {
  const allowed = ["kind", "level", "recipient", "pseudonym", "timestamp", "precision", "rows", "sensors"];
  for (const level of ["doctor", "open"]) {
    const p = buildPacket(level, BASELINE, AT, CREW, FAULT);
    assert.deepEqual(Object.keys(p).sort(), [...allowed].sort());
    for (const r of p.rows) assert.deepEqual(Object.keys(r).sort(), ["name", "unit", "value"]);
  }
});

test("no mood check-in, time capsule or chat field reaches a packet at any level", async () => {
  const { useMoodStore } = await import("@/store/useMoodStore");
  const { MOODS } = await import("@/lib/mood");
  const A = await import("@/lib/assistant/answers");
  const { SEALED, VIDEO, VOICE } = await import("@/lib/capsule/lowMood");
  const { DEMO_ITEMS } = await import("@/lib/capsule/demo");
  const { CARDS } = await import("@/data/home");

  const keys = (v, out = []) => {
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        out.push(k);
        keys(x, out);
      }
    }
    return out;
  };
  const strings = (v, out = []) => {
    if (typeof v === "string") out.push(v);
    else if (v && typeof v === "object") for (const x of Object.values(v)) strings(x, out);
    return out;
  };
  const forbiddenText = [
    ...MOODS.map((m) => m.label),
    A.MOOD_LOW,
    A.MOOD_CRISIS,
    A.MOOD_NOTED,
    VIDEO.label,
    VIDEO.title,
    VOICE.transcript,
    ...VIDEO.captions.map(([, c]) => c),
    ...SEALED.map((s) => s.condition),
    ...DEMO_ITEMS.flatMap((i) => [i.name, i.note].filter(Boolean)),
  ];

  const states = [
    () => useMoodStore.getState().setMood(null),
    () => useMoodStore.getState().setMood("very_low"),
    () => useMoodStore.getState().setMood("low"),
    () => useMoodStore.getState().setCrisis(true),
  ];
  const reference = {};
  for (const level of ["private", "doctor", "open"]) reference[level] = text(buildPacket(level, BASELINE, AT, CREW, FAULT));

  for (const apply of states) {
    apply();
    for (const level of ["private", "doctor", "open"]) {
      const p = buildPacket(level, BASELINE, AT, CREW, FAULT);
      // The mood check-in has no way in: the packet is identical whatever was chosen.
      assert.equal(text(p), reference[level], `${level}: changed with the check-in`);
      for (const k of keys(p)) assert.ok(!/mood|check.?in|capsule|chat|assistant|crisis|question|answer/i.test(k), `${level}: key ${k}`);
      // The only "Mood" in a packet is the simulated 1-10 reading row, named like its card.
      for (const s of strings(p)) {
        for (const f of forbiddenText) {
          if (f === "Low" || f === "Good" || f === "Okay" || f === "Great") assert.notEqual(s, f, `${level}: ${s}`);
          else assert.ok(!s.includes(f), `${level}: "${f}" in ${s}`);
        }
      }
      if (p.kind === "shared") for (const r of p.rows) assert.ok(CARDS.some((c) => c.name === r.name), `${level}: row ${r.name}`);
    }
  }
  useMoodStore.getState().setMood(null);
});

test("packet.ts imports nothing from the mood check-in, the capsule or the assistant", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../src/lib/packet.ts", import.meta.url), "utf8");
  const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
  for (const i of imports) assert.ok(!/mood|capsule|assistant/i.test(i), i);
});
