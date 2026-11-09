/**
 * Onboarding helpers: the "already done" flag and travel-month formatting.
 *
 * The flag is per device and lives in localStorage, not IndexedDB, on purpose:
 * `clearUserData()` wipes IndexedDB on sign-out, and signing out should not
 * send someone back through onboarding. The flag holds no personal data.
 */

/** Fixed internal key, deliberately not derived from `brand.name`. */
const DONE_KEY = "onboarding-done-v1";

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) !== null;
  } catch {
    // Storage blocked (private mode, policy): never trap the user in onboarding.
    return true;
  }
}

export function markOnboardingComplete() {
  try {
    localStorage.setItem(DONE_KEY, new Date().toISOString());
  } catch {
    // Nothing to do: hasCompletedOnboarding() already treats this as done.
  }
}

/** The UI language. Labels are English-only today (see labels.ts). */
const UI_LANGUAGE = "en";

/** "YYYY-MM" for a UTC date. */
function monthValue(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string): Date | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)) : null;
}

/**
 * All twelve months in calendar order, each pointing at its next occurrence:
 * this month and later months are this year, earlier months are next year.
 * Labels are full names ("March"); the year is implied.
 */
export function monthOptions(now: Date): { value: string; label: string }[] {
  const format = new Intl.DateTimeFormat(UI_LANGUAGE, { month: "long", timeZone: "UTC" });
  const thisMonth = now.getUTCMonth();
  const thisYear = now.getUTCFullYear();
  return Array.from({ length: 12 }, (_, month) => {
    const date = new Date(Date.UTC(month < thisMonth ? thisYear + 1 : thisYear, month, 1));
    return { value: monthValue(date), label: format.format(date) };
  });
}

/** "March 2027", or undefined for a malformed value. */
export function travelMonthLabel(value: string): string | undefined {
  const date = parseMonth(value);
  if (!date) return undefined;
  return new Intl.DateTimeFormat(UI_LANGUAGE, { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
