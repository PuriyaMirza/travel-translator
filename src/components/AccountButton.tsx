"use client";

import Link from "next/link";
import { CircleUser } from "lucide-react";
import { useAuth } from "@/lib/authStore";

/**
 * The header's right slot (SPEC.md §5: account avatar right). Signed in, it
 * shows the account's initial; otherwise a generic person icon. Both lead to
 * /account. While auth is still resolving, an empty slot of the same size so
 * the header doesn't shift.
 */
export function AccountButton() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <span aria-hidden className="block size-10" />;
  }

  const initial =
    auth.status === "signed-in" ? (auth.user.email ?? "?").charAt(0).toUpperCase() : null;

  return (
    <Link
      href="/account"
      aria-label={auth.status === "signed-in" ? `Account: ${auth.user.email}` : "Account"}
      className="-mr-2 flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-sand/60 motion-reduce:transition-none"
    >
      {initial ? (
        <span className="text-body-bold flex size-8 items-center justify-center rounded-full bg-sand text-ink">
          {initial}
        </span>
      ) : (
        <CircleUser className="size-6" />
      )}
    </Link>
  );
}
