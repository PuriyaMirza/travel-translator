"use client";

import { ChevronDown } from "lucide-react";
import type { LikelyReply } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { cn } from "@/lib/utils";
import { SpeakButton } from "./SpeakButton";

/**
 * "They might say" (SPEC.md §14): what the other person is likely to say back,
 * with what it means. The traveller hears these rather than says them, so
 * there is no pronunciation guide — only a speak button, to learn the sound.
 *
 * A native `<details>`: the disclosure, its keyboard handling and its state
 * announcement come from the browser. Closed by default so a list of cards
 * stays scannable; pass `defaultOpen` where there is only one phrase on screen.
 */
export function LikelyReplies({
  phraseId,
  replies,
  lang,
  defaultOpen = false,
}: {
  phraseId: string;
  replies: LikelyReply[];
  /** BCP 47 tag of the replies' language. */
  lang: string;
  defaultOpen?: boolean;
}) {
  const { speak, speakingId, supported } = useSpeech();

  return (
    <details open={defaultOpen} className="group/replies text-ink">
      <summary
        className={cn(
          "text-small flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-semibold",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        They might say
        <span className="font-normal">({replies.length})</span>
        <ChevronDown
          aria-hidden
          className="size-4 transition group-open/replies:rotate-180 motion-reduce:transition-none"
        />
      </summary>

      <ul className="divide-y divide-ink/15">
        {replies.map((reply, index) => {
          const speakId = `reply:${phraseId}:${index}`;
          return (
            <li key={index} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p lang={lang} className="text-body-bold">
                  {reply.text}
                </p>
                <p className="text-small">{reply.meaning}</p>
              </div>
              <SpeakButton
                className="size-10"
                onSpeak={() => speak(speakId, reply.text, "es")}
                isSpeaking={speakingId === speakId}
                supported={supported}
                label={reply.text}
              />
            </li>
          );
        })}
      </ul>
    </details>
  );
}
