"use client";

import { showsDraftNotice } from "@/lib/review";
import type { Phrase } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { DraftNotice } from "./DraftNotice";
import { SaveButton } from "./SaveButton";
import { ShowTrigger } from "./ShowTrigger";
import { SpeakButton } from "./SpeakButton";

/**
 * One phrase in the list. The look is editorial; the interaction is fast
 * (SPEC.md §5) — everything needed at a counter is visible without a tap.
 *
 * `natural` leads because it is what a native speaker would actually say.
 * `literal` only appears when it differs, so the card does not repeat itself.
 */
export function PhraseCard({
  phrase,
  draftNotice = showsDraftNotice(phrase),
}: {
  phrase: Phrase;
  /** Show the "still a draft" marker. Defaults to the phrase's own flag; the vault passes it for saved copies. */
  draftNotice?: boolean;
}) {
  const { speak, speakingId, supported } = useSpeech();
  const showLiteral = phrase.literal !== phrase.natural;
  // Absent on all 42 presets (always Spanish); translation results are
  // bidirectional, so an es->en result must not be read or marked as Spanish.
  const language = phrase.targetLanguage ?? "es";

  return (
    <article className="rounded-card border border-hairline bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-small min-w-0 text-muted">{phrase.sourceText}</p>
            {/* High-stakes text no fluent speaker has checked yet (SPEC.md §14). */}
            {draftNotice && <DraftNotice className="-my-1.5" />}
          </div>
          {/* The phrase is the control: tap it to show it full screen. */}
          <ShowTrigger phrase={phrase}>
            <span lang={language} className="text-h2 block text-ink">
              {phrase.natural}
            </span>
            <span className="text-small mt-1 block text-muted italic">{phrase.pronunciation}</span>
          </ShowTrigger>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <SpeakButton
            onSpeak={() => speak(phrase.id, phrase.natural, language)}
            isSpeaking={speakingId === phrase.id}
            supported={supported}
            label={phrase.natural}
          />
          <SaveButton phrase={phrase} />
        </div>
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
