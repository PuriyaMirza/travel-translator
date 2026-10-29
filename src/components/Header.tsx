import Link from "next/link";
import { brand } from "@/lib/brand";
import { AccountButton } from "./AccountButton";
import { NavDrawer } from "./NavDrawer";

/**
 * The app header (SPEC.md §5): hamburger left, wordmark centred, account
 * avatar right, with a solid ink rule underneath (Stamp blues design).
 *
 * The three-column grid (rather than `justify-between`) keeps the wordmark
 * optically centred regardless of what sits either side of it.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-hairline bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="mx-auto grid h-[62px] max-w-3xl grid-cols-[1fr_auto_1fr] items-center px-5">
        <span className="justify-self-start">
          <NavDrawer />
        </span>

        <Link href="/" className="text-wordmark tracking-wordmark text-ink uppercase">
          {brand.name}
        </Link>

        <span className="justify-self-end">
          <AccountButton />
        </span>
      </div>
    </header>
  );
}
