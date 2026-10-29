"use client";

import { categoryLabel } from "@/lib/labels";
import type { Phrase } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { SaveButton } from "./SaveButton";
import { SpeakButton } from "./SpeakButton";

/**
 * A translation result (Figma: Language App › "Stamp blues palette · A Light
 * editorial · Translate result"): the mint card with labelled Natural /
 * Literal / Pronunciation blocks and a dashed cultural-note box, then the
 * action row — outlined speak button and the "Save to vault" pill.
 *
 * Literal is shown only when it differs from natural, same rule as PhraseCard,
 * so the card never repeats itself.
 */
export function TranslationResult({ phrase }: { phrase: Phrase }) {
  const { speak, speakingId, supported } = useSpeech();
  // Absent on presets (always Spanish); translation results are bidirectional.
  const language = phrase.targetLanguage ?? "es";
  const direction = language === "es" ? "EN → ES" : "ES → EN";
  const showLiteral = phrase.literal !== phrase.natural;

  return (
    <div className="space-y-[18px]">
      <article className="flex flex-col gap-3.5 rounded-card bg-sand p-[22px] text-ink">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-ink px-[11px] py-[5px] text-[11px] font-semibold">
            {categoryLabel(phrase.category)}
          </span>
          <span className="text-[11px] font-semibold tracking-[0.1em]" aria-label={`Translated ${direction.replace("→", "to")}`}>
            {direction}
          </span>
        </div>

        <ResultBlock label="Natural">
          <p lang={language} className="text-[28px] leading-8 font-bold">
            {phrase.natural}
          </p>
        </ResultBlock>

        {showLiteral && (
          <ResultBlock label="Literal">
            <p lang={language} className="text-[15px] leading-[22px]">
              {phrase.literal}
            </p>
          </ResultBlock>
        )}

        {phrase.pronunciation && (
          <ResultBlock label="Pronunciation">
            <p className="font-display text-[17px] leading-6 font-light">{phrase.pronunciation}</p>
          </ResultBlock>
        )}

        {phrase.culturalNote && (
          <div className="flex flex-col gap-1 rounded-2xl border border-dashed border-ink p-3.5 text-[13px]">
            <p className="font-bold">Cultural note</p>
            <p className="leading-[19px]">{phrase.culturalNote}</p>
          </div>
        )}
      </article>

      <div className="flex items-center gap-2.5">
        <SpeakButton
          className="size-13"
          onSpeak={() => speak(phrase.id, phrase.natural, language)}
          isSpeaking={speakingId === phrase.id}
          supported={supported}
          label={phrase.natural}
        />
        <SaveButton phrase={phrase} variant="pill" />
      </div>
    </div>
  );
}

function ResultBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase">{label}</p>
      {children}
    </div>
  );
}
