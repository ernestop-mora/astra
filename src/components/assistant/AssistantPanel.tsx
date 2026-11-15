"use client";

import { CircleHelp, Mic, Volume2, VolumeX, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, GlassPanel } from "@/components/ds";
import { useAssistantStore, type AssistantState } from "@/store/useAssistantStore";
import { AssistantFace } from "./AssistantFace";
import { SUGGESTIONS, useAssistant } from "./AssistantProvider";
import { useSpeechSupport } from "./useSpeech";

const STATE_TEXT: Record<AssistantState, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

const VOICE_NOTICE = "Voice input uses your browser's speech service.";
/** A press longer than this is "hold to talk": releasing sends. */
const HOLD_MS = 400;

const FIGURE = /^(\d[\d.,:]*\d|\d)(\D*)$/;

/** Denser than the base glass: the panel floats over busy content. */
const PANEL_BG = "color-mix(in srgb, var(--navy) 90%, transparent)";

const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-cyan";

function IconButton({
  icon: Icon,
  label,
  ...props
}: { icon: LucideIcon; label: string } & React.ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex size-9 cursor-pointer items-center justify-center rounded-full text-slate transition-colors duration-150 hover:bg-cream/5 hover:text-cream ${FOCUS}`}
      {...props}
    >
      <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}

/** Words on screen so far; every figure is set in DM Mono. */
function Subtitle({ text, shown }: { text: string; shown: number }) {
  const words = text.split(/\s+/).filter(Boolean).slice(0, shown);
  return (
    <>
      {words.map((w, i) => {
        // Only the figure itself is mono; punctuation and spacing stay in the text face.
        const m = FIGURE.exec(w);
        return (
          <span key={i}>
            {m ? (
              <>
                <span className="font-mono">{m[1]}</span>
                {m[2]}
              </>
            ) : (
              w
            )}{" "}
          </span>
        );
      })}
    </>
  );
}

/** The open assistant: face, live subtitles, voice and text input, suggestions. */
export function AssistantPanel() {
  const state = useAssistantStore((s) => s.assistantState);
  const mouth = useAssistantStore((s) => s.mouth);
  const muted = useAssistantStore((s) => s.muted);
  const subtitle = useAssistantStore((s) => s.subtitle);
  const shownWords = useAssistantStore((s) => s.shownWords);
  const subtitleVisible = useAssistantStore((s) => s.subtitleVisible);
  const draft = useAssistantStore((s) => s.draft);
  const voiceNotice = useAssistantStore((s) => s.voiceNotice);
  const micDenied = useAssistantStore((s) => s.micDenied);
  const setStore = useAssistantStore((s) => s.set);
  const { ask, startListening, stopListening, toggleMute, close } = useAssistant();
  const support = useSpeechSupport();
  const [help, setHelp] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const press = useRef({ at: 0, started: false });
  const listening = state === "listening";

  useEffect(() => panel.current?.focus(), []);

  return (
    <GlassPanel
      ref={panel}
      role="dialog"
      aria-label="Assistant"
      tabIndex={-1}
      data-assistant-panel=""
      style={{ background: PANEL_BG }}
      className="fixed right-6 bottom-6 z-40 flex max-h-[calc(100dvh-11rem)] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-y-auto p-4 outline-none"
    >
      <div className="flex items-center gap-1">
        <h2 className="flex-1 text-sm font-medium text-cream">Assistant</h2>
        <IconButton icon={CircleHelp} label="Help" aria-expanded={help} onClick={() => setHelp((h) => !h)} />
        <IconButton
          icon={muted ? VolumeX : Volume2}
          label={muted ? "Unmute voice" : "Mute voice"}
          aria-pressed={muted}
          onClick={toggleMute}
        />
        <IconButton icon={X} label="Close assistant" onClick={close} />
      </div>

      <div className="flex flex-col items-center">
        <AssistantFace state={state} mouth={mouth} size={120} />
        <p role="status" className="mt-1 text-xs text-cream/70">
          {STATE_TEXT[state]}
        </p>
      </div>

      {/* Live subtitles: at most three lines, word by word. Read out once, whole. */}
      <p
        aria-hidden="true"
        data-assistant-subtitle=""
        className={`mt-2 line-clamp-3 min-h-[4.5rem] text-center text-base leading-6 text-cream transition-opacity duration-500 ${
          subtitleVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <Subtitle text={subtitle} shown={shownWords} />
      </p>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {subtitle}
      </p>

      {support.recognition ? (
        <Button
          className="mt-3 w-full"
          aria-pressed={listening}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            press.current = { at: e.timeStamp, started: !listening };
            if (!listening) startListening();
          }}
          onPointerUp={(e) => {
            // A second tap stops; so does releasing after a long hold.
            if (!press.current.started || e.timeStamp - press.current.at > HOLD_MS) stopListening();
          }}
          onClick={(e) => {
            // Keyboard activation: toggle.
            if (e.detail !== 0) return;
            if (listening) stopListening();
            else startListening();
          }}
        >
          <Mic size={16} strokeWidth={1.5} aria-hidden="true" />
          {listening ? "Tap to send" : "Hold to talk"}
        </Button>
      ) : (
        <p className="mt-3 text-xs text-cream/70">Voice input is not available in this browser.</p>
      )}
      {voiceNotice && !help && <p className="mt-2 text-xs text-cream/70">{VOICE_NOTICE}</p>}
      {micDenied && (
        <p role="alert" className="mt-2 flex items-center gap-2 text-xs text-cream">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-amber" />
          Microphone access is blocked. You can still type.
        </p>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <input
          type="text"
          aria-label="Question"
          placeholder="Type a question"
          autoComplete="off"
          value={draft}
          onChange={(e) => setStore({ draft: e.target.value })}
          className={`h-10 min-w-0 flex-1 rounded-field border border-rule bg-navy/40 px-3 text-sm text-cream placeholder:text-slate ${FOCUS}`}
        />
        <Button type="submit" variant="quiet" disabled={draft.trim() === ""}>
          Ask
        </Button>
      </form>

      <ul aria-label="Suggested questions" className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => ask(s.text)}
              className={`h-8 cursor-pointer rounded-pill border border-rule px-3 text-xs text-cream transition-colors duration-150 hover:border-cyan-line hover:bg-cyan-soft ${FOCUS}`}
            >
              {s.text}
            </button>
          </li>
        ))}
      </ul>

      {help && (
        <ul className="mt-4 flex flex-col gap-1.5 border-t border-rule pt-3 text-xs text-cream/70">
          <li>{VOICE_NOTICE}</li>
          <li>Conversations are not saved.</li>
          <li>
            Keys: <span className="font-mono text-cream">A</span> opens or closes,{" "}
            <span className="font-mono text-cream">Esc</span> closes,{" "}
            <span className="font-mono text-cream">Enter</span> sends.
          </li>
        </ul>
      )}
    </GlassPanel>
  );
}
