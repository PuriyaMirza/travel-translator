import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;

/**
 * The Postgres client (SPEC.md §3). Server-side only: DATABASE_URL never
 * reaches the browser (SPEC.md §2 rule 6). Lazy for the same reason as
 * `getAuth()` — builds must not need the env var.
 */
export function getSql(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL must be set");
    client = neon(url);
  }
  return client;
}
