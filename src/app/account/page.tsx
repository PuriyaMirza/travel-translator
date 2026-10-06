import type { Metadata } from "next";
import { Eyebrow } from "@/components/Eyebrow";
import { AccountPanel } from "@/components/AccountPanel";

export const metadata: Metadata = { title: "Account" };

/** Sign in, create an account, sign out (SPEC.md §3: email/password). */
export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Eyebrow>Account</Eyebrow>
      <h1 className="text-display mt-2 font-display text-ink">Keep your phrases</h1>
      <p className="text-lead mt-4 mb-8 text-muted">
        An account carries your saved phrases to every device. Everything still works
        without one.
      </p>
      <AccountPanel />
    </main>
  );
}
