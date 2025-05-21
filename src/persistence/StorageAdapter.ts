/**
 * Interface for storage adapters used by the persistence layer.
 */
export interface StorageAdapter {
  /**
   * Save data to storage.
   * @param data The data to save
   * @returns Promise that resolves to true if save was successful
   */
  save(data: any): Promise<boolean>;

  /**
   * Load data from storage.
   * @returns Promise that resolves to the loaded data or null if no data exists
   */
  load<T = any>(): Promise<T | null>;

  /**
   * Clear data from storage.
   * @returns Promise that resolves to true if clear was successful
   */
  clear(): Promise<boolean>;
}

/**
 * Base class for storage adapters that handles key prefixing and basic serialization.
 */
export abstract class BaseStorageAdapter implements StorageAdapter {
  protected readonly storageKey: string;

  /**
   * Create a new storage adapter.
   * @param feature The feature name used as part of the storage key
   * @param prefix The prefix for all storage keys, defaults to 'better-react-state'
   */
  constructor(
    protected readonly feature: string,
    protected readonly prefix: string = "better-react-state",
  ) {
    this.storageKey = `${prefix}:${feature}`;
  }

  /**
   * Save data to storage.
   * @param data The data to save
   */
  abstract save(data: any): Promise<boolean>;

  /**
   * Load data from storage.
   */
  abstract load<T = any>(): Promise<T | null>;

  /**
   * Clear data from storage.
   */
  abstract clear(): Promise<boolean>;

  /**
   * Serialize data for storage.
   */
  protected serialize(data: any): string {
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.error("Failed to serialize data:", error);
      throw new Error("Failed to serialize data for storage");
    }
  }

  /**
   * Deserialize data from storage.
   */
  protected deserialize<T = any>(data: string): T | null {
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.error("Failed to deserialize data:", error);
      return null;
    }
  }
}
