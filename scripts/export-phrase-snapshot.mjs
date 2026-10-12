// Writes src/lib/phrases.snapshot.json, the phrase library bundled into the
// app (SPEC.md §7 "The phrase library").
//
//   DATABASE_URL=... node scripts/export-phrase-snapshot.mjs   # from Neon (source of truth)
//   node scripts/export-phrase-snapshot.mjs --from-csv         # from data/phrases/*.csv
//
// --from-csv is for machines without database access. It produces the same
// file as long as the seed (scripts/build-phrase-seed.mjs) has been applied.
import { writeFileSync } from "node:fs";
import { readPhraseCsvs } from "./phraseCsv.mjs";

async function fromNeon() {
  const { neon } = await import("@neondatabase/serverless");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const sql = neon(process.env.DATABASE_URL);
  return sql`
    select id, locale, category,
           source_text as "sourceText", literal, natural_text as "natural",
           cultural_note as "culturalNote", pronunciation, sort_order as "sortOrder"
    from phrases`;
}

const rows = process.argv.includes("--from-csv") ? readPhraseCsvs() : await fromNeon();

const snapshot = rows
  .toSorted((a, b) => a.locale.localeCompare(b.locale) || a.sortOrder - b.sortOrder)
  .map(({ id, locale, category, sourceText, literal, natural, culturalNote, pronunciation }) => ({
    id,
    locale,
    category,
    sourceText,
    literal,
    natural,
    ...(culturalNote ? { culturalNote } : {}),
    pronunciation,
  }));

writeFileSync("src/lib/phrases.snapshot.json", JSON.stringify(snapshot, null, 2) + "\n");
console.log(`src/lib/phrases.snapshot.json: ${snapshot.length} phrases`);
