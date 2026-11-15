/**
 * Intent recognition for the assistant. Deterministic keyword scoring, no AI.
 * The text is normalized (lowercase, no punctuation); each keyword found as
 * whole words adds its weight; the highest score wins and ties go to the
 * earlier intent in the list. Below the threshold the answer is "fallback".
 */
import type { CardId } from "@/lib/triage";

export const INTENT_IDS = [
  "mood_crisis",
  "mood_low",
  "capsule",
  "readiness",
  "why_score",
  "metric_status",
  "what_to_do",
  "sensor_status",
  "spare_eta",
  "sharing",
  "help",
  "greeting",
  "fallback",
] as const;
export type IntentId = (typeof INTENT_IDS)[number];

export interface Match {
  intent: IntentId;
  /** Set for metric_status: the metric the question names. */
  card?: CardId;
}

type Keywords = readonly (readonly [phrase: string, weight: number])[];

const MIN_SCORE = 1;

/** Phrases as people write them (accents, apostrophes), stored the way normalize() leaves them. */
const say = (weight: number, phrases: readonly string[]): Keywords => phrases.map((p) => [normalize(p), weight] as const);

/**
 * Grave phrases, English and Spanish. They outrank every other intent and only
 * ever lead to the fixed support card. This is keyword matching on what the
 * person typed or said, not detection of any kind.
 */
const CRISIS = say(1000, [
  "can't go on",
  "cant go on",
  "cannot go on",
  "can not go on",
  "hurt myself",
  "harm myself",
  "self harm",
  "kill myself",
  "end my life",
  "end it all",
  "want to die",
  "don't want to live",
  "no reason to live",
  "suicide",
  "suicidal",
  "no puedo más",
  "ya no puedo",
  "hacerme daño",
  "lastimarme",
  "matarme",
  "quitarme la vida",
  "quiero morir",
  "quiero morirme",
  "no quiero vivir",
  "suicidio",
  "suicidarme",
]);

const LOW = say(10, [
  "i feel down",
  "feeling down",
  "feel low",
  "feeling low",
  "i'm sad",
  "i am sad",
  "sad",
  "i miss home",
  "miss home",
  "miss my family",
  "homesick",
  "i'm lonely",
  "lonely",
  "rough day",
  "bad day",
  "hard day",
  "estoy triste",
  "triste",
  "me siento mal",
  "me siento solo",
  "me siento sola",
  "extraño mi casa",
  "extraño a mi familia",
  "echo de menos",
  "mal día",
  "día difícil",
  "día duro",
  "desanimado",
  "desanimada",
]);

/** Order matters: it breaks ties. A crisis phrase wins over everything; then the capsule when it is named. */
const RULES: readonly { intent: Exclude<IntentId, "fallback">; keywords: Keywords }[] = [
  { intent: "mood_crisis", keywords: CRISIS },
  { intent: "mood_low", keywords: LOW },
  { intent: "capsule", keywords: [["capsule", 100], ["time capsule", 100]] },
  {
    intent: "readiness",
    keywords: [
      ["can i do my job", 5],
      ["job tomorrow", 3],
      ["am i ready", 3],
      ["ready", 1],
      ["readiness", 2],
      ["eva", 2],
      ["spacewalk", 2],
      ["score", 1],
      ["tomorrow", 1],
    ],
  },
  {
    intent: "why_score",
    keywords: [["why", 3], ["what is lowering", 4], ["lowering", 2], ["reason", 2]],
  },
  {
    intent: "metric_status",
    keywords: [
      ["heart", 2],
      ["heart rate", 2],
      ["pulse", 2],
      ["blood pressure", 3],
      ["pressure", 2],
      ["glucose", 2],
      ["sugar", 2],
      ["temperature", 2],
      ["fever", 2],
      ["sleep", 2],
      ["slept", 2],
      ["mood", 2],
      ["stress", 2],
    ],
  },
  {
    intent: "what_to_do",
    keywords: [
      ["what should i do", 4],
      ["what can i do", 4],
      ["should i do", 2],
      ["action", 2],
      ["recommend", 2],
      ["improve", 2],
    ],
  },
  {
    intent: "sensor_status",
    keywords: [["sensor", 2], ["sensors", 2], ["offline", 2], ["broken", 2], ["signal", 2], ["not working", 2]],
  },
  {
    intent: "spare_eta",
    keywords: [
      ["spare", 3],
      ["replacement", 3],
      ["when will it arrive", 4],
      ["arrive", 2],
      ["delivery", 3],
      ["resupply", 3],
    ],
  },
  {
    intent: "sharing",
    keywords: [
      ["what is shared", 3],
      ["shared", 2],
      ["share", 2],
      ["sharing", 2],
      ["who can see", 3],
      ["privacy", 3],
      ["private", 2],
      ["consent", 2],
    ],
  },
  { intent: "help", keywords: [["help", 2], ["what can you do", 5]] },
  { intent: "greeting", keywords: [["hello", 1], ["hi", 1], ["hey", 1], ["good morning", 2]] },
];

/** Which metric a question names. First match wins; longer phrases go first. */
const CARD_WORDS: readonly (readonly [phrase: string, card: CardId])[] = [
  ["blood pressure", "blood_pressure"],
  ["pressure", "blood_pressure"],
  ["heart", "heart_rate"],
  ["pulse", "heart_rate"],
  ["glucose", "glucose"],
  ["sugar", "glucose"],
  ["temperature", "temperature"],
  ["fever", "temperature"],
  ["sleep", "sleep"],
  ["slept", "sleep"],
  ["mood", "mood"],
  ["stress", "mood"],
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const has = (padded: string, phrase: string) => padded.includes(` ${phrase} `);

export function matchIntent(text: string): Match {
  const padded = ` ${normalize(text)} `;
  let best: Match = { intent: "fallback" };
  let bestScore = MIN_SCORE - 1;
  for (const rule of RULES) {
    const score = rule.keywords.reduce((sum, [phrase, weight]) => sum + (has(padded, phrase) ? weight : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = { intent: rule.intent };
    }
  }
  if (best.intent === "metric_status") {
    const card = CARD_WORDS.find(([phrase]) => has(padded, phrase))?.[1];
    return card ? { intent: "metric_status", card } : { intent: "fallback" };
  }
  return best;
}
