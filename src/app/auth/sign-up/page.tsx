import type { Metadata } from "next";
import { Eyebrow } from "@/components/Eyebrow";
import { AuthForm } from "@/components/AuthForm";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: PageProps<"/auth/sign-up">) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Eyebrow>Account</Eyebrow>
      <h1 className="text-display mt-2 font-display text-ink">Create an account</h1>
      <p className="text-lead mt-4 mb-8 text-muted">
        Anything you&rsquo;ve already saved on this device comes with you.
      </p>
      <AuthForm mode="sign-up" action={signUp} next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
