import {
  DEFAULT_PERSISTENCE_OPTIONS,
  PersistenceOptions,
  StorageType,
} from "./PersistenceOptions";
import { StorageAdapter } from "./StorageAdapter";
import { MemoryCacheAdapter } from "./MemoryCacheAdapter"; // Static import for use as cacheAdapter
// Remove static imports for specific adapters that will be dynamically imported
// import { LocalStorageAdapter } from "./LocalStorageAdapter";
// import { IndexedDBAdapter } from "./IndexedDBAdapter";

/**
 * PersistenceLayer manages state persistence through various storage adapters
 * with support for selective persistence and multi-level caching.
 */
export class PersistenceLayer<TState = any> {
  public readonly options: Required<PersistenceOptions>;
  private storageAdapter!: StorageAdapter; // Will be initialized by an async method
  private cacheAdapter: StorageAdapter | null; // Assuming MemoryCacheAdapter is also a StorageAdapter
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastSaved: number = 0;

  /**
   * Create a new persistence layer.
   * @param feature The feature name used for storage keys
   * @param options Persistence configuration options
   */
  constructor(
    private readonly feature: string,
    options: PersistenceOptions = {},
  ) {
    this.options = {
      ...DEFAULT_PERSISTENCE_OPTIONS,
      ...options,
    } as Required<PersistenceOptions>;

    // Initialize cacheAdapter synchronously if enabled
    this.cacheAdapter = this.options.useCache && this.options.enabled
      ? new MemoryCacheAdapter( // Use the statically imported MemoryCacheAdapter
          this.feature,
          this.options.keyPrefix,
          this.options.cacheTtl,
        )
      : null;
    
    // storageAdapter will be initialized asynchronously by an init method
    // For now, if persistence is disabled, set a dummy adapter synchronously
    if (!this.options.enabled) {
      this.storageAdapter = this.createDummyAdapter();
    }
  }

  /**
   * Asynchronously initializes the main storage adapter.
   * This method should be called before using save, load, or clear if not persistence disabled.
   */
  public async initializeStorageAdapter(): Promise<void> {
    if (this.options.enabled && typeof this.storageAdapter === 'undefined') {
      // If it's enabled and storageAdapter is still undefined (not even dummy), initialize it.
      // This implies it wasn't disabled initially in constructor.
      this.storageAdapter = await this.createStorageAdapterInternal(this.options.storage);
    } else if (!this.storageAdapter) { // Should only happen if disabled, ensure dummy is set
        this.storageAdapter = this.createDummyAdapter();
    }
  }

  /**
   * Create an appropriate storage adapter based on the specified type.
   */
  private async createStorageAdapterInternal(type: StorageType): Promise<StorageAdapter> { // Renamed and made async
    switch (type) {
      case "localStorage": {
        const { LocalStorageAdapter } = await import("./LocalStorageAdapter");
        return new LocalStorageAdapter(this.feature, this.options.keyPrefix);
      }
      case "indexedDB": {
        const { IndexedDBAdapter } = await import("./IndexedDBAdapter");
        return new IndexedDBAdapter(this.feature, this.options.keyPrefix);
      }
      case "memory": { // Assuming MemoryCacheAdapter is also dynamically imported if used as primary
        const { MemoryCacheAdapter } = await import("./MemoryCacheAdapter");
        return new MemoryCacheAdapter(this.feature, this.options.keyPrefix);
      }
      case "none":
        return this.createDummyAdapter();
      default:
        console.warn(
          `Unknown storage type: ${type}, falling back to localStorage`,
        );
        const { LocalStorageAdapter } = await import("./LocalStorageAdapter");
        return new LocalStorageAdapter(this.feature, this.options.keyPrefix);
    }
  }

  /**
   * Create a dummy adapter that does nothing (used when persistence is disabled).
   */
  private createDummyAdapter(): StorageAdapter {
    return {
      save: async () => true,
      load: async () => null,
      clear: async () => true,
    };
  }

  /**
   * Filter state based on whitelist/blacklist configuration.
   */
  private filterState(state: TState): Partial<TState> {
    // Start with all state
    let filteredState: Partial<TState> = { ...state };

    // Apply whitelist if specified
    if (this.options.whitelist && this.options.whitelist.length > 0) {
      filteredState = Object.fromEntries(
        Object.entries(state as Record<string, any>).filter(([key]) =>
          this.options.whitelist!.includes(key),
        ),
      ) as Partial<TState>;
    }

    // Apply blacklist (takes precedence)
    if (this.options.blacklist && this.options.blacklist.length > 0) {
      filteredState = Object.fromEntries(
        Object.entries(filteredState as Record<string, any>).filter(
          ([key]) => !this.options.blacklist!.includes(key),
        ),
      ) as Partial<TState>;
    }

    return filteredState;
  }

  /**
   * Save state to persistent storage and cache.
   * @param state The state to save
   * @returns Promise that resolves to true if save was successful
   */
  async save(state: TState): Promise<boolean> {
    if (!this.options.enabled) return true;
    await this.ensureAdapterInitialized(); // Ensure adapter is ready

    // Cancel any pending save timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    // If we should debounce and it's not the first save
    if (this.options.debounceMs > 0 && this.lastSaved > 0) {
      return new Promise((resolve) => {
        this.saveTimeout = setTimeout(async () => {
          const result = await this._save(state);
          resolve(result);
        }, this.options.debounceMs);
      });
    }

    return this._save(state);
  }

  /**
   * Internal save implementation.
   */
  private async _save(state: TState): Promise<boolean> {
    try {
      const filteredState = this.filterState(state);

      // Save to cache first if enabled
      if (this.cacheAdapter) {
        await this.cacheAdapter.save(filteredState);
      }

      // Save to persistent storage
      const result = await this.storageAdapter.save(filteredState);

      this.lastSaved = Date.now();
      return result;
    } catch (error) {
      console.error("Failed to save state:", error);
      return false;
    }
  }

  /**
   * Load state from persistent storage or cache.
   * @returns Promise that resolves to the loaded state or null if none exists
   */
  async load<T = TState>(): Promise<Partial<T> | null> {
    if (!this.options.enabled) return null;
    await this.ensureAdapterInitialized(); // Ensure adapter is ready

    try {
      // Try to load from cache first
      if (this.cacheAdapter) {
        const cachedState = await this.cacheAdapter.load<T>();
        if (cachedState) {
          return cachedState;
        }
      }

      // Load from persistent storage
      const state = await this.storageAdapter.load<T>();

      // Update cache if we loaded from persistent storage
      if (state && this.cacheAdapter) {
        await this.cacheAdapter.save(state);
      }

      return state;
    } catch (error) {
      console.error("Failed to load state:", error);
      return null;
    }
  }

  /**
   * Clear persisted state.
   * @returns Promise that resolves to true if clear was successful
   */
  async clear(): Promise<boolean> {
    if (!this.options.enabled) return true;
    await this.ensureAdapterInitialized(); // Ensure adapter is ready

    try {
      let success = true;

      // Clear cache if enabled
      if (this.cacheAdapter) {
        success = (await this.cacheAdapter.clear()) && success;
      }

      // Clear persistent storage
      success = (await this.storageAdapter.clear()) && success;

      return success;
    } catch (error) {
      console.error("Failed to clear persisted state:", error);
      return false;
    }
  }

  /**
   * Set up auto-saving of state when it changes.
   * @param subscribe Function that subscribes to state changes
   * @returns Function to unsubscribe
   */
  setupAutoSave(
    subscribe: (callback: (state: TState) => void) => () => void,
  ): () => void {
    if (!this.options.enabled || !this.options.autoSave) return () => {};

    return subscribe((state) => {
      this.save(state);
    });
  }

  // Helper to ensure the adapter is initialized
  private async ensureAdapterInitialized(): Promise<void> {
    if (this.options.enabled && typeof this.storageAdapter === 'undefined') {
      // If it's enabled and storageAdapter is still undefined (not even dummy), initialize it.
      // This implies it wasn't disabled initially in constructor.
      await this.initializeStorageAdapter();
    }
  }
}
