import type { Metadata } from "next";
import { Suspense } from "react";
import { EditCard } from "@/components/EditCard";

export const metadata: Metadata = { title: "Edit card" };

/**
 * A static path rather than /cards/[id]/edit, so the service worker can warm
 * it once; the card id comes from the query string and is read on the device.
 */
export default function EditCardPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Suspense>
        <EditCard />
      </Suspense>
    </main>
  );
}
