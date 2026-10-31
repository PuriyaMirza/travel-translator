#!/usr/bin/env node
/**
 * Menu-scan accuracy eval (SPEC.md §14 "Evaluation").
 *
 * Posts every `data/menu-fixtures/*.jpg` that has a sibling
 * `<name>.expected.json` to a running server and scores the result.
 *
 * Usage:
 *   EVAL_EMAIL=you@example.com EVAL_PASSWORD=... \
 *     node scripts/eval-menu-scan.mjs [--base http://localhost:3000]
 *                                     [--only <substring>]
 *                                     [--out data/menu-fixtures/results/]
 *                                     [--fixtures data/menu-fixtures/]
 *
 * The route is throttled to 10 scans per user per hour, and this runs the
 * fixtures one after another. The nine fixtures fit; a second full run inside
 * the same hour gets 429 (the run stops at the first 429 and reports
 * INCOMPLETE). Use --only to re-run a single fixture.
 *
 * Exit code: 0 all gated targets pass, 1 a gated target failed or the run was
 * incomplete, 2 bad usage or sign-in failure.
 *
 * Sign-in: Neon Auth behind the app's catch-all proxy,
 * `POST {base}/api/auth/sign-in/email` with JSON `{ email, password }` and an
 * `Origin` header. The session cookies come back in Set-Cookie; they are
 * replayed as a `Cookie` header on each scan.
 *
 * The shape this file relies on (src/lib/menuScanSchema.ts, SPEC.md §14):
 *   MenuScan  { isMenu, sourceLanguage, currency, currencySource: "printed"|"estimated",
 *               sections: { original, english, items: MenuItem[] }[], notes[] }
 *   MenuItem  { original, english, description,
 *               prices: { label, amount }[], legibility: "clear"|"partial" }
 * Success: 200 { scan }. Failure: { error: { code, message } }.
 *
 * Scoring decisions the spec leaves open (also printed in the JSON output):
 *   - A fixture whose request fails with anything other than 200 / 422
 *     (401, 413, 429, 5xx, network) is excluded from the metrics and makes the
 *     run INCOMPLETE. A 422 not_a_menu on a fixture that IS a menu is scored as
 *     an empty scan (every expected item missed).
 *   - Invented price = a returned price entry on an unmatched item, or on a
 *     matched item whose expected `prices` is [] (clear or partial). A partial
 *     item that has ground-truth prices is not "invented"; its misses are
 *     reported as "price mismatches on partial items". "Partial-but-priced" is
 *     the subset of invented prices on expected-partial items with no prices.
 *   - Price match is by amount only (orchestrator, metric 2): option labels are
 *     English translations, so label agreement is reported, not gated.
 *   - Items match on exact normalised `original`, so the "returned text is not
 *     longer than expected" clause of the cut-off metric can never fire on a
 *     matched item. Completed text shows up as an unmatched (invented) item
 *     and an unflagged partial; the `completedBy` field in the JSON names it.
 *   - Amounts compare after removing whitespace only: "1,040" is not "1040".
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TARGETS = {
  inventedPrices: { label: "Invented prices", rule: "= 0 (hard gate)" },
  priceExact: { label: "Price exact match (amount), clear items", rule: ">= 98%" },
  recall: { label: "Item recall, clear items", rule: ">= 95%" },
  inventedItems: { label: "Invented items per menu (worst)", rule: "<= 1" },
  partialFlag: { label: "Cut-off flagged partial, no completed text", rule: ">= 90%" },
  notAMenu: { label: "Non-menu photo rejected (422 not_a_menu)", rule: "all" },
};

const REQUEST_TIMEOUT_MS = 150_000; // route maxDuration is 120 s

// ---------------------------------------------------------------- CLI

function usage(exitCode) {
  console.log(`Usage: EVAL_EMAIL=... EVAL_PASSWORD=... node scripts/eval-menu-scan.mjs [options]

  --base <url>        Server to test (default http://localhost:3000)
  --only <substring>  Only fixtures whose file name contains this
  --out <dir>         Results directory (default data/menu-fixtures/results/)
  --fixtures <dir>    Fixture directory (default data/menu-fixtures/)
  --help              This text

Fixtures run one after another. /api/menu-scan is throttled to 10 scans per
user per hour; the nine fixtures fit, a second full run in the same hour will
hit 429. A .jpg with no sibling .expected.json is skipped with a note.`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    base: "http://localhost:3000",
    only: "",
    out: path.join(REPO_ROOT, "data/menu-fixtures/results"),
    fixtures: path.join(REPO_ROOT, "data/menu-fixtures"),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) {
        console.error(`Missing value for ${a}`);
        usage(2);
      }
      return v;
    };
    if (a === "--help" || a === "-h") usage(0);
    else if (a === "--base") args.base = value();
    else if (a === "--only") args.only = value();
    else if (a === "--out") args.out = path.resolve(value());
    else if (a === "--fixtures") args.fixtures = path.resolve(value());
    else {
      console.error(`Unknown argument: ${a}`);
      usage(2);
    }
  }
  try {
    args.base = new URL(args.base).origin;
  } catch {
    console.error(`--base is not a URL: ${args.base}`);
    usage(2);
  }
  return args;
}

// ---------------------------------------------------------------- sign-in

/** "name=value" pairs from Set-Cookie headers; deletions (empty value) dropped. */
function cookiePairs(response) {
  const pairs = [];
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(";", 1)[0].trim();
    const eq = pair.indexOf("=");
    if (eq > 0 && pair.slice(eq + 1) !== "") pairs.push(pair);
  }
  return pairs;
}

async function signIn(base, email, password) {
  let response;
  try {
    response = await fetch(`${base}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new Error(`Could not reach ${base} to sign in: ${err.message}`);
  }
  if (!response.ok) {
    throw new Error(`Sign-in failed: HTTP ${response.status}. Check EVAL_EMAIL / EVAL_PASSWORD and that the account exists.`);
  }
  const pairs = cookiePairs(response);
  if (pairs.length === 0) throw new Error("Sign-in returned 200 but set no session cookie.");
  if (!pairs.some((p) => p.includes("session_token"))) {
    console.warn("Warning: no session_token cookie in the sign-in response; scans may be rejected with 401.");
  }
  return pairs.join("; ");
}

// ---------------------------------------------------------------- request

async function postFixture(base, cookie, jpgPath, fileName) {
  const bytes = await readFile(jpgPath);
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: "image/jpeg" }), fileName);
  const started = performance.now();
  try {
    const response = await fetch(`${base}/api/menu-scan`, {
      method: "POST",
      headers: { Cookie: cookie, Origin: base },
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    const ms = Math.round(performance.now() - started);
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    return {
      status: response.status,
      ms,
      scan: response.status === 200 ? (json?.scan ?? null) : null,
      error: response.status === 200 ? null : (json?.error ?? { code: "non_json", message: text.slice(0, 200) }),
    };
  } catch (err) {
    return {
      status: 0,
      ms: Math.round(performance.now() - started),
      scan: null,
      error: { code: "network", message: err.message },
    };
  }
}

// ---------------------------------------------------------------- scoring

/** NFKC, lower-case, whitespace and Unicode punctuation/symbols removed. */
export function normaliseOriginal(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]/gu, "");
}

const amountKey = (amount) => String(amount ?? "").replace(/\s/gu, "");
const labelKey = (label) => String(label ?? "").trim().toLowerCase();

/**
 * One-to-one match of expected price entries to returned entries on amount
 * (whitespace removed only). Each returned entry is used at most once; where
 * several have the same amount, the one with the same label (trimmed,
 * case-insensitive) is preferred. Returns one record per expected entry.
 */
function matchPrices(expectedPrices, returnedPrices) {
  const used = new Set();
  return expectedPrices.map((e) => {
    const candidates = returnedPrices
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => !used.has(i) && amountKey(r.amount) === amountKey(e.amount));
    const pick = candidates.find(({ r }) => labelKey(r.label) === labelKey(e.label)) ?? candidates[0];
    if (pick) used.add(pick.i);
    return {
      label: e.label,
      amount: e.amount,
      hit: Boolean(pick),
      returnedLabel: pick ? pick.r.label : null,
      labelOk: pick ? labelKey(pick.r.label) === labelKey(e.label) : null,
      usedIdx: pick ? pick.i : -1,
    };
  });
}

function flatten(scan) {
  const items = [];
  for (const section of scan?.sections ?? []) {
    for (const item of section.items ?? []) {
      items.push({
        original: item.original ?? "",
        key: normaliseOriginal(item.original),
        prices: Array.isArray(item.prices) ? item.prices : [],
        legibility: item.legibility,
        section: section.original ?? "",
      });
    }
  }
  return items;
}

/** How many of an expected item's price entries the returned item matches by amount. */
function priceAgreement(returned, expected) {
  return matchPrices(expected.prices, returned.prices).filter((x) => x.hit).length;
}

/**
 * One-to-one match of returned items to expected items on the normalised
 * original, across sections. Duplicate keys: each returned item takes the
 * unused expected item it agrees with most on prices, ties by document order.
 */
function matchItems(expectedItems, returnedItems) {
  const used = new Set();
  const matches = []; // { ret, exp } index pairs; exp === -1 means invented
  returnedItems.forEach((ret, ri) => {
    let best = -1;
    let bestScore = -1;
    if (ret.key !== "") {
      expectedItems.forEach((exp, ei) => {
        if (used.has(ei) || exp.key !== ret.key) return;
        const score = priceAgreement(ret, exp);
        if (score > bestScore) {
          best = ei;
          bestScore = score;
        }
      });
    }
    if (best >= 0) used.add(best);
    matches.push({ ret: ri, exp: best });
  });
  return matches;
}

/** Score one menu fixture. `scan` may be null (treated as an empty scan). */
function scoreMenu(expected, scan) {
  const expectedItems = flatten(expected);
  const returnedItems = flatten(scan);
  const matches = matchItems(expectedItems, returnedItems);
  const expToRet = new Map(matches.filter((m) => m.exp >= 0).map((m) => [m.exp, m.ret]));

  const m = {
    expectedItems: expectedItems.length,
    returnedItems: returnedItems.length,
    clearExpected: 0,
    clearMatched: 0,
    priceEntriesExpected: 0,
    priceEntriesMatched: 0,
    priceLabelAgree: 0,
    partialPriceEntriesExpected: 0,
    partialPriceMismatches: 0,
    partialExpected: 0,
    partialOk: 0,
    inventedItems: 0,
    inventedPrices: 0,
    partialButPriced: 0,
    extraPriceEntriesOnClear: 0,
  };
  const details = { returned: [], expected: [] };

  // Per returned item: invented items and invented prices.
  for (const { ret, exp } of matches) {
    const r = returnedItems[ret];
    const e = exp >= 0 ? expectedItems[exp] : null;
    const d = {
      original: r.original,
      matched: e !== null,
      legibility: r.legibility,
      priceEntries: r.prices.length,
      inventedPrices: 0,
      reason: null,
    };
    if (!e) {
      m.inventedItems++;
      if (r.prices.length > 0) {
        d.inventedPrices = r.prices.length;
        d.reason = "unmatched_item";
      }
    } else if (e.prices.length === 0) {
      if (r.prices.length > 0) {
        d.inventedPrices = r.prices.length;
        d.reason = e.legibility === "partial" ? "partial_item_no_expected_price" : "expected_no_price";
        if (e.legibility === "partial") m.partialButPriced += r.prices.length;
      }
    } else if (e.legibility === "clear") {
      // Not gated: returned entries whose amount is not in the ground truth.
      const matched = matchPrices(e.prices, r.prices).filter((x) => x.hit).length;
      m.extraPriceEntriesOnClear += Math.max(0, r.prices.length - matched);
    }
    m.inventedPrices += d.inventedPrices;
    details.returned.push(d);
  }

  // Per expected item: recall, price exact match, cut-off flagging.
  expectedItems.forEach((e, ei) => {
    const ri = expToRet.get(ei);
    const r = ri === undefined ? null : returnedItems[ri];
    const d = { original: e.original, legibility: e.legibility, matched: r !== null };

    if (e.legibility === "clear") {
      m.clearExpected++;
      if (r) m.clearMatched++;
      if (e.prices.length > 0) {
        d.prices = matchPrices(e.prices, r?.prices ?? []).map((x) => {
          m.priceEntriesExpected++;
          if (x.hit) m.priceEntriesMatched++;
          if (x.labelOk) m.priceLabelAgree++;
          return { label: x.label, amount: x.amount, hit: x.hit, returnedLabel: x.returnedLabel, labelOk: x.labelOk };
        });
      }
    } else if (e.legibility === "partial") {
      m.partialExpected++;
      if (e.prices.length > 0) {
        d.prices = matchPrices(e.prices, r?.prices ?? []).map((x) => {
          m.partialPriceEntriesExpected++;
          if (!x.hit) m.partialPriceMismatches++;
          return { label: x.label, amount: x.amount, hit: x.hit, returnedLabel: x.returnedLabel, labelOk: x.labelOk };
        });
      }
      const flagged = r?.legibility === "partial";
      const notCompleted = r ? r.key.length <= e.key.length : false;
      d.flaggedPartial = flagged;
      d.noCompletedText = notCompleted;
      d.ok = Boolean(r) && flagged && notCompleted;
      if (d.ok) m.partialOk++;
      if (!r) {
        // Completed text would appear as an unmatched returned item that
        // starts with the cut-off text.
        const completer = matches.find(
          (x) => x.exp < 0 && e.key !== "" && returnedItems[x.ret].key.startsWith(e.key) && returnedItems[x.ret].key.length > e.key.length,
        );
        if (completer) d.completedBy = returnedItems[completer.ret].original;
      }
    }
    details.expected.push(d);
  });

  return { metrics: m, details };
}

function currencyCheck(expected, scan) {
  if (!scan) return { currency: null, currencySource: null, currencyOk: null, sourceOk: null };
  return {
    currency: scan.currency ?? "",
    currencySource: scan.currencySource ?? "",
    currencyOk: labelKey(scan.currency) === labelKey(expected.currency),
    sourceOk: scan.currencySource === expected.currencySource,
  };
}

const pct = (n, d) => (d === 0 ? "n/a" : `${((n / d) * 100).toFixed(1)}% (${n}/${d})`);

/** Nearest-rank percentile. */
function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

function aggregate(scored) {
  const menus = scored.filter((f) => f.metrics && !f.expectedIsNotMenu);
  const nonMenus = scored.filter((f) => f.expectedIsNotMenu);
  const totals = {
    inventedPrices: scored.reduce((a, f) => a + f.metrics.inventedPrices, 0),
    partialButPriced: scored.reduce((a, f) => a + f.metrics.partialButPriced, 0),
    extraPriceEntriesOnClear: menus.reduce((a, f) => a + f.metrics.extraPriceEntriesOnClear, 0),
    priceEntriesMatched: menus.reduce((a, f) => a + f.metrics.priceEntriesMatched, 0),
    priceLabelAgree: menus.reduce((a, f) => a + (f.metrics.priceLabelAgree ?? 0), 0),
    partialPriceEntriesExpected: menus.reduce((a, f) => a + (f.metrics.partialPriceEntriesExpected ?? 0), 0),
    partialPriceMismatches: menus.reduce((a, f) => a + (f.metrics.partialPriceMismatches ?? 0), 0),
    priceEntriesExpected: menus.reduce((a, f) => a + f.metrics.priceEntriesExpected, 0),
    clearMatched: menus.reduce((a, f) => a + f.metrics.clearMatched, 0),
    clearExpected: menus.reduce((a, f) => a + f.metrics.clearExpected, 0),
    partialOk: menus.reduce((a, f) => a + f.metrics.partialOk, 0),
    partialExpected: menus.reduce((a, f) => a + f.metrics.partialExpected, 0),
    inventedItemsWorst: scored.reduce((a, f) => Math.max(a, f.metrics.inventedItems), 0),
    inventedItemsTotal: scored.reduce((a, f) => a + f.metrics.inventedItems, 0),
    menus: menus.length,
    nonMenus: nonMenus.length,
    nonMenusRejected: nonMenus.filter((f) => f.notAMenuPass).length,
  };
  const t = totals;
  const verdict = (pass) => (pass === null ? "n/a" : pass ? "PASS" : "FAIL");
  const results = {
    inventedPrices: { value: `${t.inventedPrices}`, pass: t.menus + t.nonMenus === 0 ? null : t.inventedPrices === 0 },
    priceExact: {
      value: pct(t.priceEntriesMatched, t.priceEntriesExpected),
      pass: t.priceEntriesExpected === 0 ? null : t.priceEntriesMatched / t.priceEntriesExpected >= 0.98,
    },
    recall: {
      value: pct(t.clearMatched, t.clearExpected),
      pass: t.clearExpected === 0 ? null : t.clearMatched / t.clearExpected >= 0.95,
    },
    inventedItems: {
      value: `worst ${t.inventedItemsWorst}, total ${t.inventedItemsTotal} over ${t.menus + t.nonMenus} fixture(s)`,
      pass: t.menus + t.nonMenus === 0 ? null : t.inventedItemsWorst <= 1,
    },
    partialFlag: {
      value: pct(t.partialOk, t.partialExpected),
      pass: t.partialExpected === 0 ? null : t.partialOk / t.partialExpected >= 0.9,
    },
    notAMenu: {
      value: `${t.nonMenusRejected}/${t.nonMenus}`,
      pass: t.nonMenus === 0 ? null : t.nonMenusRejected === t.nonMenus,
    },
  };
  for (const r of Object.values(results)) r.verdict = verdict(r.pass);
  return { totals, results };
}

// ---------------------------------------------------------------- output

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

function printTable(rows, header) {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) => cells.map((c, i) => pad(c, widths[i])).join("  ");
  console.log(line(header));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const r of rows) console.log(line(r));
}

function report(fixtures, agg, latency, incomplete) {
  console.log("\nPer fixture");
  const rows = fixtures.map((f) => {
    if (f.skipped) return [f.name, "-", "-", "skipped: no expected.json", "", "", "", "", "", ""];
    const m = f.metrics;
    const status = f.status === 0 ? "ERR" : String(f.status);
    if (f.expectedIsNotMenu) {
      return [f.name, status, padL(f.ms, 6), f.notAMenuPass ? "422 not_a_menu: PASS" : `got ${status} ${f.error?.code ?? "scan"}: FAIL`, "", "", "", "", "", "n/a"];
    }
    if (!m) return [f.name, status, padL(f.ms, 6), `excluded: ${f.error?.code ?? "no scan"}`, "", "", "", "", "", ""];
    const cur = f.currencyCheck.currency === null ? "n/a" : `${f.currencyCheck.currency || "(none)"}/${f.currencyCheck.currencySource} ${f.currencyCheck.currencyOk && f.currencyCheck.sourceOk ? "ok" : "MISMATCH"}`;
    return [
      f.name,
      status,
      padL(f.ms, 6),
      `${m.returnedItems}/${m.expectedItems}`,
      pct(m.clearMatched, m.clearExpected),
      pct(m.priceEntriesMatched, m.priceEntriesExpected),
      String(m.inventedPrices) + (m.partialButPriced ? ` (${m.partialButPriced} partial-priced)` : ""),
      String(m.inventedItems),
      pct(m.partialOk, m.partialExpected),
      cur,
    ];
  });
  printTable(rows, ["fixture", "HTTP", "ms", "items ret/exp", "recall", "price exact", "inv. prices", "inv. items", "cut-off flagged", "currency (est. vs expected)"]);

  console.log("\nTotals");
  const trows = Object.entries(TARGETS).map(([k, t]) => [t.label, agg.results[k].value, t.rule, agg.results[k].verdict]);
  printTable(trows, ["metric", "result", "target", ""]);

  console.log("\nReported, not gated");
  console.log(`  Partial-but-priced (expected partial, no ground-truth price, model returned one; owner judges, counted in the gate): ${agg.totals.partialButPriced}`);
  console.log(`  Price mismatches on partial items (expected partial items WITH prices; amounts the model missed): ${agg.totals.partialPriceMismatches} of ${agg.totals.partialPriceEntriesExpected} expected`);
  console.log(`  Option-label agreement on matched clear prices (case-insensitive; wording differences are visible, not gated): ${pct(agg.totals.priceLabelAgree, agg.totals.priceEntriesMatched)}`);
  console.log(`  Extra price entries on matched clear items (not in ground truth; not gated): ${agg.totals.extraPriceEntriesOnClear}`);
  const fmt = (v) => (v === null ? "n/a" : `${(v / 1000).toFixed(1)} s`);
  console.log(`  Latency p50 ${fmt(latency.p50)}, p95 ${fmt(latency.p95)} (n=${latency.n}); p50 over ~30 s means plan streaming.`);
  console.log("  Tokens: n/a (see server log)");
  console.log("  Amounts compare after removing whitespace only: \"1,040\" and \"1040\" are a miss.");
  if (incomplete.length) console.log(`\nINCOMPLETE: ${incomplete.join("; ")}`);
}

// ---------------------------------------------------------------- main

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = process.env.EVAL_EMAIL;
  const password = process.env.EVAL_PASSWORD;
  if (!email || !password) {
    console.error("EVAL_EMAIL and EVAL_PASSWORD must be set (an account on the server under test).");
    process.exit(2);
  }

  const files = (await readdir(args.fixtures))
    .filter((f) => f.toLowerCase().endsWith(".jpg") && f.includes(args.only))
    .sort();
  if (files.length === 0) {
    console.error(`No .jpg fixtures in ${args.fixtures}${args.only ? ` matching "${args.only}"` : ""}.`);
    process.exit(2);
  }

  let cookie;
  try {
    cookie = await signIn(args.base, email, password);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  console.log(`Signed in to ${args.base}. Running ${files.length} fixture(s) sequentially.`);

  const fixtures = [];
  const incomplete = [];
  let stopped = false;

  for (const file of files) {
    const name = file.replace(/\.jpg$/i, "");
    const expectedPath = path.join(args.fixtures, `${name}.expected.json`);
    if (!existsSync(expectedPath)) {
      console.log(`  ${name}: skipped, no ${name}.expected.json yet`);
      fixtures.push({ name, skipped: true });
      continue;
    }
    if (stopped) {
      incomplete.push(`${name} not run (stopped after 429)`);
      fixtures.push({ name, skipped: false, notRun: true });
      continue;
    }
    const expected = JSON.parse(await readFile(expectedPath, "utf8"));
    const expectedIsNotMenu = expected.isMenu === false;

    process.stdout.write(`  ${name} ... `);
    const res = await postFixture(args.base, cookie, path.join(args.fixtures, file), file);
    console.log(`HTTP ${res.status || "ERR"} in ${res.ms} ms`);

    const fx = { name, expectedIsNotMenu, status: res.status, ms: res.ms, error: res.error, scan: res.scan };

    if (expectedIsNotMenu) {
      fx.notAMenuPass = res.status === 422 && res.error?.code === "not_a_menu";
      if (res.status === 200 && res.scan) {
        // The route should have turned this into a 422. Anything it returned is invented.
        const scored = scoreMenu({ sections: [] }, res.scan);
        fx.metrics = scored.metrics;
        fx.details = scored.details;
      } else if (!fx.notAMenuPass) {
        incomplete.push(`${name}: expected 422 not_a_menu, got ${res.status || "network error"} ${res.error?.code ?? ""}`.trim());
      }
    } else if (res.status === 200 && res.scan) {
      const scored = scoreMenu(expected, res.scan);
      fx.metrics = scored.metrics;
      fx.details = scored.details;
      fx.currencyCheck = currencyCheck(expected, res.scan);
    } else if (res.status === 422) {
      // The model called a real menu "not a menu": every expected item is missed.
      const scored = scoreMenu(expected, null);
      fx.metrics = scored.metrics;
      fx.details = scored.details;
      fx.currencyCheck = currencyCheck(expected, null);
      fx.note = "422 not_a_menu on a real menu: scored as an empty scan";
    } else {
      incomplete.push(`${name}: HTTP ${res.status || "network error"} ${res.error?.code ?? ""}`.trim());
      if (res.status === 429) stopped = true;
    }
    fixtures.push(fx);
  }

  const scored = fixtures.filter((f) => f.metrics || (f.expectedIsNotMenu && !f.notRun && !f.skipped && f.status !== 0 && f.notAMenuPass !== undefined));
  const scoredWithMetrics = scored.map((f) => ({
    ...f,
    metrics: f.metrics ?? { inventedPrices: 0, partialButPriced: 0, partialPriceEntriesExpected: 0, partialPriceMismatches: 0, priceLabelAgree: 0, extraPriceEntriesOnClear: 0, priceEntriesMatched: 0, priceEntriesExpected: 0, clearMatched: 0, clearExpected: 0, partialOk: 0, partialExpected: 0, inventedItems: 0 },
  }));
  const agg = aggregate(scoredWithMetrics);

  const times = fixtures.filter((f) => f.status === 200 || f.status === 422).map((f) => f.ms).sort((a, b) => a - b);
  const latency = { n: times.length, p50: percentile(times, 50), p95: percentile(times, 95) };

  const nothingScored = scoredWithMetrics.length === 0;
  report(fixtures, agg, latency, incomplete);
  if (nothingScored) console.log("\nNothing was scored.");

  const gatedFail = Object.values(agg.results).some((r) => r.pass === false);
  const failed = gatedFail || incomplete.length > 0 || nothingScored;
  console.log(`\n${failed ? "RESULT: FAIL" : "RESULT: PASS"}`);

  await mkdir(args.out, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const outPath = path.join(args.out, `eval-${stamp}.json`);
  await writeFile(
    outPath,
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        base: args.base,
        only: args.only || null,
        targets: TARGETS,
        summary: { ...agg, latencyMs: latency, tokens: "n/a (see server log)", incomplete, pass: !failed },
        fixtures,
        notes: [
          "Amounts compare after removing whitespace only.",
          "Matching is exact on the NFKC, lower-cased, whitespace/punctuation-stripped original, across sections, one-to-one.",
          "Invented price: a price on an unmatched item or on a matched item whose expected prices is [] (clear or partial).",
          "Price match is by amount only; label agreement is reported separately.",
        ],
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
