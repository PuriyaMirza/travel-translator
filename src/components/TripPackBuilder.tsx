"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Luggage, Sparkles } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { brand } from "@/lib/brand";
import { saveTripPack, type SaveTripPackResult } from "@/lib/local/tripPacks";
import { useSpeakerGender } from "@/lib/local/settings";
import { NETWORK_MESSAGE, OFFLINE_TRIP_MESSAGE } from "@/lib/messages";
import type { Phrase } from "@/lib/types";
import { ErrorCard } from "./ErrorCard";
import { PhraseCard } from "./PhraseCard";
import { PhraseCardSkeleton } from "./PhraseCardSkeleton";

// Same caps as the route (src/lib/tripPack.ts); that file is server-only.
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 500;

// The model call is cut off at 240s server-side; the browser gives up a
// little after the route's 300s ceiling so it never hangs on the loading state.
const REQUEST_TIMEOUT_MS = 280_000;

type Stage =
  | { status: "form" }
  | { status: "loading" }
  | { status: "preview"; phrases: Phrase[] }
  | { status: "saving"; phrases: Phrase[] }
  | { status: "saved"; title: string; result: SaveTripPackResult }
  // `phrases` is set when saving failed, so the preview stays on screen.
  | { status: "error"; message: string; retry: () => void; phrases?: Phrase[] };

const fieldClass =
  "text-body w-full resize-none rounded-card border border-hairline bg-card p-4 text-ink shadow-soft placeholder:text-muted focus:border-blush focus:outline-none";

/** The sign-in invitation, in the empty-state style (SPEC.md §6, §13). */
function SignInInvitation() {
  return (
    <div className="rounded-card border-2 border-dashed border-hairline p-8 text-center">
      <Luggage className="mx-auto size-8 text-muted" />
      <p className="text-body mt-3 text-ink">Sign in to build a trip pack.</p>
      <p className="text-small mt-1 text-muted">
        A pack is about 25 phrases written for your trip, kept in your vault so they work offline
        on every device.
      </p>
      <Link
        href="/auth/sign-in?next=/trip"
        className="text-body-bold mt-5 inline-flex items-center rounded-full bg-brand px-6 py-3 text-inverse transition hover:bg-brand-hover active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        Sign in
      </Link>
    </div>
  );
}

export function TripPackBuilder() {
  const { data: session, isPending } = authClient.useSession();
  const { speakerGender } = useSpeakerGender();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<Stage>({ status: "form" });
  // The phrases still ticked in the preview, by id. Everything starts ticked.
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  // The server rejected the session (expired, signed out elsewhere).
  const [rejected, setRejected] = useState(false);

  if (isPending) return null;
  if (!session?.user || rejected) return <SignInInvitation />;

  const generate = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) return;

    if (!navigator.onLine) {
      setStage({ status: "error", message: OFFLINE_TRIP_MESSAGE, retry: () => void generate() });
      return;
    }

    setStage({ status: "loading" });
    try {
      const response = await fetch("/api/trip-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDescription,
          locale: brand.defaultLocale,
          speakerGender,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status === 401) {
        setRejected(true);
        return;
      }
      const body = await response.json();
      if (!response.ok) {
        setStage({
          status: "error",
          message: body.error?.message ?? NETWORK_MESSAGE,
          retry: () => void generate(),
        });
        return;
      }
      setUnchecked(new Set());
      setStage({ status: "preview", phrases: body.phrases });
    } catch {
      setStage({ status: "error", message: NETWORK_MESSAGE, retry: () => void generate() });
    }
  };

  const save = async (phrases: Phrase[]) => {
    const chosen = phrases.filter((p) => !unchecked.has(p.id));
    if (chosen.length === 0) return;

    if (!navigator.onLine) {
      setStage({ status: "error", message: OFFLINE_TRIP_MESSAGE, retry: () => void save(phrases), phrases });
      return;
    }

    setStage({ status: "saving", phrases });
    try {
      const result = await saveTripPack(
        { title: title.trim(), description: description.trim(), locale: brand.defaultLocale },
        chosen,
      );
      setStage({ status: "saved", title: title.trim(), result });
    } catch {
      setStage({
        status: "error",
        message: "Couldn't save the trip pack. Check your connection and try again.",
        retry: () => void save(phrases),
        phrases,
      });
    }
  };

  const toggle = (id: string) =>
    setUnchecked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const reset = () => {
    setTitle("");
    setDescription("");
    setUnchecked(new Set());
    setStage({ status: "form" });
  };

  if (stage.status === "saved") {
    const { added, alreadySaved } = stage.result;
    return (
      <div className="rounded-card border border-hairline bg-card p-8 text-center shadow-soft">
        <Check className="mx-auto size-8 text-ink" />
        <p className="text-body mt-3 text-ink">
          {added === 0
            ? "Those phrases were already in your vault."
            : `Saved ${added} ${added === 1 ? "phrase" : "phrases"} from “${stage.title}” to your vault.`}
        </p>
        {alreadySaved > 0 && added > 0 && (
          <p className="text-small mt-1 text-muted">
            {alreadySaved} {alreadySaved === 1 ? "was" : "were"} already there.
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/vault"
            className="text-body-bold inline-flex items-center rounded-full bg-brand px-6 py-3 text-inverse transition hover:bg-brand-hover active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Open your vault
          </Link>
          <button
            type="button"
            onClick={reset}
            className="text-body-bold inline-flex items-center rounded-full bg-sand px-6 py-3 text-ink transition hover:bg-sand/70 motion-reduce:transition-none"
          >
            Plan another trip
          </button>
        </div>
      </div>
    );
  }

  const busy = stage.status === "loading" || stage.status === "saving";
  const previewPhrases =
    stage.status === "preview" || stage.status === "saving" || stage.status === "error"
      ? (stage.phrases ?? null)
      : null;
  const checkedCount = previewPhrases
    ? previewPhrases.filter((p) => !unchecked.has(p.id)).length
    : 0;

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void generate();
        }}
        className="space-y-3"
      >
        <div>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={TITLE_MAX}
            placeholder="Name your trip"
            aria-label="Trip title"
            disabled={busy}
            className="text-body w-full rounded-full border border-hairline bg-card px-5 py-3 text-ink shadow-soft placeholder:text-muted focus:border-blush focus:outline-none"
          />
          <p className="text-small mt-1 text-right text-muted" aria-live="off">
            {title.length}/{TITLE_MAX}
          </p>
        </div>
        <div>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={5}
            placeholder="Vegetarian, two weeks in Mexico City and Oaxaca, staying in hostels, overnight buses…"
            aria-label="Trip description"
            disabled={busy}
            className={fieldClass}
          />
          <p className="text-small mt-1 text-right text-muted" aria-live="off">
            {description.length}/{DESCRIPTION_MAX}
          </p>
        </div>
        <button
          type="submit"
          disabled={busy || !title.trim() || !description.trim()}
          className="text-body-bold flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-inverse transition hover:bg-brand-hover disabled:opacity-50 motion-reduce:transition-none"
        >
          <Sparkles className="size-5" />
          Generate phrases
        </button>
      </form>

      {stage.status === "loading" && (
        <div className="space-y-3">
          <p role="status" className="text-body text-muted">
            Writing phrases for your trip. This takes a little while — a minute or two.
          </p>
          <PhraseCardSkeleton />
          <PhraseCardSkeleton />
          <PhraseCardSkeleton />
        </div>
      )}

      {stage.status === "error" && <ErrorCard message={stage.message} onRetry={stage.retry} />}

      {previewPhrases && (
        <div className="space-y-4">
          <ul className="space-y-3">
            {previewPhrases.map((phrase) => (
              <li key={phrase.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={!unchecked.has(phrase.id)}
                  onChange={() => toggle(phrase.id)}
                  disabled={busy}
                  aria-label={`Include “${phrase.sourceText}”`}
                  className="mt-6 size-5 shrink-0 accent-ink"
                />
                <div className="min-w-0 flex-1">
                  <PhraseCard phrase={phrase} />
                </div>
              </li>
            ))}
          </ul>
          <div className="sticky bottom-4">
            <button
              type="button"
              onClick={() => void save(previewPhrases)}
              disabled={busy || checkedCount === 0}
              className="text-body-bold flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-inverse shadow-soft transition hover:bg-brand-hover disabled:opacity-50 motion-reduce:transition-none"
            >
              Save {checkedCount} to vault
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
