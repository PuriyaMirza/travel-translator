import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { getSql } from "@/lib/db/sql";

/**
 * /api/trip-packs (SPEC.md §7 `trip_packs`, §13). Trip packs are created
 * online only, so they don't go through the outbox: POST writes one row, GET
 * lists the caller's rows so other devices can name the trips on their saved
 * phrases. Both act only on the signed-in user's rows. Network-only.
 */

const postSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(500),
  locale: z.string().min(1).max(20),
  phraseCount: z.number().int().min(0).max(100),
});

const COLUMNS = `id, locale, title, description, phrase_count as "phraseCount", created_at as "createdAt"`;

function toJson(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]),
  );
}

const failed = () =>
  NextResponse.json(
    { error: { code: "trip_packs_failed", message: "Couldn't reach your trip packs right now. Try again." } },
    { status: 500 },
  );

export async function GET() {
  const auth = await requireUser("Sign in to see your trip packs.");
  if (auth.response) return auth.response;

  try {
    const rows = await getSql().query(
      `select ${COLUMNS} from trip_packs where user_id = $1 order by created_at desc`,
      [auth.userId],
    );
    return NextResponse.json({ tripPacks: rows.map(toJson) });
  } catch (error) {
    console.error("GET /api/trip-packs failed:", error);
    return failed();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser("Sign in to save a trip pack.");
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid trip pack." } }, { status: 400 });
  }
  const { id, title, description, locale, phraseCount } = parsed.data;

  try {
    const sql = getSql();
    // Idempotent on id: a retry after a lost response inserts nothing.
    await sql.query(
      `insert into trip_packs (id, user_id, locale, title, description, phrase_count)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do nothing`,
      [id, auth.userId, locale, title, description, phraseCount],
    );
    // Read back filtered on the caller: an id already owned by someone else
    // is not ours, and is refused rather than silently reported as saved.
    const [row] = await sql.query(`select ${COLUMNS} from trip_packs where id = $1 and user_id = $2`, [
      id,
      auth.userId,
    ]);
    if (!row) {
      return NextResponse.json({ error: { code: "conflict", message: "That trip pack id is taken. Try again." } }, { status: 409 });
    }
    return NextResponse.json({ tripPack: toJson(row) });
  } catch (error) {
    console.error("POST /api/trip-packs failed:", error);
    return failed();
  }
}
