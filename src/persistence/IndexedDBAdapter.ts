import { BaseStorageAdapter } from "./StorageAdapter";

/**
 * Storage adapter that uses browser's IndexedDB for persistent storage.
 * Provides more robust storage capabilities and better performance for larger datasets.
 */
export class IndexedDBAdapter extends BaseStorageAdapter {
  private readonly dbName: string = "better-react-state-db";
  private readonly storeName: string = "state-store";
  private readonly dbVersion: number = 1;

  /**
   * Open a connection to the IndexedDB database.
   * @returns Promise that resolves to an IDBDatabase instance
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB is not available in this environment"));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
    });
  }

  /**
   * Save data to IndexedDB.
   * @param data The data to save
   * @returns Promise that resolves to true if save was successful
   */
  async save(data: any): Promise<boolean> {
    try {
      const db = await this.openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readwrite");

        transaction.onerror = () => {
          reject(new Error("IndexedDB transaction failed"));
        };

        const store = transaction.objectStore(this.storeName);
        const request = store.put({
          id: this.feature,
          data,
          timestamp: Date.now(),
        });

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          reject(new Error("Failed to store data in IndexedDB"));
        };

        // Close the database when transaction completes
        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error("Failed to save to IndexedDB:", error);
      return false;
    }
  }

  /**
   * Load data from IndexedDB.
   * @returns Promise that resolves to the loaded data or null if no data exists
   */
  async load<T = any>(): Promise<T | null> {
    try {
      const db = await this.openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.get(this.feature);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.data as T);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          reject(new Error("Failed to load data from IndexedDB"));
        };

        // Close the database when transaction completes
        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error("Failed to load from IndexedDB:", error);
      return null;
    }
  }

  /**
   * Clear data from IndexedDB.
   * @returns Promise that resolves to true if clear was successful
   */
  async clear(): Promise<boolean> {
    try {
      const db = await this.openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(this.feature);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          reject(new Error("Failed to clear data from IndexedDB"));
        };

        // Close the database when transaction completes
        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error("Failed to clear IndexedDB data:", error);
      return false;
    }
  }
}
