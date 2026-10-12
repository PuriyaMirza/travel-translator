"use client";

import { ADDRESS_LEAD } from "@/lib/labels";
import type { CardTranslation } from "@/lib/local/showCards";
import { NETWORK_MESSAGE, OFFLINE_MESSAGE } from "@/lib/messages";
import type { Phrase, ShowCardKind, SpeakerGender } from "@/lib/types";

/** The JSON body POSTed to /api/translate for a card (SPEC.md §12). */
export function translateRequestBody(text: string, speakerGender: SpeakerGender) {
  return { text, speakerGender };
}

export type CardTranslationResult =
  | { ok: true; translation: CardTranslation }
  | { ok: false; message: string };

/**
 * Build the stored translation for a card. Address cards never call the model
 * (SPEC.md §12): the address is kept verbatim under a fixed lead line.
 * Everything else POSTs to /api/translate with the current speaker gender.
 */
export async function translateCard(
  kind: ShowCardKind,
  text: string,
  speakerGender: SpeakerGender,
  locale: string,
): Promise<CardTranslationResult> {
  if (kind === "address") {
    const lead = ADDRESS_LEAD[locale] ?? "";
    const spanish = lead ? `${lead}\n${text}` : text;
    return {
      ok: true,
      translation: { literal: spanish, natural: spanish, culturalNote: "", pronunciation: "" },
    };
  }

  if (!navigator.onLine) return { ok: false, message: OFFLINE_MESSAGE };

  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(translateRequestBody(text, speakerGender)),
    });
    const body = await response.json();
    if (!response.ok) return { ok: false, message: body.error?.message ?? NETWORK_MESSAGE };
    const phrase = body.phrase as Phrase;
    return {
      ok: true,
      translation: {
        literal: phrase.literal,
        natural: phrase.natural,
        culturalNote: phrase.culturalNote ?? "",
        pronunciation: phrase.pronunciation,
      },
    };
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }
}
