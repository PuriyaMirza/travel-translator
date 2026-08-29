"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { VISIBLE_CATEGORIES } from "@/lib/categories";
import { categoryLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./Eyebrow";

export function NavDrawer() {
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Which route the drawer was opened on, rather than a plain boolean. Once
  // the route changes the drawer is closed by definition, so navigating —
  // including via the back button — never leaves it hanging open behind the
  // new page, and no effect is needed to close it.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedOn(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="-ml-2 flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-sand/60 motion-reduce:transition-none"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
          />

          <nav
            aria-label="Main"
            className="relative flex h-full w-full max-w-xs flex-col bg-canvas pt-[env(safe-area-inset-top)] shadow-soft"
          >
            <div className="flex h-14 items-center justify-end px-4">
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-sand/60 motion-reduce:transition-none"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 pb-10">
              <Link
                href="/"
                className={cn(
                  "text-h2 block py-2 font-display text-ink",
                  pathname === "/" && "text-brand",
                )}
              >
                Home
              </Link>

              <Link
                href="/translate"
                className={cn(
                  "text-body-bold block py-2 text-ink transition hover:text-brand motion-reduce:transition-none",
                  pathname === "/translate" && "text-brand",
                )}
              >
                Translate
              </Link>

              <Eyebrow tone="muted" className="mt-6 mb-1">
                Phrasebook
              </Eyebrow>
              <ul>
                {VISIBLE_CATEGORIES.map((category) => {
                  const href = `/phrasebook/${category}`;
                  return (
                    <li key={category}>
                      <Link
                        href={href}
                        className={cn(
                          "text-body block py-2 text-ink transition hover:text-brand motion-reduce:transition-none",
                          pathname === href && "text-brand",
                        )}
                      >
                        {categoryLabel(category)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
