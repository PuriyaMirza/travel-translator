"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { AuthFormState } from "@/app/auth/actions";

/**
 * Email + password form shared by sign-in and sign-up. No name field: Neon
 * Auth's required `name` is derived from the email server-side.
 */
export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "sign-in" | "sign-up";
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  next?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const isSignUp = mode === "sign-up";
  const otherHref = `/auth/${isSignUp ? "sign-in" : "sign-up"}${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <label className="block">
        <span className="text-small text-ink">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="text-body mt-1 w-full rounded-full border border-hairline bg-card px-5 py-3 text-ink shadow-soft focus:border-blush focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-small text-ink">Password</span>
        <input
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={isSignUp ? 8 : undefined}
          required
          className="text-body mt-1 w-full rounded-full border border-hairline bg-card px-5 py-3 text-ink shadow-soft focus:border-blush focus:outline-none"
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-small rounded-card border border-blush bg-brand/5 px-5 py-3 text-ink">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="text-body-bold flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-inverse transition hover:bg-brand-hover disabled:opacity-50 motion-reduce:transition-none"
      >
        {isPending && <Loader2 className="size-5 animate-spin" />}
        {isSignUp ? "Create account" : "Sign in"}
      </button>

      <p className="text-small text-center text-muted">
        {isSignUp ? "Already have an account? " : "New here? "}
        <Link href={otherHref} className="text-ink underline underline-offset-2">
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
