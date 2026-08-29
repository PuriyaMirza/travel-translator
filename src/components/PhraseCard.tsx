"use client";

import type { Phrase } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { SpeakButton } from "./SpeakButton";

/**
 * One phrase in the list. The look is editorial; the interaction is fast
 * (SPEC.md §5) — everything needed at a counter is visible without a tap.
 *
 * `natural` leads because it is what a native speaker would actually say.
 * `literal` only appears when it differs, so the card does not repeat itself.
 */
export function PhraseCard({ phrase }: { phrase: Phrase }) {
  const { speak, speakingId, supported } = useSpeech();
  const showLiteral = phrase.literal !== phrase.natural;
  // Absent on all 42 presets (always Spanish); translation results are
  // bidirectional, so an es->en result must not be read or marked as Spanish.
  const language = phrase.targetLanguage ?? "es";

  return (
    <article className="rounded-card border border-hairline bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-small text-muted">{phrase.sourceText}</p>
          <p lang={language} className="text-h2 mt-1 text-ink">
            {phrase.natural}
          </p>
          <p className="text-small mt-1 text-muted italic">{phrase.pronunciation}</p>
        </div>

        <SpeakButton
          onSpeak={() => speak(phrase.id, phrase.natural, language)}
          isSpeaking={speakingId === phrase.id}
          supported={supported}
          label={phrase.natural}
        />
      </div>

      {(showLiteral || phrase.culturalNote) && (
        <div className="mt-4 space-y-2 border-t border-hairline pt-4">
          {showLiteral && (
            <p className="text-small text-muted">
              <span className="text-ink">More formal:</span>{" "}
              <span lang={language}>{phrase.literal}</span>
            </p>
          )}
          {phrase.culturalNote && (
            <p className="text-small text-muted">{phrase.culturalNote}</p>
          )}
        </div>
      )}
    </article>
  );
}
