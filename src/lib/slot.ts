import type { Phrase, SlotOption } from "./types";

/**
 * Fill-in-the-blank phrases (SPEC.md §14).
 *
 * The app never assembles Spanish from parts. A template's four text fields
 * each hold one marker, and an option supplies the whole fragment for each
 * field — "al maní", not "maní" — so filling the blank is a plain text
 * replacement with nothing to get grammatically wrong.
 */
export const SLOT_MARKER = "{slot}";

/** The template as a person reads it: "Where is ___?" */
export function blankSlot(text: string): string {
  return text.replace(SLOT_MARKER, "___");
}

/**
 * A template with one option filled in: an ordinary phrase, with no blank
 * left, that can be spoken, shown and saved like any other. Its id combines
 * the two, so each filling is distinct to the speech and save code.
 */
export function resolveSlot(phrase: Phrase, option: SlotOption): Phrase {
  // `slot` is dropped: the result is a finished sentence, not a template.
  const { slot, ...rest } = phrase;
  void slot;
  return {
    ...rest,
    id: `${phrase.id}:${option.id}`,
    sourceText: phrase.sourceText.replace(SLOT_MARKER, option.sourceText),
    natural: phrase.natural.replace(SLOT_MARKER, option.natural),
    literal: phrase.literal.replace(SLOT_MARKER, option.literal),
    pronunciation: phrase.pronunciation.replace(SLOT_MARKER, option.pronunciation),
  };
}
