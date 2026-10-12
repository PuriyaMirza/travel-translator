import { z } from "zod";
import { CATEGORIES } from "@/lib/categories";
import { getSql } from "@/lib/db/sql";
import { SHOW_CARD_KINDS } from "@/lib/types";

/*
 * Server half of the generic sync helper (SPEC.md §7 "Local-first sync"):
 * one config per table — its columns, its dedupe key, its row schema — and
 * one push and one pull that work for any of them.
 *
 * Every identifier in the SQL below comes from these constant configs, never
 * from the request. Values always go through query parameters.
 */

const iso = z.iso.datetime({ offset: true });
const text = (max: number) => z.string().max(max);

const savedPhraseRow = z.object({
  id: z.uuid(),
  locale: text(20),
  sourceText: text(500),
  literal: text(2000),
  natural: text(2000),
  culturalNote: text(2000),
  pronunciation: text(2000),
  category: z.enum(CATEGORIES),
  tripPackId: z.uuid().optional(),
  savedAt: iso,
  updatedAt: iso,
  deletedAt: iso.optional(),
});

const showCardRow = z.object({
  id: z.uuid(),
  locale: text(20),
  kind: z.enum(SHOW_CARD_KINDS),
  title: text(120),
  sourceText: text(500),
  literal: text(2000),
  natural: text(2000),
  culturalNote: text(2000),
  pronunciation: text(2000),
  createdAt: iso,
  updatedAt: iso,
  deletedAt: iso.optional(),
});

interface TableConfig {
  table: string;
  /** camelCase field → snake_case column, for every client-writable column. */
  columns: Record<string, string>;
  /** SQL expression over the table's columns that two duplicates share. */
  dedupe: { expression: string; fields: string[] };
  schema: z.ZodType<Record<string, unknown>>;
}

export const SYNC_TABLES = {
  savedPhrases: {
    table: "saved_phrases",
    columns: {
      id: "id",
      locale: "locale",
      sourceText: "source_text",
      literal: "literal",
      natural: "natural_text",
      culturalNote: "cultural_note",
      pronunciation: "pronunciation",
      category: "category",
      tripPackId: "trip_pack_id",
      savedAt: "saved_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    },
    dedupe: {
      expression: "locale || '|' || lower(trim(source_text))",
      fields: ["locale", "sourceText"],
    },
    schema: savedPhraseRow,
  },
  showCards: {
    table: "show_cards",
    columns: {
      id: "id",
      locale: "locale",
      kind: "kind",
      title: "title",
      sourceText: "source_text",
      literal: "literal",
      natural: "natural_text",
      culturalNote: "cultural_note",
      pronunciation: "pronunciation",
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    },
    dedupe: {
      expression: "kind || '|' || locale || '|' || lower(trim(source_text))",
      fields: ["kind", "locale", "sourceText"],
    },
    schema: showCardRow,
  },
} satisfies Record<string, TableConfig>;

export type SyncTableName = keyof typeof SYNC_TABLES;
export const SYNC_TABLE_NAMES = Object.keys(SYNC_TABLES) as SyncTableName[];

/** The push body: up to 500 rows per table. */
export const pushSchema = z.object({
  savedPhrases: z.array(savedPhraseRow).max(500).default([]),
  showCards: z.array(showCardRow).max(500).default([]),
});

/** The dedupe key computed in JS, matching `dedupe.expression` in SQL. */
function dedupeKeyOf(config: TableConfig, row: Record<string, unknown>) {
  return config.dedupe.fields
    .map((f) => (f === "sourceText" ? String(row[f]).trim().toLowerCase() : String(row[f])))
    .join("|");
}

/**
 * Upsert one row, last write wins on updatedAt. Rows owned by another user
 * are never touched: the conflict update is guarded on user_id.
 *
 * Duplicates (same dedupe key, different id — e.g. the same phrase saved on
 * two offline devices) are stored as tombstones, so the device that sent one
 * converges on the surviving row at its next pull.
 */
async function upsertRow(config: TableConfig, userId: string, row: Record<string, unknown>) {
  const sql = getSql();
  const entries = Object.entries(config.columns);

  let deletedAt = row.deletedAt ?? null;
  if (!deletedAt) {
    const [dup] = await sql.query(
      `select id from ${config.table}
       where user_id = $1 and deleted_at is null and id <> $2 and ${config.dedupe.expression} = $3
       limit 1`,
      [userId, row.id, dedupeKeyOf(config, row)],
    );
    if (dup) deletedAt = new Date().toISOString();
  }

  const values = entries.map(([field]) =>
    field === "deletedAt" ? deletedAt : (row[field] ?? null),
  );
  const columnList = entries.map(([, column]) => column).join(", ");
  const placeholders = entries
    .map(([field], i) =>
      // A trip pack id is only kept if that trip pack is the caller's own.
      field === "tripPackId"
        ? `(select id from trip_packs where id = $${i + 2} and user_id = $1)`
        : `$${i + 2}`,
    )
    .join(", ");
  const updates = entries
    .filter(([field]) => field !== "id")
    .map(([, column]) => `${column} = excluded.${column}`)
    .join(", ");

  await sql.query(
    `insert into ${config.table} (user_id, ${columnList}, synced_at)
     values ($1, ${placeholders}, now())
     on conflict (id) do update set ${updates}, synced_at = now()
     where ${config.table}.user_id = $1 and excluded.updated_at > ${config.table}.updated_at`,
    [userId, ...values],
  );
}

export async function pushChanges(userId: string, body: z.infer<typeof pushSchema>) {
  for (const name of SYNC_TABLE_NAMES) {
    const config = SYNC_TABLES[name];
    for (const row of body[name]) {
      try {
        await upsertRow(config, userId, row);
      } catch (error) {
        // Lost a race with a concurrent duplicate: store this one as the tombstone.
        if ((error as { code?: string }).code === "23505") {
          await upsertRow(config, userId, { ...row, deletedAt: new Date().toISOString() });
        } else {
          throw error;
        }
      }
    }
  }
}

/**
 * Pull everything changed since `since` (server clock). Re-reads a 30-second
 * overlap so a write committed late, with an earlier synced_at, isn't missed.
 * Applying a row twice is harmless: the client merges by last write wins.
 */
export async function pullChanges(userId: string, since: string | null) {
  const sql = getSql();
  const [{ now }] = await sql.query("select now() as now");
  const result: Record<string, unknown[]> = {};

  for (const name of SYNC_TABLE_NAMES) {
    const config = SYNC_TABLES[name];
    const select = Object.entries(config.columns)
      .map(([field, column]) => `${column} as "${field}"`)
      .join(", ");
    const rows = await sql.query(
      `select ${select} from ${config.table}
       where user_id = $1 and ($2::timestamptz is null or synced_at > $2::timestamptz - interval '30 seconds')
       order by synced_at`,
      [userId, since],
    );
    result[name] = rows.map((row) =>
      Object.fromEntries(
        Object.entries(row)
          .filter(([, value]) => value !== null)
          .map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]),
      ),
    );
  }

  return { cursor: new Date(now).toISOString(), ...result };
}
