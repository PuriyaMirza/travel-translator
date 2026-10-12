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
        sortOrder: index,
      });
    });
  }
  return phrases;
}
