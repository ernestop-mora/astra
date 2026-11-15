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
