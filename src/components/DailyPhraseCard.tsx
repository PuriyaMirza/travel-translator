"use client";

import type { Phrase } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { SpeakButton } from "./SpeakButton";

/**
 * The phrase of the day: the mint feature card on home (Stamp blues design).
 *
 * Spanish leads, English under it, pronunciation in the display italic beside
 * a filled speak button. No save button here — the design has none, and the
 * phrase can be saved from its category page.
 *
 * `date` is passed in already formatted so server and client render the same
 * string (the page is static and regenerated hourly).
 */
export function DailyPhraseCard({ phrase, date }: { phrase: Phrase; date: string }) {
  const { speak, speakingId, supported } = useSpeech();
  const language = phrase.targetLanguage ?? "es";

  return (
    <section
      aria-labelledby="daily-phrase"
      className="flex flex-col gap-2 rounded-card bg-sand p-[22px] text-ink"
    >
      <div className="flex items-center justify-between text-[11px] leading-normal">
        <h2 id="daily-phrase" className="font-semibold tracking-[0.14em] uppercase">
          (01) Daily phrase
        </h2>
        <p className="font-medium tracking-[0.06em]">{date}</p>
      </div>

      <p lang={language} className="text-[26px] leading-[30px] font-bold">
        {phrase.natural}
      </p>
      <p className="text-small">{phrase.sourceText}</p>

      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 font-display text-[15px] font-light">
          {phrase.pronunciation}
        </p>
        <SpeakButton
          tone="solid"
          className="size-[42px]"
          onSpeak={() => speak(phrase.id, phrase.natural, language)}
          isSpeaking={speakingId === phrase.id}
          supported={supported}
          label={phrase.natural}
        />
      </div>
    </section>
  );
}
