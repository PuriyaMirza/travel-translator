// Reviewed eval for the translate prompt (SPEC.md §14). Not an automated
// test: it runs a fixed input list across destinations and Spanish levels
// against a running app and writes the answers to a Markdown table for a
// person to read.
//
//   node scripts/eval-translate.mjs http://localhost:3000 [out.md]
//
// The app it points at needs ANTHROPIC_API_KEY. Each run makes
// INPUTS x TRAVELLERS model calls (36 as written) and waits between calls to
// stay under /api/translate's 10-per-minute throttle, so it takes about four
// minutes.
import { writeFile } from "node:fs/promises";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const out = process.argv[3] ?? "docs/review/eval-translate.md";

const INPUTS = [
  "Where is the bus stop?",
  "Can I have a straw?",
  "I'd like a beer, please.",
  "Do you have a jacket in a bigger size?",
  "Could you call me a taxi?",
  "I'm allergic to peanuts.",
  "How much is the avocado?",
  "Where can I park the car?",
  "Is there a pharmacy near here?",
];

const TRAVELLERS = [
  { label: "no destination, basic", fields: { spanishComfort: "basic" } },
  { label: "Mexico, none", fields: { destination: "MX", spanishComfort: "none" } },
  { label: "Argentina, none", fields: { destination: "AR", spanishComfort: "none" } },
  { label: "Colombia, conversational", fields: { destination: "CO", spanishComfort: "conversational" } },
];

const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const rows = [];
for (const input of INPUTS) {
  for (const traveller of TRAVELLERS) {
    const response = await fetch(`${base}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input, speakerGender: "neutral", ...traveller.fields }),
    });
    const body = await response.json().catch(() => ({}));
    const p = body.phrase;
    rows.push(
      p
        ? `| ${cell(input)} | ${traveller.label} | ${cell(p.natural)} | ${cell(p.literal)} | ${cell(p.pronunciation)} | ${cell(p.culturalNote)} | |`
        : `| ${cell(input)} | ${traveller.label} | **failed: ${cell(body.error?.message ?? response.status)}** | | | | |`,
    );
    console.log(`${input} / ${traveller.label}: ${p ? p.natural : "FAILED"}`);
    await sleep(6500);
  }
}

await writeFile(
  out,
  `# Translate eval\n\nGenerated ${new Date().toISOString()} against ${base}.\n\n` +
    "What to look for: `literal` should be the same neutral Spanish in every row for one input; " +
    "`natural` should change by country only where the everyday word really differs, with a note saying so; " +
    "\"none\" rows should be short and easy to read aloud.\n\n" +
    "| English | Traveller | Natural | Literal | Pronunciation | Cultural note | Reviewer notes |\n|---|---|---|---|---|---|---|\n" +
    rows.join("\n") +
    "\n",
);
console.log(`Wrote ${out}`);
