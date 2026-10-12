import { getAuth } from "@/lib/auth/server";

/** Proxies every /api/auth/* call to Neon Auth (sign-in, sign-up, session). */
type Context = { params: Promise<{ path: string[] }> };

export function GET(request: Request, context: Context) {
  return getAuth().handler().GET(request, context);
}

export function POST(request: Request, context: Context) {
  return getAuth().handler().POST(request, context);
}
