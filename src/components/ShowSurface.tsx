"use client";

import { cn } from "@/lib/utils";
import { useSpeech } from "@/lib/useSpeech";
import { SpeakButton } from "./SpeakButton";

/**
 * The show-mode reading surface (SPEC.md §12): dark, high contrast, no brand
 * accents. Presentational only. The parent decides where it sits — the
 * `/cards/[id]` page for a show card, a `<dialog>` for any other phrase
 * (SPEC.md §14) — and supplies the close control.
 */
export function ShowSurface({
  close,
  children,
}: {
  /** The close control, a link or a button. Sits inside the top safe area. */
  close: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="px-4 pt-[env(safe-area-inset-top)]">{close}</div>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-10">
        {children}
      </div>
    </>
  );
}

/** Shared look of the round close control, for a `<Link>` or a `<button>`. */
export const showCloseClass =
  "mt-3 flex size-11 items-center justify-center rounded-full border border-inverse/30 text-inverse transition hover:border-inverse motion-reduce:transition-none";

/**
 * Type size for the shown text. `display` (36px) is the floor SPEC.md §12
 * sets; a short phrase gets more, because the person reading it is at arm's
 * length. Show cards pass `scale={false}` and stay at the floor, as before.
 */
function sizeFor(text: string, scale: boolean): string {
  if (!scale) return "text-display md:text-5xl";
  if (text.length <= 18) return "text-[56px] leading-[1.08] md:text-7xl";
  if (text.length <= 40) return "text-[44px] leading-[1.12] md:text-6xl";
  return "text-display md:text-5xl";
}

/** The text being shown, the user's English under it, and a speak button. */
export function ShowText({
  text,
  lang,
  voice,
  sourceText,
  speakId,
  speakLabel,
  scale = false,
}: {
  /** What the other person reads. */
  text: string;
  /** BCP 47 tag for `text`. */
  lang: string;
  /** Which voice reads it (`useSpeech` picks by language). */
  voice: "en" | "es";
  /** The user's own English, so they know exactly what they're showing. */
  sourceText: string;
  speakId: string;
  speakLabel: string;
  scale?: boolean;
}) {
  const { speak, speakingId, supported } = useSpeech();

  return (
    <>
      <p
        lang={lang}
        className={cn(
          "font-bold whitespace-pre-line text-inverse [overflow-wrap:anywhere]",
          sizeFor(text, scale),
        )}
      >
        {text}
      </p>
      {/* Not `text-muted`: since the Stamp blues re-skin that is indigo, which is
          unreadable on navy. The user must be able to read what they are showing. */}
      <p className="text-small mt-6 whitespace-pre-line text-inverse/70">{sourceText}</p>
      <div className="mt-8">
        <SpeakButton
          tone="dark"
          onSpeak={() => speak(speakId, text, voice)}
          isSpeaking={speakingId === speakId}
          supported={supported}
          label={speakLabel}
        />
      </div>
    </>
  );
}
