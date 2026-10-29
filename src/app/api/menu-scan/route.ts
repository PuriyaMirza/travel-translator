import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { MenuScanRequestError, scanMenu, type MenuMediaType } from "@/lib/menuScan";
import {
  MENU_NOT_A_MENU_MESSAGE,
  MENU_NOT_AN_IMAGE_MESSAGE,
  MENU_RATE_LIMITED_MESSAGE,
  MENU_SIGN_IN_MESSAGE,
  MENU_TOO_LARGE_MESSAGE,
} from "@/lib/messages";
import { isRateLimited } from "@/lib/rateLimit";

/**
 * POST /api/menu-scan — SPEC.md §14. One non-streaming vision call that can
 * run for a minute on a long menu, so the route lifts the default duration;
 * `menuScan.ts` cuts the model call off at 110s, inside it. Never log or store
 * the image or any menu text.
 */
export const maxDuration = 120;

// SPEC.md §14 asks for JPEG (the client always re-encodes to it); PNG and WebP
// are accepted too because the model reads them and a direct API caller may
// send either.
const MEDIA_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];

// The client keeps photos under this (SPEC.md §14); Vercel rejects bodies over
// 4.5 MB before the route runs.
const MAX_BYTES = 4 * 1024 * 1024;

const fail = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(request: NextRequest) {
  const auth = await requireUser(MENU_SIGN_IN_MESSAGE);
  if (auth.response) return auth.response;

  // SPEC.md §14 order: throttle before validation, so a malformed request
  // still spends one of the 10.
  if (isRateLimited(auth.userId, "menuScan")) {
    return fail(429, "rate_limited", MENU_RATE_LIMITED_MESSAGE);
  }

  let image: FormDataEntryValue | null;
  try {
    image = (await request.formData()).get("image");
  } catch {
    return fail(415, "unsupported_type", MENU_NOT_AN_IMAGE_MESSAGE);
  }
  if (!(image instanceof File) || !MEDIA_TYPES.includes(image.type)) {
    return fail(415, "unsupported_type", MENU_NOT_AN_IMAGE_MESSAGE);
  }
  if (image.size > MAX_BYTES) {
    return fail(413, "too_large", MENU_TOO_LARGE_MESSAGE);
  }

  try {
    const bytes = new Uint8Array(await image.arrayBuffer());
    const scan = await scanMenu(bytes, image.type as MenuMediaType);
    if (!scan.isMenu) {
      return fail(422, "not_a_menu", MENU_NOT_A_MENU_MESSAGE);
    }
    return NextResponse.json({ scan });
  } catch (error) {
    if (error instanceof MenuScanRequestError) {
      return NextResponse.json({ error: error.info }, { status: 502 });
    }
    // The error name only: never the object, in case it carries request content.
    console.error("Unexpected error in /api/menu-scan:", error instanceof Error ? error.name : "unknown");
    return fail(500, "unknown", "Something went wrong. Try again.");
  }
}
