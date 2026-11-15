// Unit tests for the assistant's intents and answers. Run: npm test
import assert from "node:assert/strict";
import { register } from "node:module";
import { test } from "node:test";

register("./ts-alias-loader.mjs", import.meta.url);

const { matchIntent } = await import("@/lib/assistant/intents");
const A = await import("@/lib/assistant/answers");
const T = await import("@/lib/triage");
const { BASELINE } = await import("@/data/baseline");
const { ACTIONS, CARDS, EVA_OFFSET_MS } = await import("@/data/home");
const { eta } = await import("@/lib/logistics");

const NOW = Date.UTC(2026, 10, 14, 6, 0, 0);
const ctx = (over = {}) => ({
  readings: BASELINE,
  completedActions: [],
  consent: "private",
  sensorFault: null,
  profile: "mars",
  now: NOW,
  evaRemainingMs: EVA_OFFSET_MS,
  ...over,
});
const fault = (sensor) => ({ sensor, since: NOW - 3 * 3600_000, last: BASELINE });
const words = (s) => s.split(/\s+/).filter(Boolean).length;

test("one question per intent", () => {
  const cases = [
    ["Can I do my job tomorrow?", "readiness"],
    ["Am I ready for the EVA?", "readiness"],
    ["Am I ready for the spacewalk?", "readiness"],
    ["Why is my score low?", "why_score"],
    ["What is lowering my readiness?", "why_score"],
    ["How is my glucose?", "metric_status"],
    ["What should I do?", "what_to_do"],
    ["Is any sensor offline?", "sensor_status"],
    ["When does a spare arrive?", "spare_eta"],
    ["When will it arrive?", "spare_eta"],
    ["What is shared?", "sharing"],
    ["Who can see my data?", "sharing"],
    ["Help", "help"],
    ["What can you do?", "help"],
    ["Hello", "greeting"],
    ["Hi!", "greeting"],
    ["Read me my time capsule videos", "capsule"],
    ["Is my time capsule shared?", "capsule"],
  ];
  for (const [q, intent] of cases) assert.equal(matchIntent(q).intent, intent, q);
});

test("the suggested chips reach their intents", () => {
  assert.equal(matchIntent("Any sensor offline?").intent, "sensor_status");
  assert.equal(matchIntent("Can I do my job tomorrow?").intent, "readiness");
});

test("metric questions name the right card", () => {
  const cases = [
    ["What is my pulse?", "heart_rate"],
    ["heart rate", "heart_rate"],
    ["How is my blood pressure?", "blood_pressure"],
    ["glucose level", "glucose"],
    ["Do I have a fever? temperature", "temperature"],
    ["How did I sleep?", "sleep"],
    ["How is my stress?", "mood"],
    ["mood", "mood"],
  ];
  for (const [q, card] of cases) assert.deepEqual(matchIntent(q), { intent: "metric_status", card }, q);
});

test("nonsense falls back and never pretends", () => {
  for (const q of ["asdf qwerty", "purple monkey dishwasher", "", "???", "history of Rome"]) {
    assert.equal(matchIntent(q).intent, "fallback", q);
    assert.equal(A.answer(q, ctx()), A.FALLBACK);
  }
});

test("readiness figures match the triage engine", () => {
  const score = T.readinessScore(BASELINE, 0, []);
  const text = A.readinessAnswer(ctx());
  assert.ok(text.includes(`${score} of 100`), text);
  assert.ok(text.includes("14 hours 23 minutes"), text);
  assert.ok(text.includes("Watch your sleep"), text);

  const done = ["lights_out", "hydrate"];
  const pts = ACTIONS.filter((a) => done.includes(a.id)).reduce((s, a) => s + a.points, 0);
  const boosted = A.readinessAnswer(ctx({ completedActions: done }));
  assert.ok(boosted.includes(`${T.readinessScore(BASELINE, pts, [])} of 100`), boosted);

  const range = T.readinessRange(BASELINE, 0, ["glucose"]);
  const est = A.readinessAnswer(ctx({ sensorFault: fault("glucose") }));
  assert.ok(est.includes(`${T.readinessScore(BASELINE, 0, ["glucose"])} of 100`), est);
  assert.ok(est.includes(`between ${range.low} and ${range.high}`), est);
  assert.ok(est.includes("estimate"), est);
});

test("metric answers use the store value and the thresholds.json range", () => {
  for (const c of CARDS) {
    const text = A.metricAnswer(ctx(), c.id);
    assert.ok(text.includes(c.format(BASELINE).replace("/", " over ")), text);
    for (const m of T.CARD_METRICS[c.id]) {
      assert.ok(text.includes(`${T.THRESHOLDS[m].min_green} to ${T.THRESHOLDS[m].max_green}`), text);
    }
  }
  const high = { ...BASELINE, glucose: 150 };
  const risky = A.metricAnswer(ctx({ readings: high }), "glucose");
  assert.ok(risky.includes("150") && risky.endsWith(A.SURGEON), risky);
  assert.ok(!A.metricAnswer(ctx(), "glucose").includes(A.SURGEON));
});

test("why: the worst metric and its range", () => {
  const text = A.whyScoreAnswer(ctx());
  assert.ok(text.startsWith("Sleep is lowering your score: 6.1 hours"), text);
  assert.ok(text.includes("7 to 9.5"), text);
  const fine = { ...BASELINE, sleep_duration: 8 };
  assert.ok(A.whyScoreAnswer(ctx({ readings: fine })).startsWith("Nothing is lowering"));
});

test("action answers end with the flight surgeon line", () => {
  const text = A.whatToDoAnswer(ctx());
  assert.ok(text.includes("lights out by 21:30") && text.includes("7 points"), text);
  assert.ok(text.endsWith(A.SURGEON), text);
  const next = A.whatToDoAnswer(ctx({ completedActions: ["lights_out"] }));
  assert.ok(!next.includes("lights out") && next.endsWith(A.SURGEON), next);
});

test("sensor answers", () => {
  assert.ok(A.sensorAnswer(ctx()).startsWith("All 5 sensors are active"));
  const text = A.sensorAnswer(ctx({ sensorFault: fault("glucose") }));
  assert.equal(text, "Your glucose monitor lost signal 3 hours ago. Readiness is an estimate until it is replaced.");
  const m = A.metricAnswer(ctx({ sensorFault: fault("glucose") }), "glucose");
  assert.ok(m.includes("no current glucose reading") && !/\b94\b/.test(m), m);
});

test("spare ETA comes from logistics.json and is labelled", () => {
  for (const profile of ["iss", "moon", "mars"]) {
    const text = A.spareAnswer(ctx({ profile }));
    const e = eta(profile);
    assert.ok(text.toLowerCase().includes(e.total.toLowerCase()), text);
    assert.ok(text.includes(e.destination) && text.includes("estimate") && text.includes("simulated"), text);
    assert.equal(text.includes("No resupply is possible in transit."), profile === "mars", text);
  }
});

test("sharing states the consent level and protects the capsule", () => {
  const labels = { private: "Private", doctor: "My doctor only", open: "Open NASA data" };
  for (const [consent, label] of Object.entries(labels)) {
    const text = A.sharingAnswer(ctx({ consent }));
    assert.ok(text.includes(label) && text.includes("time capsule is never shared"), text);
  }
});

test("missing data is said, never invented", () => {
  for (const q of ["Can I do my job tomorrow?", "Why is my score low?", "How is my glucose?"]) {
    const text = A.answer(q, ctx({ readings: null }));
    assert.ok(!/\d/.test(text) && /no .*reading/i.test(text), text);
  }
  const noEva = A.readinessAnswer(ctx({ evaRemainingMs: null }));
  assert.ok(!noEva.includes("Spacewalk starts"), noEva);
});

test("every answer is 25 words or fewer", () => {
  const questions = [
    "Can I do my job tomorrow?",
    "Why?",
    "What should I do?",
    "Any sensor offline?",
    "When does a spare arrive?",
    "What is shared?",
    "help",
    "hello",
    "time capsule",
    "zzz",
    "heart",
    "blood pressure",
    "glucose",
    "temperature",
    "sleep",
    "mood",
  ];
  const act = {
    heart_rate: 130,
    systolic_bp: 160,
    diastolic_bp: 100,
    glucose: 200,
    body_temperature: 39.5,
    sleep_duration: 3.5,
    mood: 2,
  };
  const states = [ctx(), ctx({ readings: act }), ctx({ readings: null })];
  for (const sensor of ["heart", "bp", "glucose", "temp", "sleep"]) {
    states.push(ctx({ sensorFault: fault(sensor) }), ctx({ readings: act, sensorFault: fault(sensor) }));
  }
  for (const profile of ["iss", "moon"]) states.push(ctx({ profile }));
  for (const consent of ["doctor", "open"]) states.push(ctx({ consent }));
  states.push(ctx({ completedActions: ["lights_out", "hydrate", "breathing"] }));
  for (const s of states) {
    for (const q of questions) {
      const text = A.answer(q, s);
      assert.ok(words(text) <= 25, `${words(text)} words: ${text}`);
    }
  }
});

test("low-mood phrases, English and Spanish, reach mood_low", () => {
  const low = [
    "I feel down",
    "I'm sad",
    "I miss home",
    "I'm lonely",
    "rough day",
    "Had a bad day",
    "Estoy triste",
    "Extraño mi casa",
    "Me siento sola",
    "Fue un día difícil",
  ];
  for (const q of low) assert.equal(matchIntent(q).intent, "mood_low", q);
  const text = A.answer("I feel down", ctx());
  assert.equal(text, A.MOOD_LOW);
  assert.ok(words(text) <= 25, text);
  assert.ok(!/depress|anxi|diagnos|disorder/i.test(text), text);
});

test("crisis phrases outrank everything and never offer a video", () => {
  const grave = [
    "I can't go on",
    "I cant go on anymore",
    "I want to hurt myself",
    "I'm sad and I can't go on",
    "No puedo más",
    "ya no puedo",
    "quiero hacerme daño",
    "my time capsule, I can't go on",
  ];
  for (const q of grave) assert.equal(matchIntent(q).intent, "mood_crisis", q);
  const text = A.answer("I can't go on", ctx());
  assert.equal(text, A.MOOD_CRISIS);
  assert.ok(words(text) <= 25 && !/video|message from home/i.test(text), text);
});

test("mood answers never change the readiness answer", () => {
  const before = A.readinessAnswer(ctx());
  A.answer("I feel down", ctx());
  A.answer("I can't go on", ctx());
  assert.equal(A.readinessAnswer(ctx()), before);
});

test("ordinary questions are not read as mood", () => {
  for (const q of ["Why is my score low?", "How is my mood?", "Can I do my job tomorrow?", "home"]) {
    assert.ok(!["mood_low", "mood_crisis"].includes(matchIntent(q).intent), q);
  }
});
