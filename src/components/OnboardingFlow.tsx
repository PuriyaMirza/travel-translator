"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronLeft, Search } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { brand } from "@/lib/brand";
import { destinationsFor } from "@/lib/destinations";
import { SPANISH_COMFORT_LABELS, SPEAKER_GENDER_EXAMPLES, SPEAKER_GENDER_LABELS } from "@/lib/labels";
import { getLocalSettings, setLocalSettings } from "@/lib/local/settings";
import { markOnboardingComplete, upcomingMonths } from "@/lib/onboarding";
import { SPANISH_COMFORT_LEVELS, SPEAKER_GENDERS, type SpanishComfort, type SpeakerGender } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./Eyebrow";

/*
 * Onboarding, version A: one question per screen (welcome, trip, voice,
 * Spanish level, optional account). Every answer is written to IndexedDB
 * when the user moves on, so leaving halfway keeps what was answered.
 * Every question can be skipped; skipping keeps the current value.
 */

const STEPS = ["welcome", "trip", "voice", "spanish", "account"] as const;
type Step = (typeof STEPS)[number];
const QUESTION_STEPS: readonly Step[] = ["trip", "voice", "spanish"];

/** "Later" in the month row: travelling, but not in the next six months. */
const LATER = "later";
const MONTHS_SHOWN = 6;

const primaryButton =
  "text-body-bold flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-inverse transition hover:bg-brand-hover active:scale-[0.98] disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100";
const secondaryButton =
  "text-body-bold flex w-full items-center justify-center rounded-full border border-hairline bg-card px-6 py-3 text-ink transition hover:bg-sand/60 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";
const textButton =
  "text-small rounded-full px-3 py-2 font-semibold text-ink transition hover:bg-sand/60 motion-reduce:transition-none";

function chipClass(selected: boolean) {
  return cn(
    "text-small inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-semibold transition motion-reduce:transition-none",
    selected ? "border-charcoal bg-charcoal text-inverse" : "border-hairline bg-card text-ink hover:bg-sand/60",
  );
}

function optionClass(selected: boolean) {
  return cn(
    "flex w-full items-start gap-3 rounded-tile bg-card px-4 py-3 text-left transition hover:bg-sand/40 motion-reduce:transition-none",
    selected ? "border-2 border-hairline" : "border border-hairline m-px",
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <span aria-hidden className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-hairline">
      {selected && <span className="size-2 rounded-full bg-charcoal" />}
    </span>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const signedIn = Boolean(session?.user);
  const locale = brand.defaultLocale;
  const destinations = destinationsFor(locale);
  const months = useMemo(() => upcomingMonths(new Date(), MONTHS_SHOWN), []);

  const [step, setStep] = useState<Step>("welcome");
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState<string | null>(null);
  const [travelMonth, setTravelMonth] = useState<string | null>(null);
  const [speakerGender, setSpeakerGender] = useState<SpeakerGender>("neutral");
  const [spanishComfort, setSpanishComfort] = useState<SpanishComfort | null>(null);

  // Start from whatever this device already has, so re-running setup from
  // the menu shows the current answers.
  useEffect(() => {
    getLocalSettings().then(
      (settings) => {
        setSpeakerGender(settings.speakerGender);
        if (settings.destination) setDestination(settings.destination);
        if (settings.travelMonth) setTravelMonth(settings.travelMonth);
        if (settings.spanishComfort) setSpanishComfort(settings.spanishComfort);
      },
      () => {},
    );
  }, []);

  const index = STEPS.indexOf(step);
  const questionNumber = QUESTION_STEPS.indexOf(step) + 1;

  const finish = (href = "/") => {
    markOnboardingComplete();
    router.replace(href);
  };

  const goNext = () => {
    const next = STEPS[index + 1];
    // The account offer is pointless for someone already signed in.
    if (!next || (next === "account" && signedIn)) finish();
    else setStep(next);
  };

  const goBack = () => {
    const previous = STEPS[index - 1];
    if (previous) setStep(previous);
  };

  /** Save this step's answer (best effort: IndexedDB can be unavailable), then move on. */
  const saveAndNext = async () => {
    try {
      if (step === "trip") {
        await setLocalSettings({
          destination: destination ?? undefined,
          travelMonth: travelMonth && travelMonth !== LATER ? travelMonth : undefined,
        });
      } else if (step === "voice") {
        await setLocalSettings({ speakerGender });
      } else if (step === "spanish" && spanishComfort) {
        await setLocalSettings({ spanishComfort });
      }
    } catch {
      // The answer is lost on this device, but setup must never block the app.
    }
    goNext();
  };

  const filtered = query.trim()
    ? destinations.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase()))
    : destinations;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      {step === "welcome" ? (
        <div className="flex h-11 items-center justify-center">
          <span className="text-wordmark tracking-wordmark text-ink uppercase">{brand.name}</span>
        </div>
      ) : (
        <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="-ml-2 flex size-10 items-center justify-center justify-self-start rounded-full text-ink transition hover:bg-sand/60 motion-reduce:transition-none"
          >
            <ChevronLeft className="size-[22px]" />
          </button>
          {questionNumber > 0 ? (
            <div
              role="progressbar"
              aria-label="Setup progress"
              aria-valuemin={1}
              aria-valuemax={QUESTION_STEPS.length}
              aria-valuenow={questionNumber}
              className="flex gap-1"
            >
              {QUESTION_STEPS.map((s, i) => (
                <span
                  key={s}
                  className={cn("h-1 w-6 rounded-full border border-hairline", i < questionNumber && "bg-charcoal")}
                />
              ))}
            </div>
          ) : (
            <span />
          )}
          <span className="justify-self-end">
            {questionNumber > 0 ? (
              <button type="button" onClick={goNext} className={textButton}>
                Skip
              </button>
            ) : (
              <button type="button" onClick={() => finish()} className={textButton}>
                Not now
              </button>
            )}
          </span>
        </div>
      )}

      {step === "welcome" && (
        <section className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col justify-center gap-4">
            <Eyebrow>Before you go</Eyebrow>
            <h1 className="text-display font-display text-ink">Let&rsquo;s tune {brand.name} to your trip.</h1>
            <p className="text-lead text-muted">
              Three quick questions so the phrases fit where you&rsquo;re going and who&rsquo;s speaking.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={goNext} className={primaryButton}>
              Start <ArrowRight aria-hidden className="size-[18px]" />
            </button>
            <button type="button" onClick={() => finish()} className={cn(textButton, "self-center")}>
              Skip, go to the phrasebook
            </button>
          </div>
        </section>
      )}

      {step === "trip" && (
        <section aria-labelledby="q-trip" className="flex flex-1 flex-col gap-4 pt-4">
          <Eyebrow>1 of 3 · Your trip</Eyebrow>
          <h1 id="q-trip" className="text-h1 font-display text-ink">Where are you headed?</h1>

          <label className="flex items-center gap-2 rounded-field border border-hairline bg-card px-4 py-3 text-ink focus-within:border-blush">
            <Search aria-hidden className="size-4 shrink-0" />
            <span className="sr-only">Search countries</span>
            <input
              id="destination-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries"
              autoComplete="off"
              className="text-body min-w-0 flex-1 bg-transparent placeholder:text-muted focus:outline-none"
            />
          </label>

          <div role="radiogroup" aria-labelledby="q-trip" className="flex flex-wrap gap-1.5">
            {filtered.map((d) => {
              const selected = destination === d.code;
              return (
                <button
                  key={d.code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setDestination(selected ? null : d.code)}
                  className={chipClass(selected)}
                >
                  {selected && <Check aria-hidden className="size-3.5" />}
                  {d.name}
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={destination === null}
              onClick={() => setDestination(null)}
              className={chipClass(destination === null)}
            >
              Not sure yet
            </button>
          </div>

          <p id="q-month" className="text-small font-bold tracking-wide text-ink uppercase">
            When?
          </p>
          <div role="radiogroup" aria-labelledby="q-month" className="flex flex-wrap gap-1.5">
            {[...months, { value: LATER, label: "Later" }].map((m) => {
              const selected = travelMonth === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTravelMonth(selected ? null : m.value)}
                  className={chipClass(selected)}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1" />
          <button type="button" onClick={() => void saveAndNext()} className={primaryButton}>
            Next
          </button>
        </section>
      )}

      {step === "voice" && (
        <section aria-labelledby="q-voice" className="flex flex-1 flex-col gap-4 pt-4">
          <Eyebrow>2 of 3 · Your voice</Eyebrow>
          <h1 id="q-voice" className="text-h1 font-display text-ink">How should Spanish refer to you?</h1>
          <p className="text-small text-muted">Some words change with who&rsquo;s speaking. We never guess.</p>
          <div role="radiogroup" aria-labelledby="q-voice" className="flex flex-col gap-2">
            {SPEAKER_GENDERS.map((gender) => {
              const selected = speakerGender === gender;
              return (
                <button
                  key={gender}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSpeakerGender(gender)}
                  className={optionClass(selected)}
                >
                  <Radio selected={selected} />
                  <span className="min-w-0">
                    <span className="text-body-bold block text-ink">{SPEAKER_GENDER_LABELS.en[gender]}</span>
                    <span lang={locale} className="text-small block font-bold text-ink">
                      {SPEAKER_GENDER_EXAMPLES[locale]?.[gender]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <button type="button" onClick={() => void saveAndNext()} className={primaryButton}>
            Next
          </button>
        </section>
      )}

      {step === "spanish" && (
        <section aria-labelledby="q-spanish" className="flex flex-1 flex-col gap-4 pt-4">
          <Eyebrow>3 of 3 · Your Spanish</Eyebrow>
          <h1 id="q-spanish" className="text-h1 font-display text-ink">How much Spanish do you have?</h1>
          <div role="radiogroup" aria-labelledby="q-spanish" className="flex flex-col gap-2">
            {SPANISH_COMFORT_LEVELS.map((level) => {
              const selected = spanishComfort === level;
              const { label, hint } = SPANISH_COMFORT_LABELS.en[level];
              return (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSpanishComfort(level)}
                  className={optionClass(selected)}
                >
                  <Radio selected={selected} />
                  <span className="min-w-0">
                    <span className="text-body-bold block text-ink">{label}</span>
                    <span className="text-small block text-muted">{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <button type="button" onClick={() => void saveAndNext()} className={primaryButton}>
            Finish
          </button>
        </section>
      )}

      {step === "account" && (
        <section aria-labelledby="q-account" className="flex flex-1 flex-col gap-4 pt-4">
          <Eyebrow>Optional</Eyebrow>
          <h1 id="q-account" className="text-h1 font-display text-ink">Keep your phrases on every device.</h1>
          <ul className="flex flex-col gap-3">
            {[
              "Your vault syncs to your phone and laptop",
              "Build a trip pack written for your trip",
              "Nothing is lost if you change phones",
            ].map((line) => (
              <li key={line} className="text-body flex items-start gap-3 text-ink">
                <span aria-hidden className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full border border-hairline bg-sand">
                  <Check className="size-3.5" />
                </span>
                {line}
              </li>
            ))}
          </ul>
          <div className="flex-1" />
          <p className="text-small text-center text-muted">Your answers are saved on this phone either way.</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/auth/sign-up?next=/"
              onClick={() => markOnboardingComplete()}
              className={primaryButton}
            >
              Create account
            </Link>
            <button type="button" onClick={() => finish()} className={secondaryButton}>
              Continue without account
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
