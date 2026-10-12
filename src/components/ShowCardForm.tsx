"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { brand } from "@/lib/brand";
import { SHOW_CARD_KIND_LABELS, SHOW_CARD_STARTERS } from "@/lib/labels";
import { useSpeakerGender } from "@/lib/local/settings";
import { createShowCard, listShowCards, renameShowCard, updateShowCard } from "@/lib/local/showCards";
import { OFFLINE_CREATE_MESSAGE, OFFLINE_EDIT_MESSAGE } from "@/lib/messages";
import { translateCard } from "@/lib/showCardTranslate";
import type { ShowCard, ShowCardKind } from "@/lib/types";
import { useIsOffline } from "@/lib/useIsOffline";
import { ErrorCard } from "./ErrorCard";
import { Eyebrow } from "./Eyebrow";

const MAX_TITLE = 80;
const MAX_TEXT = 500;

const TEXT_LABEL: Record<ShowCardKind, string> = {
  allergy: "What to tell them, in English",
  diet: "What to tell them, in English",
  medical: "What to tell them, in English",
  address: "Address, exactly as written",
  custom: "What to tell them, in English",
};

const normalize = (text: string) => text.trim().toLowerCase();

/**
 * Create or edit a show card (SPEC.md §12). Pass `card` to edit.
 *
 * Saving re-translates only when the English changed. Address cards never
 * call the model, so they stay fully editable offline; every other kind
 * disables the text field offline and says why.
 */
export function ShowCardForm({ kind, card }: { kind: ShowCardKind; card?: ShowCard }) {
  const router = useRouter();
  const offline = useIsOffline();
  const { speakerGender } = useSpeakerGender();
  const [title, setTitle] = useState(card?.title ?? "");
  const [text, setText] = useState(card?.sourceText ?? SHOW_CARD_STARTERS.en[kind]);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const needsSignal = kind !== "address";
  const textLocked = needsSignal && offline;

  const save = async () => {
    const cleanTitle = title.trim();
    const cleanText = text.trim();
    setFailure(null);

    if (!cleanTitle) return setProblem("Give the card a short name so you can find it later.");
    if (!cleanText) return setProblem("Write what the card should say.");
    if (cleanText.includes("___")) return setProblem("Replace the blanks (___) with your own words first.");
    setProblem(null);

    const textChanged = !card || cleanText !== card.sourceText;
    if (card && !textChanged) {
      await renameShowCard(card.id, cleanTitle);
      router.push("/cards");
      return;
    }

    // The sync dedupe key is kind + locale + normalized text (SPEC.md §7); a
    // second card with the same text would be dropped on the server.
    const existing = await listShowCards();
    if (existing.some((c) => c.id !== card?.id && c.kind === kind && normalize(c.sourceText) === normalize(cleanText))) {
      return setProblem("You already have a card with this text.");
    }

    setSaving(true);
    const result = await translateCard(kind, cleanText, speakerGender, card?.locale ?? brand.defaultLocale);
    if (!result.ok) {
      setSaving(false);
      return setFailure(result.message);
    }

    if (card) {
      await updateShowCard(card.id, { title: cleanTitle, sourceText: cleanText, translation: result.translation });
    } else {
      await createShowCard({ kind, title: cleanTitle, sourceText: cleanText, translation: result.translation });
    }
    router.push("/cards");
  };

  const fieldClass =
    "text-body w-full rounded-card border border-hairline bg-card p-4 text-ink shadow-soft placeholder:text-muted focus:border-blush focus:outline-none disabled:opacity-60";

  return (
    <div>
      <Eyebrow>{card ? "Edit card" : "New card"}</Eyebrow>
      <h1 className="text-display mt-2 font-display text-ink">{SHOW_CARD_KIND_LABELS.en[kind]}</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="mt-8 space-y-6"
      >
        <label className="block">
          <span className="text-body-bold block text-ink">Name</span>
          <span className="text-small mb-2 block text-muted">Only for finding it in your list.</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={MAX_TITLE}
            placeholder="e.g. Peanut allergy"
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="text-body-bold block text-ink">{TEXT_LABEL[kind]}</span>
          {kind === "address" ? (
            <span className="text-small mb-2 block text-muted">
              Street and building names are kept exactly as you type them.
            </span>
          ) : (
            <span className="text-small mb-2 block text-muted">
              Edit the whole sentence. It is translated when you save.
            </span>
          )}
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={5}
            maxLength={MAX_TEXT}
            disabled={textLocked}
            className={`${fieldClass} resize-none`}
          />
        </label>

        {textLocked && (
          <p role="status" className="text-small rounded-card bg-sand px-5 py-4 text-ink">
            {card ? OFFLINE_EDIT_MESSAGE : OFFLINE_CREATE_MESSAGE}
          </p>
        )}
        {problem && (
          <p role="alert" className="text-small text-ink">
            {problem}
          </p>
        )}
        {failure && <ErrorCard message={failure} onRetry={() => void save()} />}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || (textLocked && !card)}
            className="text-body-bold flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-inverse transition hover:bg-brand-hover disabled:opacity-50 motion-reduce:transition-none"
          >
            {saving && <Loader2 className="size-5 animate-spin" />}
            Save card
          </button>
          <Link href="/cards" className="text-body-bold text-ink underline underline-offset-2">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
