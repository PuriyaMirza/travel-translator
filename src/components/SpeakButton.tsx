"use client";

import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SpeakButton({
  onSpeak,
  isSpeaking,
  supported,
  label,
}: {
  onSpeak: () => void;
  isSpeaking: boolean;
  supported: boolean;
  label: string;
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
        isSpeaking
          ? "border-brand bg-brand text-inverse"
          : "border-hairline bg-card text-muted hover:border-blush hover:text-brand",
      )}
    >
      <Volume2 className={cn("size-5", isSpeaking && "animate-pulse")} />
    </button>
  );
}
