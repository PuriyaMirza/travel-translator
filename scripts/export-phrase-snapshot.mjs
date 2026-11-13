// Writes src/lib/phrases.snapshot.json, the phrase library bundled into the
// app (SPEC.md §7 "The phrase library").
//
//   DATABASE_URL=... node scripts/export-phrase-snapshot.mjs   # from Neon (source of truth)
//   node scripts/export-phrase-snapshot.mjs --from-csv         # from data/phrases/*.csv
//
// --from-csv is for machines without database access. It produces the same
// file as long as the seed (scripts/build-phrase-seed.mjs) has been applied.
import { writeFileSync } from "node:fs";
import { readPhraseCsvs, readReplyCsvs } from "./phraseCsv.mjs";

async function fromNeon() {
  const { neon } = await import("@neondatabase/serverless");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const sql = neon(process.env.DATABASE_URL);
  return sql`
    select id, locale, category,
           source_text as "sourceText", literal, natural_text as "natural",
           cultural_note as "culturalNote", pronunciation, sort_order as "sortOrder",
           coalesce(moment, '') as "moment", review
    from phrases`;
}

async function repliesFromNeon() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  return sql`
    select phrase_id as "phraseId", locale, sort_order as "sortOrder",
           reply as "text", meaning, review
    from phrase_replies`;
}

const fromCsv = process.argv.includes("--from-csv");
const rows = fromCsv ? readPhraseCsvs() : await fromNeon();
const replyRows = fromCsv ? readReplyCsvs(rows) : await repliesFromNeon();

// phrase key -> its replies in order (SPEC.md §14 "Likely replies").
const repliesByPhrase = Map.groupBy(
  replyRows.toSorted((a, b) => a.sortOrder - b.sortOrder),
  (r) => `${r.locale}|${r.phraseId}`,
);

const snapshot = rows
  .toSorted((a, b) => a.locale.localeCompare(b.locale) || a.sortOrder - b.sortOrder)
  .map(({ id, locale, category, sourceText, literal, natural, culturalNote, pronunciation, moment, review }) => {
    const replies = repliesByPhrase.get(`${locale}|${id}`) ?? [];
    // One flag per phrase in the bundle: draft if the row or any reply is.
    const draft = review === "draft" || replies.some((r) => r.review === "draft");
    return {
    id,
    locale,
    category,
    sourceText,
    literal,
    natural,
    ...(culturalNote ? { culturalNote } : {}),
    pronunciation,
    ...(moment ? { moment } : {}),
    ...(replies.length ? { replies: replies.map(({ text, meaning }) => ({ text, meaning })) } : {}),
    ...(draft ? { review: "draft" } : {}),
    };
  });

writeFileSync("src/lib/phrases.snapshot.json", JSON.stringify(snapshot, null, 2) + "\n");
console.log(`src/lib/phrases.snapshot.json: ${snapshot.length} phrases, ${replyRows.length} replies`);
