import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rateLimit";
import { translate, TranslationRequestError } from "@/lib/translate";
import { SPEAKER_GENDERS, type SpeakerGender } from "@/lib/types";

/**
 * POST /translate — SPEC.md §6. Public in M2, protected only by the input
 * cap in `translate.ts` and the coarse per-IP throttle below (SPEC.md §10);
 * full auth arrives in M3.
 */
export async function POST(request: NextRequest) {
  // No X-Forwarded-For on localhost or most local proxies — "unknown" then
  // shares one bucket, which is fine for dev and no worse than no throttle.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many translations right now — wait a moment and try again." } },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "empty", message: "Type something to translate." } },
      { status: 400 },
    );
  }

  const text = typeof body === "object" && body !== null && "text" in body ? body.text : undefined;
  if (typeof text !== "string") {
    return NextResponse.json(
      { error: { code: "empty", message: "Type something to translate." } },
      { status: 400 },
    );
  }

  // Optional (SPEC.md §12). Absent means neutral; present but not one of the
  // three slugs is a client bug, so it is rejected rather than guessed at.
  const rawGender =
    typeof body === "object" && body !== null && "speakerGender" in body && body.speakerGender !== undefined
      ? body.speakerGender
      : "neutral";
  if (!SPEAKER_GENDERS.includes(rawGender as SpeakerGender)) {
    return NextResponse.json(
      { error: { code: "unknown", message: "Unknown speaker setting. Choose neutral, feminine or masculine." } },
      { status: 400 },
    );
  }

  try {
    const phrase = await translate(text, rawGender as SpeakerGender);
    return NextResponse.json({ phrase });
  } catch (error) {
    if (error instanceof TranslationRequestError) {
      const status = error.info.code === "empty" || error.info.code === "too_long" ? 400 : 502;
      return NextResponse.json({ error: error.info }, { status });
    }
    // Unreachable in practice — translate() catches everything into
    // TranslationRequestError — but never echo a raw error to the client
    // (SPEC.md §6) if it somehow isn't one.
    console.error("Unexpected error in /api/translate:", error);
    return NextResponse.json(
      { error: { code: "unknown", message: "Something went wrong. Try again." } },
      { status: 500 },
    );
  }
}
