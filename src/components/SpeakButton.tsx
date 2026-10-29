"use client";

import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Read a phrase aloud. Three tones:
 * - "light": outlined in ink, on stone or white (phrase lists, result actions).
 * - "solid": filled navy, for the mint feature card.
 * - "dark": for show mode's navy background (SPEC.md §12).
 * Size is the caller's: pass e.g. `className="size-13"` to change the 44px default.
 */
export function SpeakButton({
  onSpeak,
  isSpeaking,
  supported,
  label,
  tone = "light",
  className,
}: {
  onSpeak: () => void;
  isSpeaking: boolean;
  supported: boolean;
  label: string;
  tone?: "light" | "solid" | "dark";
  className?: string;
}) {
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={onSpeak}
      aria-label={isSpeaking ? `Stop reading ${label}` : `Read ${label} aloud`}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full border transition",
        "active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
        tone === "dark" &&
          (isSpeaking
            ? "border-inverse bg-inverse text-ink"
            : "border-inverse/30 text-inverse hover:border-inverse"),
        tone === "solid" &&
          (isSpeaking
            ? "border-brand bg-brand text-inverse"
            : "border-ink bg-ink text-inverse hover:border-brand hover:bg-brand"),
        tone === "light" &&
          (isSpeaking
            ? "border-brand bg-brand text-inverse"
            : "border-ink text-ink hover:bg-sand/60"),
        className,
      )}
    >
      <Volume2 className={cn("size-[18px]", isSpeaking && "animate-pulse")} />
    </button>
  );
}
