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
