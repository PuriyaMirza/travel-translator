"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";

export type AuthFormState = { error: string } | null;

const NETWORK_ERROR = "Couldn't reach the sign-in service. Check your connection and try again.";

/**
 * Only same-site paths, so `?next=` can't bounce someone to another domain.
 * Browsers read "/\evil.com" (and tab or newline variants) as
 * "//evil.com", so a prefix check alone isn't enough: resolve the value
 * against a placeholder origin and keep it only if the origin didn't change.
 */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  if (!next.startsWith("/") || next.startsWith("//") || /[\\\s]/.test(next)) return "/vault";
  const base = "https://same-site.invalid";
  const url = new URL(next, base);
  return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : "/vault";
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Enter your email and password." };

  const { error } = await getAuth().signIn.email({ email, password });
  if (error) {
    if (error.code?.startsWith("NETWORK_")) return { error: NETWORK_ERROR };
    return { error: "That email and password don't match. Check them and try again." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Enter an email and a password." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };

  // Neon Auth requires a name. The app never shows one, so it is derived from
  // the email rather than asked for (owner decision, M3).
  const name = email.split("@")[0] || email;

  const { error } = await getAuth().signUp.email({ email, password, name });
  if (error) {
    if (error.code?.startsWith("NETWORK_")) return { error: NETWORK_ERROR };
    if (error.code === "USER_ALREADY_EXISTS" || error.status === 422) {
      return { error: "There's already an account with that email. Sign in instead." };
    }
    return { error: error.message || "Couldn't create the account. Try again." };
  }
  redirect(safeNext(formData.get("next")));
}
