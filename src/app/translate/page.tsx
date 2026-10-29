import type { Metadata } from "next";
import { TranslateForm } from "@/components/TranslateForm";
import { Eyebrow } from "@/components/Eyebrow";

export const metadata: Metadata = { title: "Translate" };

/**
 * SPEC.md §6: freeform input, result card with literal + natural + cultural
 * note + pronunciation. Typographic header only — eyebrow and title, per the
 * Stamp blues "Translate result" frame (no lead paragraph there).
 */
export default function TranslatePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-[18px] px-5 pt-[22px] pb-8">
      <Eyebrow>Translate</Eyebrow>
      <h1 className="text-display font-display text-ink">Say it your way.</h1>
      <TranslateForm />
    </main>
  );
}
