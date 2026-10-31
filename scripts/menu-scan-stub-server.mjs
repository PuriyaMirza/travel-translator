#!/usr/bin/env node
/**
 * Test double for scripts/eval-menu-scan.mjs. Not the real app: it fakes only
 * `POST /api/auth/sign-in/email` and `POST /api/menu-scan`.
 *
 *   node scripts/menu-scan-stub-server.mjs [--port 3999] [--fixtures <dir>] [--clean]
 *
 * Sign-in needs an Origin header and a JSON email + password, and sets two
 * Neon-Auth-style cookies. The scan route needs the session cookie, a
 * multipart `image` part of type image/jpeg, then answers from the fixture's
 * `<name>.expected.json` (the file name comes from the part's filename):
 *   - expected.isMenu === false  -> 422 not_a_menu
 *   - fixture 01, unless --clean -> the expected scan with deliberate errors
 *     (see DELIBERATE_ERRORS below) so the gates can be seen to fail
 *   - anything else              -> the expected scan unchanged
 */

import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const port = Number(opt("--port", "3999"));
const fixtures = path.resolve(opt("--fixtures", path.join(root, "data/menu-fixtures")));
const clean = argv.includes("--clean");

const SESSION = "__Secure-neon-auth.session_token=stub-token";

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
};
const fail = (res, status, code, message) => send(res, status, { error: { code, message } });

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

/**
 * Deliberate errors in fixture 01 and what the harness should report for them
 * (01 has 8 clear items / 8 clear price entries / 5 partial items):
 *  - American (partial, no price) gets a price         -> 1 invented price, partial-but-priced 1
 *  - invented item ミルクティー with one price          -> 1 invented item, 1 invented price
 *  - ドリップアイスコーヒー dropped                       -> recall 7/8, price entry 900 missed
 *  - Café au lait Iced 1,030 -> 1030                    -> price miss ("1,030" != "1030")
 *  - Vienna Hot "940" -> "9 40", Iced label -> " iced " -> still hits (whitespace / case)
 *  - Renoir Blend label "Hot" -> "Warm"                 -> amount hit, label disagreement
 *  - カフェゼリー＆バ returned as カフェゼリー＆バニ      -> unmatched (invented item, partial miss)
 *  - カフェゼリー＆オー returned legibility "clear"       -> partial not flagged
 *  - currency "JPY" printed (expected estimated)         -> source mismatch
 * Totals: invented prices 2, invented items 2, price 6/8, recall 7/8, partial 3/5.
 */
function applyDeliberateErrors(scan) {
  const s = structuredClone(scan);
  const items = s.sections.flatMap((sec) => sec.items);
  const by = (original) => items.find((i) => i.original === original);
  by("アメリカン").prices = [{ label: "Hot", amount: "850" }];
  by("カフェ・オーレ").prices[1].amount = "1030";
  by("ウインナーコーヒー").prices[0].amount = "9 40";
  by("ウインナーコーヒー").prices[1].label = " iced ";
  by("ルノアールブレンド").prices[0].label = "Warm";
  by("カフェゼリー＆バ").original = "カフェゼリー＆バニ";
  by("カフェゼリー＆オー").legibility = "clear";
  const sec = s.sections[0];
  sec.items = sec.items.filter((i) => i.original !== "ドリップアイスコーヒー");
  sec.items.push({
    original: "ミルクティー",
    english: "Milk tea",
    description: "",
    prices: [{ label: "Hot", amount: "500" }],
    legibility: "clear",
  });
  s.currencySource = "printed";
  return s;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://stub");
  try {
    if (req.method === "POST" && url.pathname === "/api/auth/sign-in/email") {
      const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
      if (!req.headers.origin) return send(res, 403, { error: "Missing origin" });
      if (!body.email || !body.password) return send(res, 400, { error: "email and password required" });
      return send(res, 200, { ok: true }, {
        "Set-Cookie": [
          `${SESSION}; Path=/; HttpOnly; Secure; SameSite=Lax`,
          "__Secure-neon-auth.local.session_data=stub-data; Path=/; HttpOnly; Secure; SameSite=Lax",
        ],
      });
    }

    if (req.method === "POST" && url.pathname === "/api/menu-scan") {
      const raw = await readBody(req);
      if (!(req.headers.cookie ?? "").includes(SESSION)) {
        return fail(res, 401, "unauthorized", "Sign in to scan a menu.");
      }
      const head = raw.toString("latin1");
      const part = /name="image"; filename="([^"]+)"\r\nContent-Type: ([^\r]+)/.exec(head);
      if (!part || part[2] !== "image/jpeg") return fail(res, 415, "unsupported_type", "Not a JPEG.");
      const name = path.basename(part[1]).replace(/\.jpg$/i, "");
      const expectedPath = path.join(fixtures, `${name}.expected.json`);
      if (!existsSync(expectedPath)) return fail(res, 500, "unknown", `stub has no ${name}.expected.json`);
      const expected = JSON.parse(await readFile(expectedPath, "utf8"));
      if (expected.isMenu === false) return fail(res, 422, "not_a_menu", "That doesn't look like a menu.");
      await new Promise((r) => setTimeout(r, 50));
      const scan = name.startsWith("01") && !clean ? applyDeliberateErrors(expected) : expected;
      return send(res, 200, { scan });
    }

    return fail(res, 404, "not_found", "Stub only serves sign-in and menu-scan.");
  } catch (err) {
    return fail(res, 500, "unknown", err.message);
  }
});

server.listen(port, () => console.log(`menu-scan stub on http://localhost:${port}${clean ? " (clean)" : ""}`));
