import { PRESET_PHRASES } from "./phrases";
import { draftTextKey, showsDraftNotice } from "./review";

/**
 * The text keys of every preset that carries the draft marker (SPEC.md §14).
 *
 * A phrase saved to the vault keeps its words but not its flag, so the vault
 * matches a saved copy back to its preset by text: the same unreviewed
 * sentence is still unreviewed there. Server-side only — it reads the phrase
 * snapshot — and handed to the client as a short list.
 */
export const DRAFT_NOTICE_KEYS: string[] = PRESET_PHRASES.filter(showsDraftNotice).map(draftTextKey);
