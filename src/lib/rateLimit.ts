// ════════════════════════════════════════════════════════════
// NJADDER PRO v7.0 — Simple Rate Limiter (in-memory)
// ════════════════════════════════════════════════════════════
// Limits per-user requests per minute to prevent abuse.
// For multi-instance production, replace with Redis-backed limiter.
// ════════════════════════════════════════════════════════════

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

// Cleanup expired buckets every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/**
 * Check if a request is allowed under the rate limit.
 * @param key Unique key (e.g., userId or IP)
 * @param maxRequests Max requests per window
 * @param windowMs Window in milliseconds (default: 1 minute)
 * @returns { allowed: boolean; remaining: number; resetAt: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    // New window
    const newBucket: RateBucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, newBucket);
    return { allowed: true, remaining: maxRequests - 1, resetAt: newBucket.resetAt };
  }

  bucket.count++;
  const allowed = bucket.count <= maxRequests;
  return {
    allowed,
    remaining: Math.max(0, maxRequests - bucket.count),
    resetAt: bucket.resetAt,
  };
}

// Predefined limits per endpoint type
export const RATE_LIMITS = {
  // Auth: max 10 attempts per minute (prevents brute force)
  auth: { max: 10, windowMs: 60 * 1000 },
  // Execute (heavy operations): max 5 per minute per user
  execute: { max: 5, windowMs: 60 * 1000 },
  // Account management: max 20 per minute
  accounts: { max: 20, windowMs: 60 * 1000 },
  // Blacklist: max 30 per minute
  blacklist: { max: 30, windowMs: 60 * 1000 },
  // Default: max 60 per minute
  default: { max: 60, windowMs: 60 * 1000 },
};
