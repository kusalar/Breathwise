/**
 * Lightweight in-memory server-side cache with in-flight request deduplication
 * Designed for external environmental API calls (Open-Meteo & Gemini).
 *
 * The cache is bounded: expired entries are swept on overflow and the oldest
 * entries are evicted once `maxEntries` is reached.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export type TtlSeconds<T> = number | ((result: T) => number);

const DEFAULT_MAX_ENTRIES = 500;

export class EnvironmentalCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly maxEntries: number = DEFAULT_MAX_ENTRIES) {}

  /**
   * Retrieves an item from cache, or executes the fetcher function with request deduplication.
   * `ttlSeconds` may be computed from the fetched result so fallback values expire sooner.
   */
  async getOrFetch<T>(
    key: string,
    ttlSeconds: TtlSeconds<T>,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const existing = this.cache.get(key);

    if (existing && existing.expiresAt > now) {
      return existing.data as T;
    }

    // Check if an identical request is already in-flight (deduplication)
    const inFlightPromise = this.inFlight.get(key);
    if (inFlightPromise) {
      return inFlightPromise as Promise<T>;
    }

    // Start fetch with deduplication registration
    const promise = (async () => {
      try {
        const result = await fetcher();
        const ttl = typeof ttlSeconds === "function" ? ttlSeconds(result) : ttlSeconds;
        this.set(key, result, ttl);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  private set<T>(key: string, data: T, ttlSeconds: number): void {
    const now = Date.now();
    this.cache.delete(key);
    this.cache.set(key, { data, expiresAt: now + ttlSeconds * 1000 });

    if (this.cache.size > this.maxEntries) {
      for (const [k, entry] of this.cache) {
        if (entry.expiresAt <= now) this.cache.delete(k);
      }
      while (this.cache.size > this.maxEntries) {
        const oldest = this.cache.keys().next().value;
        if (oldest === undefined) break;
        this.cache.delete(oldest);
      }
    }
  }

  /**
   * Clears a specific cache key or all keys.
   */
  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Retrieves cache statistics.
   */
  stats() {
    return {
      size: this.cache.size,
      inFlightCount: this.inFlight.size,
    };
  }
}

export const environmentalCache = new EnvironmentalCache();

