import type { Metadata } from "next";
import { Suspense } from "react";
import { NewCard } from "@/components/NewCard";

export const metadata: Metadata = { title: "New card" };

export default function NewCardPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Suspense>
        <NewCard />
      </Suspense>
    </main>
  );
}
