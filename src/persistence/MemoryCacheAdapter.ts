import { BaseStorageAdapter } from "./StorageAdapter";

/**
 * Storage adapter that uses in-memory cache for fast access.
 * Used as a first-level cache in a multi-level caching strategy.
 */
export class MemoryCacheAdapter extends BaseStorageAdapter {
  // Static cache map shared across instances
  private static readonly cacheStore: Map<
    string,
    { data: any; timestamp: number }
  > = new Map();

  // Optional time-to-live for cached items (in milliseconds)
  private readonly ttl: number;

  /**
   * Create a new memory cache adapter.
   * @param feature The feature name used as part of the storage key
   * @param prefix The prefix for all storage keys, defaults to 'better-react-state'
   * @param ttl Time-to-live for cached items in milliseconds (0 means no expiration)
   */
  constructor(
    feature: string,
    prefix: string = "better-react-state",
    ttl: number = 0,
  ) {
    super(feature, prefix);
    this.ttl = ttl;
  }

  /**
   * Save data to memory cache.
   * @param data The data to save
   * @returns Promise that resolves to true if save was successful
   */
  async save(data: any): Promise<boolean> {
    try {
      MemoryCacheAdapter.cacheStore.set(this.storageKey, {
        data,
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error("Failed to save to memory cache:", error);
      return false;
    }
  }

  /**
   * Load data from memory cache.
   * @returns Promise that resolves to the loaded data or null if no data exists or is expired
   */
  async load<T = any>(): Promise<T | null> {
    try {
      const cached = MemoryCacheAdapter.cacheStore.get(this.storageKey);

      if (!cached) {
        return null;
      }

      // Check if cache entry has expired
      if (this.ttl > 0 && Date.now() - cached.timestamp > this.ttl) {
        MemoryCacheAdapter.cacheStore.delete(this.storageKey);
        return null;
      }

      return cached.data as T;
    } catch (error) {
      console.error("Failed to load from memory cache:", error);
      return null;
    }
  }

  /**
   * Clear data from memory cache.
   * @returns Promise that resolves to true if clear was successful
   */
  async clear(): Promise<boolean> {
    try {
      MemoryCacheAdapter.cacheStore.delete(this.storageKey);
      return true;
    } catch (error) {
      console.error("Failed to clear memory cache:", error);
      return false;
    }
  }

  /**
   * Check if a key exists in the cache and is not expired.
   */
  async has(): Promise<boolean> {
    try {
      const cached = MemoryCacheAdapter.cacheStore.get(this.storageKey);

      if (!cached) {
        return false;
      }

      // Check if cache entry has expired
      if (this.ttl > 0 && Date.now() - cached.timestamp > this.ttl) {
        MemoryCacheAdapter.cacheStore.delete(this.storageKey);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all entries from the memory cache.
   */
  static clearAll(): void {
    MemoryCacheAdapter.cacheStore.clear();
  }
}
