import type { Phrase } from "@/lib/types";
import { PhraseCard } from "./PhraseCard";
import { Eyebrow } from "./Eyebrow";

export function DailyPhraseCard({ phrase }: { phrase: Phrase }) {
  return (
    <section aria-labelledby="daily-phrase">
      <Eyebrow>Phrase of the day</Eyebrow>
      <h2 id="daily-phrase" className="sr-only">
        Phrase of the day
      </h2>
      <div className="mt-3">
        <PhraseCard phrase={phrase} />
      </div>
    </section>
  );
}
