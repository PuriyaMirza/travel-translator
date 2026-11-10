"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, Check, ChevronDown, ChevronLeft, MapPin } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { brand } from "@/lib/brand";
import { destinationsFor } from "@/lib/destinations";
import { SPANISH_COMFORT_LABELS, SPEAKER_GENDER_EXAMPLES, SPEAKER_GENDER_LABELS } from "@/lib/labels";
import { getLocalSettings, setLocalSettings } from "@/lib/local/settings";
import { markOnboardingComplete, monthOptions } from "@/lib/onboarding";
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

const primaryButton =
  "text-body-bold flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-inverse transition hover:bg-brand-hover active:scale-[0.98] disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100";
const secondaryButton =
  "text-body-bold flex w-full items-center justify-center rounded-full border border-hairline bg-card px-6 py-3 text-ink transition hover:bg-sand/60 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";
const textButton =
  "text-small rounded-full px-3 py-2 font-semibold text-ink transition hover:bg-sand/60 motion-reduce:transition-none";

/**
 * A native select styled like the app's text fields (rounded-field, ink
 * outline). Native, so phones open their own picker. Empty value = not answered.
 */
function Dropdown({
  id,
  labelledBy,
  icon: Icon,
  placeholder,
  value,
  options,
  onChange,
}: {
  id: string;
  labelledBy: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  placeholder: string;
  value: string | null;
  options: readonly { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="relative text-ink">
      <Icon aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2" />
      <select
        id={id}
        aria-labelledby={labelledBy}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "text-body w-full appearance-none rounded-field border border-hairline bg-card py-3 pr-11 pl-11 focus:border-blush focus:outline-none",
          value ? "text-ink" : "text-muted",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2" />
    </div>
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
    <span aria-hidden className="mt-[5px] flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-hairline">
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
  const months = useMemo(() => monthOptions(new Date()), []);

  const [step, setStep] = useState<Step>("welcome");
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
          travelMonth: travelMonth ?? undefined,
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
            {/* Upright on purpose (owner feedback): the one non-italic Fraunces title. */}
            <h1 className="font-display text-[44px] leading-[1.05] font-light text-balance text-ink not-italic!">
              Let&rsquo;s tune {brand.name} to your trip.
            </h1>
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

          <Dropdown
            id="destination"
            labelledBy="q-trip"
            icon={MapPin}
            placeholder="Not sure yet"
            value={destination}
            options={destinations.map((d) => ({ value: d.code, label: d.name }))}
            onChange={setDestination}
          />

          <h2 id="q-month" className="text-h1 pt-4 font-display text-ink">
            What time of year?
          </h2>
          <Dropdown
            id="travel-month"
            labelledBy="q-month"
            icon={Calendar}
            placeholder="Not sure yet"
            value={months.some((m) => m.value === travelMonth) ? travelMonth : null}
            options={months}
            onChange={setTravelMonth}
          />

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
          <div role="radiogroup" aria-labelledby="q-voice" className="flex flex-col gap-4">
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
                  <span className="flex min-w-0 flex-col gap-2.5">
                    <span className="text-h2 block text-ink">{SPEAKER_GENDER_LABELS.en[gender]}</span>
                    <span lang={locale} className="text-body block text-ink italic">
                      &ldquo;{SPEAKER_GENDER_EXAMPLES[locale]?.[gender]}&rdquo;
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
          <div role="radiogroup" aria-labelledby="q-spanish" className="flex flex-col gap-4">
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
                  <span className="flex min-w-0 flex-col gap-2.5">
                    <span className="text-h2 block text-ink">{label}</span>
                    <span className="text-body block text-muted italic">&ldquo;{hint}&rdquo;</span>
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
