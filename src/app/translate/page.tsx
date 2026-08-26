import type { Metadata } from "next";
import { TranslateForm } from "@/components/TranslateForm";
import { Eyebrow } from "@/components/Eyebrow";

export const metadata: Metadata = { title: "Translate" };

/**
 * SPEC.md §6: freeform input, result card with literal + natural + cultural
 * note + pronunciation. No full-bleed banner here — unlike the category
 * pages, this screen has no single identity to illustrate, so the editorial
 * treatment is typographic only (eyebrow, title, lead).
 */
export default function TranslatePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Eyebrow>Translate</Eyebrow>
      <h1 className="text-display mt-2 font-display text-ink">Say it your way</h1>
      <p className="text-lead mt-4 mb-8 text-muted">
        Type it in English or Spanish — you&rsquo;ll get back what a native speaker would
        actually say, not a textbook version.
      </p>
      <TranslateForm />
    </main>
  );
}
