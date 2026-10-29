"use client";

import { Languages, Loader2, Smartphone } from "lucide-react";
import { brand } from "@/lib/brand";
import { useState } from "react";
import {
  findRecentTranslation,
  storeRecentTranslation,
  useRecentTranslations,
} from "@/lib/local/recentTranslations";
import { useSpeakerGender } from "@/lib/local/settings";
import { NETWORK_MESSAGE, OFFLINE_MESSAGE } from "@/lib/messages";
import type { Phrase } from "@/lib/types";
import { ErrorCard } from "./ErrorCard";
import { PhraseCardSkeleton } from "./PhraseCardSkeleton";
import { TranslationResult } from "./TranslationResult";

type Result =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "success"; phrase: Phrase; fromDevice: boolean }
  | { status: "error"; message: string };

// How many recent translations the list under the input shows. The cache
// holds 50 (SPEC.md §13); the list is a shortcut, not the whole history.
const RECENT_SHOWN = 10;

// Mirrors MAX_INPUT_LENGTH in src/lib/translate.ts (server-only, so not importable here).
const MAX_INPUT = 500;

export function TranslateForm() {
  const { speakerGender } = useSpeakerGender();
  const recent = useRecentTranslations();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result>({ status: "empty" });
  // What was actually submitted, so "Try again" retries the request rather
  // than requiring the user to retype it after fixing nothing on their end.
  const [lastSubmitted, setLastSubmitted] = useState("");

  const runTranslation = async (text: string) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      // Offline, an exact match in the recent-translations cache stands in
      // for the network (SPEC.md §13); anything else is the offline error.
      const cached = findRecentTranslation(text, brand.defaultLocale, speakerGender);
      setResult(
        cached
          ? { status: "success", phrase: cached, fromDevice: true }
          : { status: "error", message: OFFLINE_MESSAGE },
      );
      return;
    }

    setResult({ status: "loading" });
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speakerGender }),
      });
      const body = await response.json();
      if (!response.ok) {
        setResult({ status: "error", message: body.error?.message ?? NETWORK_MESSAGE });
        return;
      }
      storeRecentTranslation(text, speakerGender, body.phrase);
      setResult({ status: "success", phrase: body.phrase, fromDevice: false });
    } catch {
      setResult({ status: "error", message: NETWORK_MESSAGE });
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setLastSubmitted(text);
    void runTranslation(text);
  };

  const showRecent = (entry: (typeof recent)[number]) => {
    setInput(entry.sourceText);
    setLastSubmitted(entry.sourceText);
    setResult({ status: "success", phrase: entry.phrase, fromDevice: true });
  };

  const isLoading = result.status === "loading";

  // Figma: Language App › "Stamp blues palette · A Light editorial · Translate
  // result". Input, then the state (empty / loading / result / error), then the
  // recent translations as an italic footer line.
  return (
    <div className="space-y-[18px]">
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="flex flex-col gap-1.5 rounded-field border border-ink p-[18px] text-ink focus-within:border-brand">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type what you need to say…"
            rows={2}
            maxLength={MAX_INPUT}
            aria-label="Text to translate"
            aria-describedby="translate-count"
            className="w-full resize-none bg-transparent text-[17px] leading-6 placeholder:text-muted focus:outline-none"
          />
          <p id="translate-count" className="text-[12px]">
            {input.length} / {MAX_INPUT}
          </p>
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-[15px] font-bold text-inverse transition hover:bg-brand-hover disabled:opacity-50 motion-reduce:transition-none"
        >
          {isLoading ? (
            <Loader2 aria-hidden className="size-[18px] animate-spin" />
          ) : (
            <Languages aria-hidden className="size-[18px]" />
          )}
          Translate
        </button>
      </form>

      {result.status === "empty" && (
        <div className="rounded-card border border-dashed border-ink p-8 text-center">
          <p className="text-body text-muted">
            Type an English or Spanish phrase above to see how you&rsquo;d actually say it.
          </p>
        </div>
      )}

      {result.status === "loading" && <PhraseCardSkeleton />}

      {result.status === "success" && (
        <div className="space-y-2">
          {result.fromDevice && (
            <p className="text-small flex items-center gap-2 text-muted">
              <Smartphone aria-hidden className="size-4" />
              Saved on this device
            </p>
          )}
          <TranslationResult phrase={result.phrase} />
        </div>
      )}

      {result.status === "error" && (
        <ErrorCard message={result.message} onRetry={() => void runTranslation(lastSubmitted)} />
      )}

      {recent.length > 0 && (
        <section aria-labelledby="recent-heading" className="border-t border-rule pt-2">
          <p className="text-center font-display text-[13px] font-light text-ink">
            <span id="recent-heading">Recent</span>
            {recent.slice(0, RECENT_SHOWN).map((entry) => (
              <span key={entry.key}>
                <span aria-hidden> · </span>
                <button
                  type="button"
                  onClick={() => showRecent(entry)}
                  className="underline-offset-2 hover:underline"
                >
                  {entry.sourceText}
                </button>
              </span>
            ))}
          </p>
        </section>
      )}
    </div>
  );
}
