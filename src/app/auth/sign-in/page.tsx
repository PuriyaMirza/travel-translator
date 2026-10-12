import type { Metadata } from "next";
import { Eyebrow } from "@/components/Eyebrow";
import { AuthForm } from "@/components/AuthForm";
import { signIn } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/auth/sign-in">) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Eyebrow>Account</Eyebrow>
      <h1 className="text-display mt-2 font-display text-ink">Sign in</h1>
      <p className="text-lead mt-4 mb-8 text-muted">
        Your saved phrases follow you to every device. They still work offline either way.
      </p>
      <AuthForm mode="sign-in" action={signIn} next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
