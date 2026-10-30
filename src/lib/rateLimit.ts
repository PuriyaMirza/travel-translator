/**
 * Coarse, in-memory throttles for the routes that spend model calls:
 * `translate` is keyed on IP (SPEC.md §10: public in M2, full auth arrives in
 * M3), `tripPack` on the verified user id (SPEC.md §13: 3 packs per user per
 * hour, because a pack costs about 25 translations).
 *
 * Deliberately weak: it resets on cold start and doesn't survive multiple
 * server instances, so it stops casual abuse rather than a determined one.
 * That tradeoff is the point — it costs nothing and needs no infrastructure,
 * which is what "coarse" means here. Do not extend this into real rate
 * limiting; reach for a shared store (e.g. Redis) if that's ever needed.
 */

const BUCKETS = {
  translate: { windowMs: 60_000, max: 10 },
  tripPack: { windowMs: 60 * 60_000, max: 3 },
  // Sync runs on sign-in, focus and the online event, so a few a minute is
  // normal. A push can carry 1,000 rows (two queries each), so cap the rate
  // per verified user id. Same coarse in-memory limiter as the others.
  sync: { windowMs: 60_000, max: 30 },
} as const;

export type RateLimitBucket = keyof typeof BUCKETS;

// bucket -> key (IP or user id) -> request timestamps inside the window
const hits: Record<RateLimitBucket, Map<string, number[]>> = {
  translate: new Map(),
  tripPack: new Map(),
  sync: new Map(),
};

/** Bounds memory growth from keys that only ever make one request. */
function pruneStaleEntries(bucket: RateLimitBucket, now: number) {
  const { windowMs } = BUCKETS[bucket];
  for (const [key, timestamps] of hits[bucket]) {
    if (timestamps.every((t) => now - t > windowMs)) {
      hits[bucket].delete(key);
    }
  }
}

/** Records a hit and reports whether `key` is over the bucket's limit. */
export function isRateLimited(key: string, bucket: RateLimitBucket = "translate"): boolean {
  const { windowMs, max } = BUCKETS[bucket];
  const now = Date.now();
  const timestamps = (hits[bucket].get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    hits[bucket].set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  hits[bucket].set(key, timestamps);

  // Cheap amortised cleanup — no separate timer, no dependency.
  if (hits[bucket].size > 1000) pruneStaleEntries(bucket, now);

  return false;
}
