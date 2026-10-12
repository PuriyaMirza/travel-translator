"use client";

import { SPEAKER_GENDER_LABELS } from "@/lib/labels";
import { useSpeakerGender } from "@/lib/local/settings";
import { SPEAKER_GENDERS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./Eyebrow";

/** The speaker-gender setting (SPEC.md §12), in the nav drawer. */
export function SpeakerGenderControl() {
  const { speakerGender, setSpeakerGender } = useSpeakerGender();

  return (
    <div className="mt-6">
      <Eyebrow tone="muted" className="mb-1">
        Speaker
      </Eyebrow>
      <p id="speaker-gender-help" className="text-small mb-3 text-muted">
        How Spanish should refer to you. Neutral avoids gendered endings where it can.
      </p>
      <div role="radiogroup" aria-describedby="speaker-gender-help" aria-label="Speaker gender" className="flex gap-2">
        {SPEAKER_GENDERS.map((gender) => (
          <button
            key={gender}
            type="button"
            role="radio"
            aria-checked={speakerGender === gender}
            onClick={() => void setSpeakerGender(gender)}
            className={cn(
              "text-small rounded-full px-4 py-2 transition motion-reduce:transition-none",
              speakerGender === gender ? "bg-charcoal text-inverse" : "bg-sand text-ink hover:bg-sand/70",
            )}
          >
            {SPEAKER_GENDER_LABELS.en[gender]}
          </button>
        ))}
      </div>
    </div>
  );
}
