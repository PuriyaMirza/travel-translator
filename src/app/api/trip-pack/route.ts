import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { localeName } from "@/lib/locale";
import { isRateLimited } from "@/lib/rateLimit";
import {
  generateTripPack,
  TRIP_DESCRIPTION_MAX,
  TRIP_TITLE_MAX,
  TripPackRequestError,
} from "@/lib/tripPack";
import { parseTraveller } from "@/lib/traveller";

/**
 * POST /api/trip-pack — SPEC.md §13. The first route that knows who is
 * calling: it needs the session, and throttles per user id rather than per IP.
 * One non-streaming call that can run for minutes, so the route lifts the
 * default duration; `tripPack.ts` cuts the model call off at 240s, inside it.
 */
export const maxDuration = 300;

const invalid = (message: string) =>
  NextResponse.json({ error: { code: "invalid", message } }, { status: 400 });

export async function POST(request: NextRequest) {
  const auth = await requireUser("Sign in to build a trip pack.");
  if (auth.response) return auth.response;

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return invalid("Describe your trip to build a pack.");
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 1 || title.length > TRIP_TITLE_MAX) {
    return invalid(`Give the trip a title of up to ${TRIP_TITLE_MAX} characters.`);
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 1 || description.length > TRIP_DESCRIPTION_MAX) {
    return invalid(`Describe the trip in up to ${TRIP_DESCRIPTION_MAX} characters.`);
  }

  // localeName() throws for any locale the prompt has no name for.
  const locale = typeof body.locale === "string" ? body.locale : "";
  try {
    localeName(locale);
  } catch {
    return invalid("That language isn't available yet.");
  }

  // Speaker gender plus the onboarding answers (SPEC.md §14). A bad
  // speakerGender is rejected; an unknown destination, month or comfort level
  // is dropped.
  const parsed = parseTraveller(body, locale);
  if (!parsed.ok) return invalid(parsed.message);

  // After validation, so a rejected request doesn't spend one of the 3.
  if (isRateLimited(auth.userId, "tripPack")) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "You've built 3 trip packs in the last hour. Try again later." } },
      { status: 429 },
    );
  }

  try {
    const phrases = await generateTripPack(title, description, locale, parsed.traveller);
    return NextResponse.json({ phrases });
  } catch (error) {
    if (error instanceof TripPackRequestError) {
      return NextResponse.json({ error: error.info }, { status: 502 });
    }
    console.error("Unexpected error in /api/trip-pack:", error);
    return NextResponse.json(
      { error: { code: "unknown", message: "Something went wrong. Try again." } },
      { status: 500 },
    );
  }
}
