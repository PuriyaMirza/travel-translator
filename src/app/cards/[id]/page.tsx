import type { Metadata } from "next";
import { ShowMode } from "@/components/ShowMode";

export const metadata: Metadata = { title: "Card" };

/**
 * Only the shell is pre-rendered. Any other id renders on demand with the
 * same empty page: show mode reads the card from IndexedDB on the client, so
 * the server never needs to know it (and must not 404 it). SPEC.md §9, §12.
 */
export function generateStaticParams() {
  return [{ id: "_shell" }];
}

export default function ShowCardPage() {
  return <ShowMode />;
}
