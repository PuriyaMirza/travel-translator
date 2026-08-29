/**
 * A coarse, in-memory per-IP throttle for the public `/api/translate` route
 * (SPEC.md §10: "protected only by an input-length cap and a coarse per-IP
 * throttle" — full auth arrives in M3).
 *
 * Deliberately weak: it resets on cold start and doesn't survive multiple
 * server instances, so it stops casual abuse rather than a determined one.
 * That tradeoff is the point — it costs nothing and needs no infrastructure,
 * which is what "coarse" means here. Do not extend this into real rate
 * limiting; reach for a shared store (e.g. Redis) if that's ever needed.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

const hits = new Map<string, number[]>();

/** Bounds memory growth from IPs that only ever make one request. */
function pruneStaleEntries(now: number) {
  for (const [ip, timestamps] of hits) {
    if (timestamps.every((t) => now - t > WINDOW_MS)) {
      hits.delete(ip);
    }
  }
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  hits.set(ip, timestamps);

  // Cheap amortised cleanup — no separate timer, no dependency.
  if (hits.size > 1000) pruneStaleEntries(now);

  return false;
}
