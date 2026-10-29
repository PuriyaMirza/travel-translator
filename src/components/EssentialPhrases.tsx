"use client";

import type { Phrase } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { Eyebrow } from "./Eyebrow";
import { SpeakButton } from "./SpeakButton";

/**
 * Pinned repair phrases at the top of the home screen.
 *
 * Deliberately denser than PhraseCard: this is for the moment a conversation
 * stalls, so all eight fit on one phone screen with Spanish, pronunciation and
 * a speak button visible without a tap. No literal or cultural note — those
 * belong on the full card, not here.
 */
export function EssentialPhrases({ phrases }: { phrases: Phrase[] }) {
  const { speak, speakingId, supported } = useSpeech();

  return (
    <section aria-labelledby="essentials">
      <Eyebrow>Essentials</Eyebrow>
      <h2 id="essentials" className="text-h1 mt-2 mb-4 font-display text-ink">
        When you&apos;re stuck
      </h2>

      <ul className="divide-y divide-hairline rounded-card border border-hairline bg-card shadow-soft">
        {phrases.map((phrase) => {
          const language = phrase.targetLanguage ?? "es";
          return (
            <li key={phrase.id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-small text-muted">{phrase.sourceText}</p>
                <p lang={language} className="text-body-bold text-ink">
                  {phrase.natural}
                </p>
                <p className="text-small text-muted italic">{phrase.pronunciation}</p>
              </div>
              <SpeakButton
                onSpeak={() => speak(phrase.id, phrase.natural, language)}
                isSpeaking={speakingId === phrase.id}
                supported={supported}
                label={phrase.natural}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
