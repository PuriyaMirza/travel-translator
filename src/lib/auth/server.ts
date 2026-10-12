import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;

let instance: NeonAuth | undefined;

/**
 * The server-side Neon Auth instance (SPEC.md §3).
 *
 * Created on first use rather than at import: `createNeonAuth` validates the
 * cookie secret immediately, and a module-level call would fail `next build`
 * on any machine without the auth env vars set.
 */
export function getAuth(): NeonAuth {
  if (!instance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;
    if (!baseUrl || !secret) {
      throw new Error("NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET must be set");
    }
    instance = createNeonAuth({ baseUrl, cookies: { secret } });
  }
  return instance;
}
