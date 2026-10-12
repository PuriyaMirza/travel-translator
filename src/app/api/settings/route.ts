import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { getSql } from "@/lib/db/sql";
import { SPEAKER_GENDERS } from "@/lib/types";

/**
 * /api/settings (SPEC.md §7 `user_settings`, §12 speaker gender). Both verbs
 * act only on the signed-in user's row. Network-only: the service worker
 * never caches /api/*.
 */

const putSchema = z.object({ speakerGender: z.enum(SPEAKER_GENDERS) });

const COLUMNS = `preferred_locale as "preferredLocale", speaker_gender as "speakerGender", updated_at as "updatedAt"`;

function toJson(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]),
  );
}

const failed = () =>
  NextResponse.json(
    { error: { code: "settings_failed", message: "Couldn't save your settings right now. They are kept on this device." } },
    { status: 500 },
  );

/** `{ settings: null }` when the user has no row yet. */
export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const [row] = await getSql().query(`select ${COLUMNS} from user_settings where user_id = $1`, [auth.userId]);
    return NextResponse.json({ settings: row ? toJson(row) : null });
  } catch (error) {
    console.error("GET /api/settings failed:", error);
    return failed();
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid settings." } }, { status: 400 });
  }

  try {
    const [row] = await getSql().query(
      `insert into user_settings (user_id, speaker_gender, updated_at)
       values ($1, $2, now())
       on conflict (user_id) do update set speaker_gender = excluded.speaker_gender, updated_at = now()
       returning ${COLUMNS}`,
      [auth.userId, parsed.data.speakerGender],
    );
    return NextResponse.json({ settings: toJson(row) });
  } catch (error) {
    console.error("PUT /api/settings failed:", error);
    return failed();
  }
}
