/**
 * Scripted answers for the assistant. Deterministic, no AI.
 * Every answer is a pure function of AssistantContext, 25 words or fewer.
 * Every figure comes from triage.ts, the app store or logistics.json and is
 * formatted exactly as the rest of the UI formats it. Missing data is said
 * out loud; no number is ever made up.
 *
 * PRIVACY: this module never reads Time capsule content, and nothing here is
 * stored or added to a data packet.
 */
import { ACTIONS, CARDS, type ActionId, type CardCopy } from "@/data/home";
import logistics from "@/data/logistics.json";
import { offlineCards, SENSOR_IDS, SENSORS } from "@/data/sensors";
import { eta, type ProfileId } from "@/lib/logistics";
import {
  CARD_IDS,
  CARD_METRICS,
  readinessRange,
  readinessScore,
  readinessStatus,
  STATUS_RANK,
  THRESHOLDS,
  triageCard,
  type CardId,
  type Reading,
  type Readings,
  type Status,
} from "@/lib/triage";
import type { Consent, SensorFault } from "@/store/useAppStore";
import { matchIntent, type Match } from "./intents";

export interface AssistantContext {
  /** null when no reading has arrived yet */
  readings: Readings | null;
  completedActions: readonly ActionId[];
  consent: Consent;
  sensorFault: SensorFault | null;
  /** Active resupply profile in Workshop */
  profile: ProfileId;
  /** "Now" for sensor ages, epoch ms */
  now: number;
  /** Time left to the spacewalk (EVA); null when unknown */
  evaRemainingMs: number | null;
}

export const SURGEON = "Confirm with your flight surgeon.";
export const FALLBACK = "I can answer about your readiness, sensors, and spare delivery. Try one of the suggestions.";
/** Low mood: warm, no diagnosis, an offer the person can decline. */
export const MOOD_LOW = "That sounds heavy. I'm here. Want to open a message from home?";
/** Crisis: one fixed line that points to people. Never a video, never advice. */
export const MOOD_CRISIS = "You matter. Talk to the crew surgeon or Mission control now.";
/** Any other check-in. */
export const MOOD_NOTED = "Thanks for checking in. It stays on this device.";
const NO_READINGS = "I have no live readings yet. Open Home to start them.";

/** Units as spoken words, so the voice and the subtitle say the same thing. */
const SPOKEN_UNIT: Record<CardId, string> = {
  heart_rate: "beats per minute",
  blood_pressure: "",
  glucose: "milligrams per deciliter",
  temperature: "degrees Celsius",
  sleep: "hours",
  mood: "out of 10",
};

const STATUS_PHRASE: Record<Reading, string> = {
  ok: "in range",
  caution: "in the caution band",
  act: "outside the safe range",
};

const VERDICT: Record<Reading, string> = {
  ok: "Tomorrow's spacewalk looks good.",
  caution: "Tomorrow's spacewalk is possible, with care.",
  act: "Tomorrow's spacewalk is at risk.",
};

const CONSENT_LINE: Record<Consent, string> = {
  private: "Sharing is set to Private. Nothing leaves this device.",
  doctor: "Sharing is set to My doctor only. Your flight surgeon sees your readings.",
  open: "Sharing is set to Open NASA data. Readings go out without your name.",
};

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const card = (id: CardId): CardCopy => CARDS.find((c) => c.id === id) as CardCopy;

function points(ctx: AssistantContext): number {
  return ACTIONS.filter((a) => ctx.completedActions.includes(a.id)).reduce((sum, a) => sum + a.points, 0);
}

/** "14 hours 23 minutes", whole minutes rounded up like the header countdown. */
export function durationWords(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return plural(m, "minute");
  return m === 0 ? plural(h, "hour") : `${plural(h, "hour")} ${plural(m, "minute")}`;
}

/** "3 hours ago", with the same rounding as the Workshop age label. */
export function agoWords(since: number, now: number): string {
  const min = Math.max(0, Math.round((now - since) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${plural(min, "minute")} ago`;
  return `${plural(Math.round(min / 60), "hour")} ago`;
}

/** Value as the UI shows it; blood pressure is spoken "114 over 74". */
function spokenValue(id: CardId, readings: Readings): string {
  return card(id).format(readings).replace("/", " over ");
}

function hasReading(id: CardId, readings: Readings): boolean {
  return CARD_METRICS[id].every((m) => Number.isFinite(readings[m]));
}

/** Reference range from thresholds.json: "7 to 9.5", or "90 to 125 over 60 to 85". */
function rangeWords(id: CardId): string {
  return CARD_METRICS[id]
    .map((m) => `${THRESHOLDS[m].min_green} to ${THRESHOLDS[m].max_green}`)
    .join(" over ");
}

/** The reporting card in the worst state; null when every one is in range. */
export function worstCard(readings: Readings, offline: readonly CardId[]): { id: CardId; status: Reading } | null {
  let worst: { id: CardId; status: Reading } | null = null;
  for (const id of CARD_IDS) {
    const status: Status = triageCard(id, readings, offline);
    if (status === "offline" || status === "ok" || !hasReading(id, readings)) continue;
    if (!worst || STATUS_RANK[status] > STATUS_RANK[worst.status]) worst = { id, status };
  }
  return worst;
}

function evaLine(ctx: AssistantContext): string {
  return ctx.evaRemainingMs === null ? "" : ` Spacewalk starts in ${durationWords(ctx.evaRemainingMs)}.`;
}

export function readinessAnswer(ctx: AssistantContext): string {
  if (!ctx.readings) return NO_READINGS;
  const offline = offlineCards(ctx.sensorFault);
  const score = readinessScore(ctx.readings, points(ctx), offline);
  const range = readinessRange(ctx.readings, points(ctx), offline);
  if (range) {
    return `Readiness is an estimate: ${score} of 100, between ${range.low} and ${range.high}, with one sensor offline.${evaLine(ctx)}`;
  }
  const worst = worstCard(ctx.readings, offline);
  const watch = worst ? ` Watch your ${lowerFirst(card(worst.id).name)}.` : "";
  return `You are at ${score} of 100. ${VERDICT[readinessStatus(score)]}${watch}${evaLine(ctx)}`;
}

export function whyScoreAnswer(ctx: AssistantContext): string {
  if (!ctx.readings) return NO_READINGS;
  const worst = worstCard(ctx.readings, offlineCards(ctx.sensorFault));
  if (!worst) {
    return ctx.sensorFault
      ? `No reading is out of range. The ${lowerFirst(SENSORS[ctx.sensorFault.sensor].name)} has no signal, so the score is an estimate.`
      : "Nothing is lowering your score. Every reading is in range.";
  }
  const unit = SPOKEN_UNIT[worst.id];
  const value = `${spokenValue(worst.id, ctx.readings)}${unit ? ` ${unit}` : ""}`;
  return `${card(worst.id).name} is lowering your score: ${value}, ${STATUS_PHRASE[worst.status]}. Reference: ${rangeWords(worst.id)}.`;
}

export function metricAnswer(ctx: AssistantContext, id: CardId): string {
  const name = lowerFirst(card(id).name);
  const fault = ctx.sensorFault;
  if (fault && SENSORS[fault.sensor].card === id) {
    return `There is no current ${name} reading. The ${lowerFirst(SENSORS[fault.sensor].name)} lost signal ${agoWords(fault.since, ctx.now)}.`;
  }
  if (!ctx.readings || !hasReading(id, ctx.readings)) return `I have no ${name} reading yet.`;
  const status = triageCard(id, ctx.readings) as Reading;
  const unit = SPOKEN_UNIT[id];
  const value = `${spokenValue(id, ctx.readings)}${unit ? ` ${unit}` : ""}`;
  const risk = status === "act" ? ` ${SURGEON}` : "";
  return `Your ${name} is ${value}, ${STATUS_PHRASE[status]}. Reference: ${rangeWords(id)}.${risk}`;
}

/** The pending action that helps the worst metric; otherwise the one worth most points. */
export function topAction(ctx: AssistantContext): (typeof ACTIONS)[number] | null {
  const pending = ACTIONS.filter((a) => !ctx.completedActions.includes(a.id));
  if (pending.length === 0) return null;
  const worst = ctx.readings ? worstCard(ctx.readings, offlineCards(ctx.sensorFault)) : null;
  const helps = worst ? pending.filter((a) => a.affects.includes(worst.id)) : [];
  return [...(helps.length > 0 ? helps : pending)].sort((a, b) => b.points - a.points)[0];
}

export function whatToDoAnswer(ctx: AssistantContext): string {
  const action = topAction(ctx);
  if (!action) return `You have done every recovery action for today. ${SURGEON}`;
  return `Start with this: ${lowerFirst(action.label)}. It adds ${plural(action.points, "point")} to your readiness. ${SURGEON}`;
}

export function sensorAnswer(ctx: AssistantContext): string {
  const fault = ctx.sensorFault;
  if (!fault) return `All ${SENSOR_IDS.length} sensors are active. No signal has been lost.`;
  return `Your ${lowerFirst(SENSORS[fault.sensor].name)} lost signal ${agoWords(fault.since, ctx.now)}. Readiness is an estimate until it is replaced.`;
}

export function spareAnswer(ctx: AssistantContext): string {
  const e = eta(ctx.profile);
  const simulated = logistics.profiles[ctx.profile].next_departure.simulated;
  const transit = e.note ? " No resupply is possible in transit." : "";
  return `A spare takes ${lowerFirst(e.total)} to reach ${e.destination}. This is an estimate${simulated ? ", and part of it is simulated" : ""}.${transit}`;
}

export function sharingAnswer(ctx: AssistantContext): string {
  return `${CONSENT_LINE[ctx.consent]} Your time capsule is never shared.`;
}

export const helpAnswer = () => "Ask me about your readiness, a reading like sleep or glucose, or when a spare sensor arrives.";
export const greetingAnswer = () => "Hello. I am PURA. Ask me if you are ready for tomorrow.";
export const capsuleAnswer = () => "Time capsule content stays on this device. I do not use it.";

export function answerFor(match: Match, ctx: AssistantContext): string {
  switch (match.intent) {
    case "mood_crisis":
      return MOOD_CRISIS;
    case "mood_low":
      return MOOD_LOW;
    case "capsule":
      return capsuleAnswer();
    case "readiness":
      return readinessAnswer(ctx);
    case "why_score":
      return whyScoreAnswer(ctx);
    case "metric_status":
      return match.card ? metricAnswer(ctx, match.card) : FALLBACK;
    case "what_to_do":
      return whatToDoAnswer(ctx);
    case "sensor_status":
      return sensorAnswer(ctx);
    case "spare_eta":
      return spareAnswer(ctx);
    case "sharing":
      return sharingAnswer(ctx);
    case "help":
      return helpAnswer();
    case "greeting":
      return greetingAnswer();
    case "fallback":
      return FALLBACK;
  }
}

export function answer(question: string, ctx: AssistantContext): string {
  return answerFor(matchIntent(question), ctx);
}
