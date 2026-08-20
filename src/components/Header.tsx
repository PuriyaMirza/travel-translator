import { brand } from "@/lib/brand";

/**
 * The app header (SPEC.md §5): hamburger left, wordmark centred, account
 * avatar right.
 *
 * M0 renders only the wordmark. The left and right slots are held open but
 * left empty — a hamburger with no menu and an avatar with no account are
 * buttons that do nothing. They arrive in M1 and M3 respectively.
 *
 * The three-column grid (rather than `justify-between`) keeps the wordmark
 * optically centred no matter what lands in those slots later.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-hairline bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="mx-auto grid h-14 max-w-3xl grid-cols-[1fr_auto_1fr] items-center px-4">
        <span aria-hidden />
        <span className="font-display text-h1 tracking-wordmark text-brand uppercase">
          {brand.name}
        </span>
        <span aria-hidden />
      </div>
    </header>
  );
}
