import { NextRequest, NextResponse } from "next/server";

// TEMPORARY QA route. Preview-only (needs QA_TOKEN), removed after QA.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface Step {
  step: string;
  ok: boolean;
  status?: number;
  detail?: unknown;
}

interface Res {
  status: number;
  json: unknown;
  text: string;
  cookies: string[];
}

const trunc = (s: string, n = 500) => (s.length > n ? s.slice(0, n) : s);

function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return "Qa1!" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: NextRequest) {
  const expected = process.env.QA_TOKEN;
  if (!expected || request.nextUrl.searchParams.get("token") !== expected) {
    return new NextResponse("Not found", { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const report: Step[] = [];
  const push = (step: string, ok: boolean, status?: number, detail?: unknown) =>
    report.push({ step, ok, status, detail });

  async function call(method: string, path: string, cookie?: string, body?: unknown): Promise<Res> {
    const headers: Record<string, string> = { Origin: origin };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (bypass) headers["x-vercel-protection-bypass"] = bypass;
    const res = await fetch(origin + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not json */
    }
    const cookies = res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .filter((c) => c.includes("=") && !c.endsWith("="));
    return { status: res.status, json, text, cookies };
  }

  async function signUp(label: string) {
    const stamp = `${Date.now()}${label === "B" ? "b" : "a"}`;
    const local = `qa+${label.toLowerCase()}-${stamp}`;
    const email = `${local}@example.com`;
    const r = await call("POST", "/api/auth/sign-up/email", undefined, {
      email,
      password: randomPassword(),
      name: local,
    });
    const cookie = r.cookies.join("; ");
    const ok = r.status >= 200 && r.status < 300 && cookie.length > 0;
    push(`sign-up ${label}`, ok, r.status, {
      email,
      cookieCount: r.cookies.length,
      ...(ok ? {} : { body: trunc(r.text) }),
    });
    return ok ? cookie : null;
  }

  type Pulled = { savedPhrases?: { id: string; natural?: string }[] };
  const pull = async (cookie: string) => {
    const r = await call("GET", "/api/sync", cookie);
    return { r, data: (r.json ?? {}) as Pulled };
  };

  try {
    // a
    const a = await call("GET", "/api/sync");
    push("a. GET /api/sync no cookie", a.status === 401, a.status, trunc(a.text, 200));

    // b
    const cookieA = await signUp("A");
    if (!cookieA) return NextResponse.json({ report });

    // c
    const s = await call("GET", "/api/auth/get-session", cookieA);
    const sess = s.json as { user?: { id?: string } } | null;
    push("c. get-session A", s.status === 200 && !!sess?.user?.id, s.status, { userId: sess?.user?.id ?? null });

    // d
    const rowId = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id: rowId,
      locale: "es-419",
      sourceText: "Hello QA",
      literal: "Hola",
      natural: "Hola",
      culturalNote: "",
      pronunciation: "OH-lah",
      category: "greetings",
      savedAt: now,
      updatedAt: now,
    };
    const pa = await call("POST", "/api/sync", cookieA, { savedPhrases: [row] });
    push("d1. POST /api/sync A", pa.status === 200, pa.status, pa.status === 200 ? undefined : trunc(pa.text));
    const ga = await pull(cookieA);
    const found = ga.data.savedPhrases?.find((p) => p.id === rowId);
    push("d2. GET /api/sync A has row", ga.r.status === 200 && !!found, ga.r.status, {
      found: !!found,
      natural: found?.natural,
    });

    // e
    const cookieB = await signUp("B");
    if (cookieB) {
      const later = new Date(Date.now() + 60_000).toISOString();
      const pb = await call("POST", "/api/sync", cookieB, {
        savedPhrases: [{ ...row, natural: "HIJACK", updatedAt: later }],
      });
      push("e1. POST /api/sync B same id", pb.status === 200, pb.status, pb.status === 200 ? undefined : trunc(pb.text));
      const ga2 = await pull(cookieA);
      const f2 = ga2.data.savedPhrases?.find((p) => p.id === rowId);
      push("e2. A row unchanged after B hijack", f2?.natural === "Hola", ga2.r.status, { natural: f2?.natural });
      const gb = await pull(cookieB);
      push("e3. B does not see A's row", !gb.data.savedPhrases?.some((p) => p.id === rowId), gb.r.status, {
        bRowCount: gb.data.savedPhrases?.length ?? 0,
      });
    }

    // f
    const put = await call("PUT", "/api/settings", cookieA, { speakerGender: "feminine" });
    const get = await call("GET", "/api/settings", cookieA);
    const gender = (get.json as { settings?: { speakerGender?: string } } | null)?.settings?.speakerGender;
    push("f. settings PUT then GET", put.status === 200 && gender === "feminine", get.status, {
      putStatus: put.status,
      speakerGender: gender,
    });

    // g
    const t = await call("POST", "/api/translate", undefined, {
      text: "Where is the bathroom?",
      speakerGender: "neutral",
    });
    const ph = (t.json as { phrase?: { natural?: string; category?: string } } | null)?.phrase;
    push("g. translate", t.status === 200 && !!ph, t.status, ph ? { natural: ph.natural, category: ph.category } : trunc(t.text));

    // h
    const started = Date.now();
    const tp = await call("POST", "/api/trip-pack", cookieA, {
      title: "QA trip",
      description: "Vegetarian, one week in Mexico City, staying in hostels",
      locale: "es-419",
      speakerGender: "neutral",
    });
    const elapsedMs = Date.now() - started;
    const phrases = (tp.json as { phrases?: { natural?: string }[] } | null)?.phrases ?? [];
    const n = phrases.length;
    push("h1. trip-pack", tp.status === 200 && n >= 10 && n <= 25, tp.status, {
      count: n,
      elapsedMs,
      samples: phrases.slice(0, 2).map((p) => p.natural),
      ...(tp.status === 200 ? {} : { body: trunc(tp.text) }),
    });
    if (tp.status === 200) {
      const packId = crypto.randomUUID();
      const cp = await call("POST", "/api/trip-packs", cookieA, {
        id: packId,
        title: "QA trip",
        description: "Vegetarian, one week in Mexico City, staying in hostels",
        locale: "es-419",
        phraseCount: n,
      });
      push("h2. POST /api/trip-packs", cp.status === 200, cp.status, cp.status === 200 ? undefined : trunc(cp.text));
      const lp = await call("GET", "/api/trip-packs", cookieA);
      const packs = (lp.json as { tripPacks?: { id: string }[] } | null)?.tripPacks ?? [];
      push("h3. GET /api/trip-packs lists it", lp.status === 200 && packs.some((p) => p.id === packId), lp.status, {
        count: packs.length,
      });
    }
  } catch (error) {
    push("exception", false, undefined, trunc(error instanceof Error ? error.message : String(error)));
  }

  return NextResponse.json({ allOk: report.every((r) => r.ok), report });
}
