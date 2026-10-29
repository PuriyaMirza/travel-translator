"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { authClient } from "@/lib/auth/client";

/**
 * The header's account avatar (SPEC.md §5). Signed out it links to sign-in;
 * signed in it opens a small menu with the account email and sign-out.
 */
export function AccountButton() {
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Outlined ink circle (Stamp blues design).
  const avatarClass =
    "flex size-[34px] items-center justify-center rounded-full border border-ink text-ink transition hover:bg-sand/60 motion-reduce:transition-none";

  if (isPending) return <span className="block size-[34px]" aria-hidden />;

  if (!session?.user) {
    return (
      <Link href="/auth/sign-in" aria-label="Sign in" className={avatarClass}>
        <User className="size-4" />
      </Link>
    );
  }

  const signOut = async () => {
    setOpen(false);
    await authClient.signOut();
    router.refresh();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        aria-expanded={open}
        className={`${avatarClass} bg-sand`}
      >
        <User className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-card border border-hairline bg-card p-4 shadow-soft">
          <p className="text-small text-muted">Signed in as</p>
          <p className="text-body-bold truncate text-ink">{session.user.email}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-body mt-4 flex w-full items-center gap-2 rounded-full px-3 py-2 text-ink transition hover:bg-sand/60 motion-reduce:transition-none"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
