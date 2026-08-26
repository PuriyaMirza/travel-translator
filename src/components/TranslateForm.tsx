"use client";

import { Languages, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Phrase } from "@/lib/types";
import { ErrorCard } from "./ErrorCard";
import { PhraseCard } from "./PhraseCard";
import { PhraseCardSkeleton } from "./PhraseCardSkeleton";

type Result =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "success"; phrase: Phrase }
  | { status: "error"; message: string };

const OFFLINE_MESSAGE =
  "You're offline. Translation needs a connection — the phrasebook still works without one.";
const NETWORK_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

export function TranslateForm() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result>({ status: "empty" });
  // What was actually submitted, so "Try again" retries the request rather
  // than requiring the user to retype it after fixing nothing on their end.
  const [lastSubmitted, setLastSubmitted] = useState("");

  const runTranslation = async (text: string) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setResult({ status: "error", message: OFFLINE_MESSAGE });
      return;
    }

    setResult({ status: "loading" });
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await response.json();
      if (!response.ok) {
        setResult({ status: "error", message: body.error?.message ?? NETWORK_MESSAGE });
        return;
      }
      setResult({ status: "success", phrase: body.phrase });
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

      {result.status === "empty" && (
        <div className="rounded-card border-2 border-dashed border-hairline p-8 text-center">
          <p className="text-body text-muted">
            Type an English or Spanish phrase above to see how you&rsquo;d actually say it.
          </p>
        </div>
      )}

      {result.status === "loading" && <PhraseCardSkeleton />}

      {result.status === "success" && <PhraseCard phrase={result.phrase} />}

      {result.status === "error" && (
        <ErrorCard message={result.message} onRetry={() => void runTranslation(lastSubmitted)} />
      )}
    </div>
  );
}
