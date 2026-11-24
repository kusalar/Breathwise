/**
 * Lightweight in-memory server-side cache with in-flight request deduplication
 * Designed for external environmental API calls (Open-Meteo & Gemini).
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class EnvironmentalCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();

  /**
   * Retrieves an item from cache, or executes the fetcher function with request deduplication.
   */
  async getOrFetch<T>(
    key: string,
    ttlSeconds: number,
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
        this.cache.set(key, {
          data: result,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
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

