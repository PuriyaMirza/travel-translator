"use client";

import { History, Languages, Loader2, Smartphone } from "lucide-react";
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
import { PhraseCard } from "./PhraseCard";
import { PhraseCardSkeleton } from "./PhraseCardSkeleton";

type Result =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "success"; phrase: Phrase; fromDevice: boolean }
  | { status: "error"; message: string };

// How many recent translations the list under the input shows. The cache
// holds 50 (SPEC.md §13); the list is a shortcut, not the whole history.
const RECENT_SHOWN = 10;

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

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type what you need to say…"
          rows={3}
          maxLength={500}
          aria-label="Text to translate"
          className="text-body w-full resize-none rounded-card border border-hairline bg-card p-4 text-ink shadow-soft placeholder:text-muted focus:border-blush focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="text-body-bold flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-inverse transition hover:bg-brand-hover disabled:opacity-50 motion-reduce:transition-none"
        >
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Languages className="size-5" />
          )}
          Translate
        </button>
      </form>

      {recent.length > 0 && (
        <section aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="text-small flex items-center gap-2 text-muted">
            <History className="size-4" />
            Recent
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {recent.slice(0, RECENT_SHOWN).map((entry) => (
              <li key={entry.key} className="min-w-0 max-w-full">
                <button
                  type="button"
                  onClick={() => showRecent(entry)}
                  className="text-small block max-w-full truncate rounded-full bg-sand px-4 py-2 text-ink transition hover:bg-sand/70 motion-reduce:transition-none"
                >
                  {entry.sourceText}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.status === "empty" && (
        <div className="rounded-card border-2 border-dashed border-hairline p-8 text-center">
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
              <Smartphone className="size-4" />
              Saved on this device
            </p>
          )}
          <PhraseCard phrase={result.phrase} />
        </div>
      )}

      {result.status === "error" && (
        <ErrorCard message={result.message} onRetry={() => void runTranslation(lastSubmitted)} />
      )}
    </div>
  );
}
