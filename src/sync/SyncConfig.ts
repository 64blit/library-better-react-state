/**
 * Priority levels for sync operations.
 */
export type SyncPriority = "low" | "normal" | "high";

/**
 * Conflict resolution strategies.
 */
export type ConflictResolutionStrategy =
  | "preferLocal"
  | "preferRemote"
  | "merge"
  | ((local: any, remote: any) => any);

/**
 * Feature-specific sync configuration.
 */
export interface SyncConfigOptions {
  featureName: string;
  priority?: SyncPriority;
  includeKeys?: string[];
  excludeKeys?: string[];
  maxBytesPerSync?: number;
  conflictResolution?: ConflictResolutionStrategy;
  version?: string | number;
  dependencies?: string[]; // Other feature names
}

/**
 * SyncConfig class for managing feature-specific sync settings.
 */
export class SyncConfig {
  featureName: string;
  priority: SyncPriority;
  includeKeys?: string[];
  excludeKeys?: string[];
  maxBytesPerSync?: number;
  conflictResolution: ConflictResolutionStrategy;
  version?: string | number;
  dependencies: string[];

  constructor(options: SyncConfigOptions) {
    this.featureName = options.featureName;
    this.priority = options.priority || "normal";
    this.includeKeys = options.includeKeys;
    this.excludeKeys = options.excludeKeys;
    this.maxBytesPerSync = options.maxBytesPerSync;
    this.conflictResolution = options.conflictResolution || "preferRemote";
    this.version = options.version;
    this.dependencies = options.dependencies || [];
  }

  /**
   * Save this config to localStorage (stub for persistence).
   */
  save() {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(
        `syncConfig:${this.featureName}`,
        JSON.stringify(this),
      );
    }
  }

  /**
   * Load a config from localStorage (stub for persistence).
   */
  static load(featureName: string): SyncConfig | null {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(`syncConfig:${featureName}`);
      if (raw) {
        return new SyncConfig(JSON.parse(raw));
      }
    }
    return null;
  }
}
