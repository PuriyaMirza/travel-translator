"use client";

import Link from "next/link";
import { Loader2, LogIn, LogOut, UserPlus } from "lucide-react";
import { useState } from "react";
import { sendReset, signIn, signOutUser, signUp } from "@/lib/auth";
import { useAuth } from "@/lib/authStore";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up";
type Notice = { tone: "error" | "info"; text: string } | null;

const PRIMARY_BUTTON =
  "text-body-bold flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-inverse transition hover:bg-brand-hover disabled:opacity-50 motion-reduce:transition-none";
const INPUT =
  "text-body w-full rounded-full border border-hairline bg-card px-5 py-3 text-ink placeholder:text-muted focus:border-blush focus:outline-none";

export function AccountPanel() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return (
      <div
        role="status"
        aria-label="Loading account"
        className="h-48 animate-pulse rounded-card border border-hairline bg-sand/50"
      />
    );
  }

  if (auth.status === "unavailable") {
    return (
      <div className="rounded-card border-2 border-dashed border-hairline p-8 text-center">
        <p className="text-body text-muted">
          Accounts aren&rsquo;t switched on for this deployment yet. Phrases you save stay
          on this device.
        </p>
      </div>
    );
  }

  if (auth.status === "signed-in") {
    return <SignedIn email={auth.user.email ?? ""} />;
  }

  return <SignInForm />;
}

function SignedIn({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const handleSignOut = async () => {
    setPending(true);
    setNotice(null);
    try {
      await signOutUser();
    } catch (error) {
      setNotice({ tone: "error", text: (error as Error).message });
      setPending(false);
    }
  };

  return (
    <div className="rounded-card border border-hairline bg-card p-6 shadow-soft">
      <p className="text-small text-muted">Signed in as</p>
      <p className="text-h2 mt-1 break-all text-ink">{email}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/vault" className={cn(PRIMARY_BUTTON, "sm:w-auto")}>
          Open your vault
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={pending}
          className="text-body-bold flex items-center justify-center gap-2 rounded-full border border-hairline bg-card px-6 py-3 text-ink transition hover:border-blush disabled:opacity-50 motion-reduce:transition-none"
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : <LogOut className="size-5" />}
          Sign out
        </button>
      </div>
      <p className="text-small mt-4 text-muted">
        Signing out removes your saved phrases from this device. They stay in your account.
      </p>
      <NoticeLine notice={notice} />
    </div>
  );
}

function SignInForm() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setNotice(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      if (mode === "sign-in") await signIn(email, password);
      else await signUp(email, password);
      // Success: the auth store flips to signed-in and AccountPanel swaps
      // this form out — nothing more to do here.
    } catch (error) {
      setNotice({ tone: "error", text: (error as Error).message });
      setPending(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setNotice({ tone: "error", text: "Enter your email above, then tap “Forgot password?” again." });
      return;
    }
    setPending(true);
    setNotice(null);
    try {
      await sendReset(email);
      setNotice({
        tone: "info",
        text: "If there's an account for that email, a reset link is on its way.",
      });
    } catch (error) {
      setNotice({ tone: "error", text: (error as Error).message });
    }
    setPending(false);
  };

  return (
    <div className="rounded-card border border-hairline bg-card p-6 shadow-soft">
      <div role="group" aria-label="Sign in or create an account" className="flex gap-2">
        <ModeTab selected={mode === "sign-in"} onClick={() => switchMode("sign-in")}>
          Sign in
        </ModeTab>
        <ModeTab selected={mode === "sign-up"} onClick={() => switchMode("sign-up")}>
          Create account
        </ModeTab>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          required
          className={INPUT}
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          aria-label="Password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={6}
          required
          className={INPUT}
        />
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          {pending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : mode === "sign-in" ? (
            <LogIn className="size-5" />
          ) : (
            <UserPlus className="size-5" />
          )}
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      {mode === "sign-in" && (
        <button
          type="button"
          onClick={handleReset}
          disabled={pending}
          className="text-small mt-4 text-muted underline underline-offset-2 hover:text-ink disabled:opacity-50"
        >
          Forgot password?
        </button>
      )}

      <p className="text-small mt-4 text-muted">
        Phrases you&rsquo;ve saved on this device move into your account when you sign in.
      </p>

      <NoticeLine notice={notice} />
    </div>
  );
}

function ModeTab({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "text-small rounded-full border px-4 py-2 transition motion-reduce:transition-none",
        selected
          ? "border-charcoal bg-charcoal text-inverse"
          : "border-hairline bg-card text-ink hover:border-blush",
      )}
    >
      {children}
    </button>
  );
}

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      role={notice.tone === "error" ? "alert" : "status"}
      className={cn(
        "text-small mt-4 rounded-card p-4",
        notice.tone === "error" ? "border border-blush bg-brand/5 text-ink" : "bg-sand/60 text-ink",
      )}
    >
      {notice.text}
    </p>
  );
}
