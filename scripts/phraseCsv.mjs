// Shared reader for data/phrases/*.csv (one file per locale, shared ids).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const COLUMNS = [
  "id",
  "situation",
  "locale",
  "english",
  "natural",
  "literal",
  "pronunciation",
  "cultural_note",
  "moment",
  "review",
];

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, CRLF or LF. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const REPLY_COLUMNS = ["phrase_id", "sort_order", "reply", "meaning", "review"];

/**
 * Every likely reply across every locale file in data/replies (SPEC.md §14):
 * one file per locale, named `<locale>.csv`. Throws if a reply names a phrase
 * that does not exist for that locale, so a typo fails the build step rather
 * than silently dropping a reply.
 */
export function readReplyCsvs(phrases, dir = "data/replies") {
  const known = new Set(phrases.map((p) => `${p.locale}|${p.id}`));
  const replies = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".csv")).sort()) {
    const locale = file.replace(/\.csv$/, "");
    const [header, ...rows] = parseCsv(readFileSync(join(dir, file), "utf8").replace(/^\uFEFF/, ""));
    if (header.join() !== REPLY_COLUMNS.join()) {
      throw new Error(`${file}: expected columns ${REPLY_COLUMNS.join(",")}, got ${header.join(",")}`);
    }
    for (const cells of rows) {
      const r = Object.fromEntries(REPLY_COLUMNS.map((c, i) => [c, cells[i]]));
      if (!known.has(`${locale}|${r.phrase_id}`)) {
        throw new Error(`${file}: reply for unknown phrase "${r.phrase_id}"`);
      }
      if (!r.reply || !r.meaning) throw new Error(`${file}: empty reply or meaning for "${r.phrase_id}"`);
      replies.push({
        phraseId: r.phrase_id,
        locale,
        sortOrder: Number(r.sort_order),
        text: r.reply,
        meaning: r.meaning,
        review: r.review === "draft" ? "draft" : "ok",
      });
    }
  }
  return replies;
}

const SLOT_COLUMNS = ["phrase_id", "option_id", "sort_order", "english", "natural", "literal", "pronunciation", "review"];
const SLOT = "{slot}";
const slotCount = (text) => text.split(SLOT).length - 1;

/**
 * Every fill-in-the-blank option across every locale file in data/slots
 * (SPEC.md §14), one file per locale. A template is a phrase whose English,
 * natural, literal and pronunciation each contain `{slot}` exactly once.
 *
 * Throws on anything that would render a broken sentence: an option for a
 * phrase that is not a template, a template with fewer than two options, a
 * template missing the marker in one of its four fields, or an empty cell.
 */
export function readSlotCsvs(phrases, dir = "data/slots") {
  const options = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".csv")).sort()) {
    const locale = file.replace(/\.csv$/, "");
    const [header, ...rows] = parseCsv(readFileSync(join(dir, file), "utf8").replace(/^﻿/, ""));
    if (header.join() !== SLOT_COLUMNS.join()) {
      throw new Error(`${file}: expected columns ${SLOT_COLUMNS.join(",")}, got ${header.join(",")}`);
    }
    for (const cells of rows) {
      const r = Object.fromEntries(SLOT_COLUMNS.map((c, i) => [c, cells[i]]));
      if (!r.option_id || !r.english || !r.natural || !r.literal || !r.pronunciation) {
        throw new Error(`${file}: empty cell in option "${r.option_id}" of "${r.phrase_id}"`);
      }
      options.push({
        phraseId: r.phrase_id,
        locale,
        id: r.option_id,
        sortOrder: Number(r.sort_order),
        sourceText: r.english,
        natural: r.natural,
        literal: r.literal,
        pronunciation: r.pronunciation,
        review: r.review === "draft" ? "draft" : "ok",
      });
    }
  }

  const counts = Map.groupBy(options, (o) => `${o.locale}|${o.phraseId}`);
  const byKey = new Map(phrases.map((p) => [`${p.locale}|${p.id}`, p]));
  for (const key of counts.keys()) {
    if (!byKey.has(key)) throw new Error(`data/slots: options for unknown phrase "${key}"`);
  }
  for (const [key, p] of byKey) {
    const fields = [p.sourceText, p.natural, p.literal, p.pronunciation].map(slotCount);
    const isTemplate = fields.some((n) => n > 0);
    const n = counts.get(key)?.length ?? 0;
    if (!isTemplate && n > 0) throw new Error(`data/slots: "${key}" has options but no ${SLOT} marker`);
    if (!isTemplate) continue;
    if (fields.some((c) => c !== 1)) {
      throw new Error(`"${key}": ${SLOT} must appear exactly once in english, natural, literal and pronunciation`);
    }
    if (n < 2) throw new Error(`"${key}" is a template but has ${n} option(s); it needs at least two`);
  }
  return options;
}

/** Every phrase row across every locale file, in file order. */
export function readPhraseCsvs(dir = "data/phrases") {
  const phrases = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".csv")).sort()) {
    const text = readFileSync(join(dir, file), "utf8").replace(/^﻿/, "");
    const [header, ...rows] = parseCsv(text);
    if (header.join() !== COLUMNS.join()) {
      throw new Error(`${file}: expected columns ${COLUMNS.join(",")}, got ${header.join(",")}`);
    }
    rows.forEach((cells, index) => {
      const r = Object.fromEntries(COLUMNS.map((c, i) => [c, cells[i]]));
      phrases.push({
        id: r.id,
        locale: r.locale,
        category: r.situation,
        sourceText: r.english,
        literal: r.literal,
        natural: r.natural,
        culturalNote: r.cultural_note,
        pronunciation: r.pronunciation,
        // Sub-group within the category (SPEC.md §14). Empty = ungrouped.
        moment: r.moment,
        // "draft" until a fluent speaker has read the row; empty means "ok".
        review: r.review === "draft" ? "draft" : "ok",
        sortOrder: index,
      });
    });
  }
  return phrases;
}
