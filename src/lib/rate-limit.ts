/**
 * Production Sliding Window In-Memory Rate Limiter
 * Provides DDoS, brute-force, and AI quota exhaustion protection.
 */

const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitConfig {
  intervalMs: number;
  maxRequests: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

class SlidingWindowRateLimiter {
  private requests = new Map<string, number[]>();
  private lastCleanup = Date.now();

  /**
   * Evaluates if a request from a key (IP or user ID) is permitted.
   */
  public check(
    key: string,
    config: RateLimitConfig = { intervalMs: 60_000, maxRequests: 30 }
  ): RateLimitStatus {
    const now = Date.now();
    this.cleanupIfNeeded(now);

    const windowStart = now - config.intervalMs;
    const timestamps = (this.requests.get(key) || []).filter((ts) => ts > windowStart);

    if (timestamps.length >= config.maxRequests) {
      const oldest = timestamps[0];
      const resetSeconds = Math.max(1, Math.ceil((oldest + config.intervalMs - now) / 1000));
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetSeconds,
      };
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);
    this.enforceKeyCap();

    const resetSeconds = Math.ceil(config.intervalMs / 1000);
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - timestamps.length,
      resetSeconds,
    };
  }

  /**
   * Evicts oldest tracked keys so distinct IP floods cannot exhaust heap memory.
   */
  private enforceKeyCap(): void {
    while (this.requests.size > MAX_TRACKED_KEYS) {
      const oldestKey = this.requests.keys().next().value;
      if (oldestKey === undefined) break;
      this.requests.delete(oldestKey);
    }
  }

  /**
   * Resets rate limits (useful for testing).
   */
  public reset(key?: string) {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }

  private cleanupIfNeeded(now: number) {
    // Run garbage collection at most once every 60 seconds
    if (now - this.lastCleanup > 60_000) {
      this.lastCleanup = now;
      for (const [key, timestamps] of this.requests.entries()) {
        const valid = timestamps.filter((ts) => ts > now - 120_000);
        if (valid.length === 0) {
          this.requests.delete(key);
        } else {
          this.requests.set(key, valid);
        }
      }
    }
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();

export function getClientIp(headers: Headers): string {
  // Prefer platform-set edge headers that clients cannot forge over X-Forwarded-For.
  const platformIp = headers.get("x-vercel-forwarded-for") || headers.get("cf-connecting-ip");
  if (platformIp && platformIp.trim().length > 0) {
    return platformIp.split(",")[0].trim();
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp && firstIp.length > 0) {
      return firstIp;
    }
  }
  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
