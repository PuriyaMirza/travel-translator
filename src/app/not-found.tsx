import Link from "next/link";
import { Eyebrow } from "@/components/Eyebrow";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
      <Eyebrow>Page not found</Eyebrow>
      <h1 className="text-display mt-2 font-display text-ink">
        That page isn&rsquo;t here
      </h1>
      <p className="text-lead mt-4 text-muted">
        The link may be out of date. The phrasebook is all still where you left it.
      </p>
      <Link
        href="/"
        className="text-body-bold mt-8 inline-flex rounded-full bg-brand px-6 py-3 text-inverse transition hover:bg-brand-hover active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        Back to the phrasebook
      </Link>
    </main>
  );
}
