"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import {
  Camera,
  ChevronDown,
  Image as ImageIcon,
  LoaderCircle,
  RotateCw,
  ScanLine,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { MenuImageError, prepareMenuImage } from "@/lib/menuImage";
import { MenuScanSchema, type MenuScan } from "@/lib/menuScanSchema";
import {
  MENU_DECODE_MESSAGE,
  MENU_NOT_A_MENU_MESSAGE,
  MENU_NOT_AN_IMAGE_MESSAGE,
  MENU_RATE_LIMITED_MESSAGE,
  MENU_SIGN_IN_MESSAGE,
  MENU_TOO_LARGE_MESSAGE,
  MENU_UPSTREAM_MESSAGE,
  NETWORK_MESSAGE,
  OFFLINE_MENU_MESSAGE,
} from "@/lib/messages";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./Eyebrow";
import { countItems, currencyLabel, currencyName, MenuTable } from "./MenuTable";

/* ---------------------------------------------------------------------------
 * Network. EVERYTHING that talks to the server lives in `fetchMenuScan`.
 *
 * TODO (M7 Phase 2): replace the body with the real call —
 *   POST /api/menu-scan, multipart/form-data, one field `image` (the blob as
 *   "menu.jpg") — and `{ scan }` out of a 200. For any non-200, read
 *   `body.error.{code,message}` and throw `new MenuScanFetchError(status, code,
 *   message)`. A rejected `fetch` (no network) can just propagate: the scanner
 *   treats any non-MenuScanFetchError, non-abort throw as a network failure.
 *   Then delete the fixture import and `devForcedFailure` below.
 * ------------------------------------------------------------------------- */

/** A non-200 from /api/menu-scan, in the route's `{ error: { code, message } }` shape. */
export class MenuScanFetchError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "MenuScanFetchError";
    this.status = status;
    this.code = code;
  }
}

const STUB_DELAY_MS = 1800;

/**
 * Dev only: `/menu?force=401|413|415|422|429|502|500|network|slow` makes the
 * stub fail (or, for `slow`, take 20 s so the "up to a minute" line shows).
 */
function devForcedFailure(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  return new URLSearchParams(window.location.search).get("force");
}

const FORCED_ERRORS: Record<string, [number, string]> = {
  "401": [401, "unauthorized"],
  "413": [413, "too_large"],
  "415": [415, "unsupported_type"],
  "422": [422, "not_a_menu"],
  "429": [429, "rate_limited"],
  "502": [502, "upstream"],
  "500": [500, "unknown"],
};

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

// `blob` goes unused until the real call lands.
export async function fetchMenuScan(blob: Blob, signal: AbortSignal): Promise<MenuScan> {
  const force = devForcedFailure();
  await wait(force === "slow" ? 20_000 : STUB_DELAY_MS, signal);
  if (force === "network") throw new TypeError("Failed to fetch");
  const forced = force ? FORCED_ERRORS[force] : undefined;
  if (forced) throw new MenuScanFetchError(forced[0], forced[1], "Forced for development.");
  const { default: fixture } = await import(
    "../../data/menu-fixtures/01-ja-renoir-coffee.expected.json"
  );
  return MenuScanSchema.parse(fixture);
}

/* ------------------------------------------------------------------------- */

type Stage =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "result"; scan: MenuScan }
  | { status: "signin" }
  // `retryable`: sending the same photo again could work. When it can't (too
  // large, not a menu, not an image), the capture buttons are the retry.
  | { status: "error"; message: string; retryable: boolean };

function failureStage(error: unknown): Stage {
  if (error instanceof MenuImageError) {
    return {
      status: "error",
      message: error.reason === "too-large" ? MENU_TOO_LARGE_MESSAGE : MENU_DECODE_MESSAGE,
      retryable: false,
    };
  }
  if (error instanceof MenuScanFetchError) {
    switch (error.status) {
      case 401:
        return { status: "signin" };
      case 413:
        return { status: "error", message: MENU_TOO_LARGE_MESSAGE, retryable: false };
      case 415:
        return { status: "error", message: MENU_NOT_AN_IMAGE_MESSAGE, retryable: false };
      case 422:
        return { status: "error", message: MENU_NOT_A_MENU_MESSAGE, retryable: false };
      case 429:
        return { status: "error", message: MENU_RATE_LIMITED_MESSAGE, retryable: true };
      default:
        return { status: "error", message: MENU_UPSTREAM_MESSAGE, retryable: true };
    }
  }
  return { status: "error", message: NETWORK_MESSAGE, retryable: true };
}

const focusRing =
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const outlineButton =
  "text-body-bold inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-hairline bg-card px-6 py-2.5 text-ink transition hover:bg-sand/50 motion-reduce:transition-none";

/** A real file input, labelled by its visible text; the label is the button. */
function CaptureButton({
  label,
  icon: Icon,
  capture,
  primary,
  inputRef,
  onFile,
}: {
  label: string;
  icon: LucideIcon;
  capture?: "environment";
  primary?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
}) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so choosing the same photo again still fires `change`.
    event.target.value = "";
    if (file) onFile(file);
  };
  return (
    <label
      className={cn(
        "text-body-bold relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-2.5 transition motion-reduce:transition-none",
        primary
          ? "bg-brand text-inverse hover:bg-brand-hover"
          : "border border-hairline bg-card text-ink hover:bg-sand/50",
        focusRing,
      )}
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      {label}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture}
        onChange={onChange}
        className="sr-only"
      />
    </label>
  );
}

function CaptureButtons({
  onFile,
  takeRef,
  className,
}: {
  onFile: (file: File) => void;
  takeRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <CaptureButton
        label="Take photo"
        icon={Camera}
        capture="environment"
        primary
        inputRef={takeRef}
        onFile={onFile}
      />
      <CaptureButton label="Choose photo" icon={ImageIcon} onFile={onFile} />
    </div>
  );
}

function LoadingView({
  thumbUrl,
  onCancel,
  cancelRef,
}: {
  thumbUrl: string | null;
  onCancel: () => void;
  cancelRef: RefObject<HTMLButtonElement | null>;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15_000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        {thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- a local blob: URL, nothing for next/image to optimise
          <img
            src={thumbUrl}
            alt="Your menu photo"
            className="size-24 shrink-0 rounded-image border border-hairline object-cover"
          />
        )}
        <div role="status" aria-live="polite" className="min-w-0 flex-1 pt-1">
          <p className="text-body-bold flex items-center gap-2 text-ink">
            <LoaderCircle aria-hidden className="size-5 shrink-0 motion-safe:animate-spin" />
            Reading your menu…
          </p>
          {slow && <p className="text-small mt-1 text-muted">Long menus can take up to a minute</p>}
        </div>
      </div>

      <div
        aria-hidden
        className="space-y-4 rounded-card border border-hairline bg-card p-4 motion-safe:animate-pulse"
      >
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <div className="h-4 w-1/4 rounded-full bg-sand" />
            <div className="h-4 flex-1 rounded-full bg-sand" />
            <div className="h-4 w-1/6 rounded-full bg-sand" />
          </div>
        ))}
      </div>

      <button ref={cancelRef} type="button" onClick={onCancel} className={cn(outlineButton, focusRing)}>
        <X aria-hidden className="size-5 shrink-0" />
        Cancel
      </button>
    </div>
  );
}

function languageName(code: string): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const COMMON_CURRENCIES = ["EUR", "USD", "GBP", "JPY", "MXN"];

function allCurrencies(): string[] {
  try {
    return Intl.supportedValuesOf("currency");
  } catch {
    return [];
  }
}

/**
 * A native <select> laid under a pill that shows the bare code ("JPY"): the
 * collapsed control reads short, the open list reads "Japanese yen (JPY)".
 * The select is the real control, full-size and transparent, so it keeps
 * keyboard, touch and screen-reader behaviour; the wrapper draws its focus ring.
 */
function CurrencyPicker({
  scan,
  value,
  chosen,
  onChange,
}: {
  scan: MenuScan;
  value: string;
  chosen: string[];
  onChange: (code: string) => void;
}) {
  const estimate = scan.currency;
  const groups = useMemo(() => {
    const shown = new Set<string>(estimate ? [estimate] : []);
    const take = (codes: string[]) =>
      codes.filter((code) => {
        if (shown.has(code)) return false;
        shown.add(code);
        return true;
      });
    const common = take([...COMMON_CURRENCIES, ...chosen]);
    const rest = take(allCurrencies());
    return { common, rest };
  }, [estimate, chosen]);

  const showEstimated = scan.currencySource === "estimated" && value !== "" && value === estimate;
  const name = showEstimated
    ? `Currency, estimated: ${currencyName(value)}`
    : value
      ? "Currency"
      : "Currency, not detected";

  return (
    <div className="flex items-center gap-2">
      {showEstimated && (
        <span aria-hidden className="text-small text-muted">
          est.
        </span>
      )}
      <div
        className={cn(
          "text-body-bold relative inline-flex min-h-11 min-w-24 items-center justify-between gap-2 rounded-full border border-hairline bg-card py-2 pr-3 pl-4 text-ink",
          focusRing,
        )}
      >
        <span aria-hidden>{value || "Currency?"}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0" />
        <select
          aria-label={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
        >
          {estimate ? (
            <option value={estimate}>{currencyLabel(estimate)}</option>
          ) : (
            <option value="">Currency? Show prices as printed</option>
          )}
          <optgroup label="Common">
            {groups.common.map((code) => (
              <option key={code} value={code}>
                {currencyLabel(code)}
              </option>
            ))}
          </optgroup>
          <optgroup label="All currencies">
            {groups.rest.map((code) => (
              <option key={code} value={code}>
                {currencyLabel(code)}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    </div>
  );
}

function MenuResult({ scan, onReset }: { scan: MenuScan; onReset: () => void }) {
  // The picker relabels prices for this scan only; it never touches an amount.
  const [currency, setCurrency] = useState(scan.currency);
  const [chosen, setChosen] = useState<string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const sourceLang = scan.sourceLanguage || undefined;
  const language = languageName(scan.sourceLanguage);

  const pick = (code: string) => {
    setCurrency(code);
    if (code && code !== scan.currency) {
      setChosen((current) => (current.includes(code) ? current : [...current, code]));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>
            <span>
              Menu
              {language && (
                <>
                  <span aria-hidden> &middot; </span>
                  <span className="sr-only">, </span>
                  {language}
                </>
              )}
              <span aria-hidden> &rarr; </span>
              <span className="sr-only"> to </span>
              English
            </span>
          </Eyebrow>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-h2 mt-1 text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Your menu
          </h2>
        </div>
        <CurrencyPicker scan={scan} value={currency} chosen={chosen} onChange={pick} />
      </div>

      <MenuTable scan={scan} currency={currency} />

      {scan.notes.length > 0 && (
        <section aria-labelledby="menu-notes-heading">
          <h3 id="menu-notes-heading" className="text-body-bold text-ink">
            Notes
          </h3>
          <ul className="mt-2 space-y-3">
            {scan.notes.map((note, index) => (
              <li key={index}>
                {note.english !== "" && (
                  <p lang="en" className="text-small break-words text-ink">
                    {note.english}
                  </p>
                )}
                {note.original !== "" && note.original !== note.english && (
                  <p lang={sourceLang} className="text-small break-words text-muted">
                    {note.original}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <button type="button" onClick={onReset} className={cn(outlineButton, focusRing)}>
          <ScanLine aria-hidden className="size-5 shrink-0" />
          Scan another
        </button>
        <p className="text-small text-muted">Check prices against the menu.</p>
      </div>
    </div>
  );
}

export function MenuScanner() {
  const [stage, setStage] = useState<Stage>({ status: "empty" });
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  // The persistent live region: it must already be in the DOM when its text changes.
  const [announcement, setAnnouncement] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<File | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const takeRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const focusCapture = useRef(false);

  // Release the thumbnail's object URL when it is replaced or the page closes.
  useEffect(() => {
    return () => {
      if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    };
  }, [thumbUrl]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Move focus to what replaced the content the user acted on. (The result
  // moves its own focus to the results heading.)
  useEffect(() => {
    if (stage.status === "loading") cancelRef.current?.focus();
    else if (stage.status === "error" || stage.status === "signin") messageRef.current?.focus();
    else if (stage.status === "empty" && focusCapture.current) {
      focusCapture.current = false;
      takeRef.current?.focus();
    }
  }, [stage]);

  const backToEmpty = () => {
    abortRef.current?.abort();
    fileRef.current = null;
    blobRef.current = null;
    focusCapture.current = true;
    setThumbUrl(null);
    setAnnouncement("");
    setStage({ status: "empty" });
  };

  const start = async (file: File, prepared?: Blob) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fileRef.current = file;
    setAnnouncement("");
    setThumbUrl(null);

    // Check before spending time on decoding and a request that can't be sent.
    if (!navigator.onLine) {
      setStage({ status: "error", message: OFFLINE_MENU_MESSAGE, retryable: true });
      return;
    }
    if (!prepared && file.type && !file.type.startsWith("image/")) {
      setStage({ status: "error", message: MENU_NOT_AN_IMAGE_MESSAGE, retryable: false });
      return;
    }

    setStage({ status: "loading" });
    try {
      let blob = prepared;
      if (!blob) {
        blobRef.current = null;
        blob = (await prepareMenuImage(file)).blob;
        blobRef.current = blob;
      }
      if (controller.signal.aborted) return;
      setThumbUrl(URL.createObjectURL(blob));

      const scan = await fetchMenuScan(blob, controller.signal);
      if (controller.signal.aborted) return;
      if (!scan.isMenu || countItems(scan) === 0) {
        setStage({ status: "error", message: MENU_NOT_A_MENU_MESSAGE, retryable: false });
        return;
      }
      const count = countItems(scan);
      setThumbUrl(null);
      setAnnouncement(`Found ${count} ${count === 1 ? "item" : "items"}`);
      setStage({ status: "result", scan });
    } catch (error) {
      if (controller.signal.aborted) return;
      setThumbUrl(null);
      setStage(failureStage(error));
    }
  };

  const retry = () => {
    const file = fileRef.current;
    if (file) void start(file, blobRef.current ?? undefined);
    else backToEmpty();
  };

  const onFile = (file: File) => void start(file);

  return (
    <div>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {stage.status === "empty" && (
        <div className="rounded-card border-2 border-dashed border-hairline p-8 text-center">
          <UtensilsCrossed aria-hidden className="mx-auto size-8 text-muted" />
          <p className="text-body mx-auto mt-3 max-w-prose text-ink">
            Photograph a menu to get a table with the original text, the English, and every price.
          </p>
          <CaptureButtons onFile={onFile} takeRef={takeRef} className="mt-5 justify-center" />
        </div>
      )}

      {stage.status === "signin" && (
        <div className="rounded-card border-2 border-dashed border-hairline p-8 text-center">
          <UtensilsCrossed aria-hidden className="mx-auto size-8 text-muted" />
          <p
            ref={messageRef}
            tabIndex={-1}
            className="text-body mt-3 text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {MENU_SIGN_IN_MESSAGE}
          </p>
          <p className="text-small mt-1 text-muted">
            Then photograph any menu and read it as a table in English.
          </p>
          <Link
            href="/auth/sign-in?next=/menu"
            className={cn(
              "text-body-bold mt-5 inline-flex min-h-11 items-center rounded-full bg-brand px-6 py-2.5 text-inverse transition hover:bg-brand-hover motion-reduce:transition-none",
              focusRing,
            )}
          >
            Sign in
          </Link>
        </div>
      )}

      {stage.status === "loading" && (
        <LoadingView thumbUrl={thumbUrl} onCancel={backToEmpty} cancelRef={cancelRef} />
      )}

      {stage.status === "error" && (
        <div className="space-y-5">
          <div className="rounded-card border border-blush bg-brand/5 p-5">
            <p
              ref={messageRef}
              role="alert"
              tabIndex={-1}
              className="text-body text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {stage.message}
            </p>
            {stage.retryable && (
              <button
                type="button"
                onClick={retry}
                className={cn(
                  "text-body-bold mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-inverse transition hover:bg-brand-hover motion-reduce:transition-none",
                  focusRing,
                )}
              >
                <RotateCw aria-hidden className="size-4 shrink-0" />
                Try again
              </button>
            )}
          </div>
          <div>
            <p className="text-small mb-3 text-muted">
              {stage.retryable ? "Or use a different photo." : "Try another photo."}
            </p>
            <CaptureButtons onFile={onFile} />
          </div>
        </div>
      )}

      {stage.status === "result" && <MenuResult scan={stage.scan} onReset={backToEmpty} />}
    </div>
  );
}
