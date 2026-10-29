"use client";

import type { Phrase } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { Eyebrow } from "./Eyebrow";
import { SpeakButton } from "./SpeakButton";

/**
 * Pinned repair phrases on the home screen.
 *
 * Deliberately denser than PhraseCard: this is for the moment a conversation
 * stalls, so all eight fit on one phone screen with Spanish, pronunciation and
 * a speak button visible without a tap. No literal or cultural note — those
 * belong on the full card, not here.
 *
 * Not in the Stamp blues Figma frames (it shipped after them); styled to match
 * the outlined tiles and the eyebrow-only section headings there.
 */
export function EssentialPhrases({ phrases }: { phrases: Phrase[] }) {
  const { speak, speakingId, supported } = useSpeech();

  return (
    <section aria-labelledby="essentials" className="space-y-[18px]">
      <Eyebrow as="h2" id="essentials">
        When you&apos;re stuck
      </Eyebrow>

      <ul className="divide-y divide-hairline rounded-card border border-ink">
        {phrases.map((phrase) => {
          const language = phrase.targetLanguage ?? "es";
          return (
            <li key={phrase.id} className="flex items-center gap-3 px-[18px] py-3 text-ink">
              <div className="min-w-0 flex-1">
                <p lang={language} className="text-[15px] leading-5 font-bold">
                  {phrase.natural}
                </p>
                <p className="text-[13px] leading-[18px]">{phrase.sourceText}</p>
                <p className="font-display text-[14px] leading-5 font-light">
                  {phrase.pronunciation}
                </p>
              </div>
              <SpeakButton
                className="size-10"
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
