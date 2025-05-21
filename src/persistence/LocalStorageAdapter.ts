import { BaseStorageAdapter } from "./StorageAdapter";

/**
 * Storage adapter that uses browser's localStorage for persistent storage.
 */
export class LocalStorageAdapter extends BaseStorageAdapter {
  /**
   * Check if localStorage is available in the current environment.
   */
  private isLocalStorageAvailable(): boolean {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    try {
      // Try a test operation
      const testKey = `test-${Date.now()}`;
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Save data to localStorage.
   * @param data The data to save
   * @returns Promise that resolves to true if save was successful
   */
  async save(data: any): Promise<boolean> {
    try {
      if (!this.isLocalStorageAvailable()) {
        console.warn("localStorage is not available");
        return false;
      }

      const serialized = this.serialize(data);
      localStorage.setItem(this.storageKey, serialized);
      return true;
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
      return false;
    }
  }

  /**
   * Load data from localStorage.
   * @returns Promise that resolves to the loaded data or null if no data exists
   */
  async load<T = any>(): Promise<T | null> {
    try {
      if (!this.isLocalStorageAvailable()) {
        console.warn("localStorage is not available");
        return null;
      }

      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        return null;
      }

      return this.deserialize<T>(data);
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
      return null;
    }
  }

  /**
   * Clear data from localStorage.
   * @returns Promise that resolves to true if clear was successful
   */
  async clear(): Promise<boolean> {
    try {
      if (!this.isLocalStorageAvailable()) {
        console.warn("localStorage is not available");
        return false;
      }

      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
      return false;
    }
  }
}
