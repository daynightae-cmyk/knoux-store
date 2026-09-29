/**
 * A fixed-window request counter.
 *
 * Kept in its own module because two boundaries need it — the KNOuX DEV
 * workspace reads and the public contact intake — and two copies of a limiter
 * is two places for the ceiling to drift.
 *
 * What this is, precisely: a per-process window. On a serverless platform each
 * instance keeps its own, so the effective ceiling is the per-instance limit
 * times the instance count. That is stated in the code rather than implied,
 * because the alternative — describing it as a rate limiter and leaving the
 * reader to assume a distributed guarantee — is how a control ends up believed
 * in and not present.
 *
 * What it is for: bounding how much work one caller can force per minute. A
 * per-process window does that. It is not an identity system and is not used
 * as one.
 */

type Bucket = { hits: number[]; blockedUntil: number };

const WINDOW_MS = 60_000;
const BLOCK_MS = 60_000;
/** An address-spray must not be able to grow the map without bound. */
const MAX_BUCKETS = 4096;

const buckets = new Map<string, Bucket>();

export type LimitOptions = {
  max?: number;
  windowMs?: number;
  blockMs?: number;
  /** Injected so the behaviour is testable without waiting a real minute. */
  now?: number;
};

export type LimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

function evict(now: number, windowMs: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.hits.every((hit) => now - hit > windowMs)) buckets.delete(key);
    if (buckets.size < MAX_BUCKETS) return;
  }
}

export function rateLimit(key: string, options: LimitOptions = {}): LimitResult {
  const max = options.max ?? 30;
  const windowMs = options.windowMs ?? WINDOW_MS;
  const blockMs = options.blockMs ?? BLOCK_MS;
  const now = options.now ?? Date.now();

  evict(now, windowMs);
  const bucket = buckets.get(key) ?? { hits: [], blockedUntil: 0 };

  if (bucket.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.blockedUntil - now) / 1000)),
    };
  }

  bucket.hits = bucket.hits.filter((hit) => now - hit <= windowMs);
  if (bucket.hits.length >= max) {
    bucket.blockedUntil = now + blockMs;
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(blockMs / 1000) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: max - bucket.hits.length, retryAfterSeconds: 0 };
}

/** Test seam: a limiter whose state leaks between tests is not a test. */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Client address, for bucketing only.
 *
 * `x-forwarded-for` is client-controlled, so this is never an authentication
 * input. It only spreads a limit across the addresses a request claims; a
 * forged value can at worst move a request between buckets, and the limit
 * exists to bound work, not to identify a person.
 */
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return (headers.get('x-real-ip') ?? 'unknown').slice(0, 64);
}
