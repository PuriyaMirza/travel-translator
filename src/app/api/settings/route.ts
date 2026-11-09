import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { getSql } from "@/lib/db/sql";
import { SPANISH_COMFORT_LEVELS, SPEAKER_GENDERS } from "@/lib/types";

/**
 * /api/settings (SPEC.md §7 `user_settings`, §12 speaker gender, plus the
 * onboarding answers from migration 002). Both verbs act only on the
 * signed-in user's row. Network-only: the service worker never caches /api/*.
 */

/**
 * A partial update: only the fields present are written. `null` clears an
 * onboarding answer; speaker gender is never null (neutral is its default).
 */
const putSchema = z
  .object({
    speakerGender: z.enum(SPEAKER_GENDERS),
    destination: z.string().regex(/^[A-Z]{2}$/).nullable(),
    travelMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable(),
    spanishComfort: z.enum(SPANISH_COMFORT_LEVELS).nullable(),
  })
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0);

type SettingsPatch = z.infer<typeof putSchema>;

/** Request field → column. The only column names that ever reach the SQL. */
const COLUMN_FOR: Record<keyof SettingsPatch, string> = {
  speakerGender: "speaker_gender",
  destination: "destination",
  travelMonth: "travel_month",
  spanishComfort: "spanish_comfort",
};

const COLUMNS = `preferred_locale as "preferredLocale", speaker_gender as "speakerGender",
  destination, travel_month as "travelMonth", spanish_comfort as "spanishComfort",
  updated_at as "updatedAt"`;

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

  // Column names come from COLUMN_FOR (fixed strings), values are parameters.
  const entries = (Object.keys(parsed.data) as (keyof SettingsPatch)[]).map(
    (key) => [COLUMN_FOR[key], parsed.data[key] ?? null] as const,
  );
  const columns = entries.map(([column]) => column);
  const values = entries.map(([, value]) => value);
  const placeholders = columns.map((_, i) => `$${i + 2}`);
  const updates = columns.map((column) => `${column} = excluded.${column}`);

  try {
    const [row] = await getSql().query(
      `insert into user_settings (user_id, ${columns.join(", ")}, updated_at)
       values ($1, ${placeholders.join(", ")}, now())
       on conflict (user_id) do update set ${updates.join(", ")}, updated_at = now()
       returning ${COLUMNS}`,
      [auth.userId, ...values],
    );
    return NextResponse.json({ settings: toJson(row) });
  } catch (error) {
    console.error("PUT /api/settings failed:", error);
    return failed();
  }
}
