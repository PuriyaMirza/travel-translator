import Link from "next/link";
import { brand } from "@/lib/brand";
import { NavDrawer } from "./NavDrawer";

/**
 * The app header (SPEC.md §5): hamburger left, wordmark centred, account
 * avatar right.
 *
 * The right slot is still held open and empty — an avatar with no account is a
 * button that does nothing. It arrives with auth in M3.
 *
 * The three-column grid (rather than `justify-between`) keeps the wordmark
 * optically centred regardless of what sits either side of it.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-hairline bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="mx-auto grid h-14 max-w-3xl grid-cols-[1fr_auto_1fr] items-center px-4">
        <span className="justify-self-start">
          <NavDrawer />
        </span>

        <Link
          href="/"
          className="font-display text-h1 tracking-wordmark text-brand uppercase"
        >
          {brand.name}
        </Link>

        <span aria-hidden className="justify-self-end" />
      </div>
    </header>
  );
}
