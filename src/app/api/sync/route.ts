import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { pullChanges, pushChanges, pushSchema } from "@/lib/sync/server";

/**
 * /api/sync (SPEC.md §7 "Local-first sync"). POST pushes the device's outbox,
 * GET pulls rows changed on other devices. Both act only on the signed-in
 * user's rows. Network-only: the service worker never caches it.
 */

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid sync payload." } }, { status: 400 });
  }
  const parsed = pushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid sync payload." } }, { status: 400 });
  }

  try {
    await pushChanges(auth.userId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/sync failed:", error);
    return NextResponse.json({ error: { code: "sync_failed", message: "Couldn't sync right now. Your phrases are safe on this device." } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const since = request.nextUrl.searchParams.get("since");
  if (since !== null && Number.isNaN(Date.parse(since))) {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid cursor." } }, { status: 400 });
  }

  try {
    return NextResponse.json(await pullChanges(auth.userId, since));
  } catch (error) {
    console.error("GET /api/sync failed:", error);
    return NextResponse.json({ error: { code: "sync_failed", message: "Couldn't sync right now. Your phrases are safe on this device." } }, { status: 500 });
  }
}
