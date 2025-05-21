/**
 * Supported storage types for persistence.
 */
export type StorageType = "localStorage" | "indexedDB" | "memory" | "none";

/**
 * Options for configuring the persistence layer.
 */
export interface PersistenceOptions {
  /**
   * Whether persistence is enabled.
   * @default true
   */
  enabled?: boolean;

  /**
   * The type of storage to use for persistence.
   * @default 'localStorage'
   */
  storage?: StorageType;

  /**
   * Fields to include in persistence (whitelist).
   * If not provided, all fields will be persisted.
   */
  whitelist?: string[];

  /**
   * Fields to exclude from persistence (blacklist).
   * Takes precedence over whitelist if both are provided.
   */
  blacklist?: string[];

  /**
   * Whether to automatically load persisted state on initialization.
   * @default true
   */
  autoLoad?: boolean;

  /**
   * Whether to automatically save state on changes.
   * @default true
   */
  autoSave?: boolean;

  /**
   * Debounce interval for auto-save in milliseconds.
   * @default 1000
   */
  debounceMs?: number;

  /**
   * Whether to use multi-level caching (memory + persistent storage).
   * @default true
   */
  useCache?: boolean;

  /**
   * Time-to-live for cached items in milliseconds (0 means no expiration).
   * @default 0
   */
  cacheTtl?: number;

  /**
   * Custom key prefix for storage.
   * @default 'better-react-state'
   */
  keyPrefix?: string;

  /**
   * Version of the schema, used for migrations.
   * @default 1
   */
  version?: number;
}

/**
 * Default persistence options.
 */
export const DEFAULT_PERSISTENCE_OPTIONS: PersistenceOptions = {
  enabled: true,
  storage: "localStorage",
  autoLoad: true,
  autoSave: true,
  debounceMs: 1000,
  useCache: true,
  cacheTtl: 0,
  keyPrefix: "better-react-state",
  version: 1,
};
