import EventEmitter from "events";

/**
 * Options for configuring the SyncController.
 */
export interface SyncOptions {
  endpoint: string;
  strategy?: "manual" | "periodic" | "onChange";
  interval?: number; // ms, for periodic
  whitelist?: string[];
  featureName?: string;
  // Add more options as needed
}

/**
 * Status of the sync process.
 */
export type SyncStatus = "idle" | "syncing" | "error" | "paused";

/**
 * Base class for managing synchronization between client state and server.
 * TState is the type of the feature's state being synced.
 */
export abstract class SyncController<TState = any> {
  public status: SyncStatus = "idle";
  public lastSync: number | null = null;
  public pendingChanges: Partial<TState>[] = [];
  public readonly options: SyncOptions;
  protected eventEmitter: EventEmitter;
  protected syncError: Error | null = null;
  /** Last synced state for differential sync */
  protected lastSyncedState: Partial<TState> = {};
  /** Last sync timestamp */
  protected lastSyncTimestamp: number | null = null;
  /** Unique device identifier for version vector */
  protected deviceId: string = this.generateDeviceId();
  /** Version vector for conflict detection */
  protected versionVector: Record<string, number> = {};
  /** Last modified timestamps for each key */
  protected lastModified: Record<string, number> = {};
  /** Offline operation queue */
  protected operationQueue: Array<{
    type: string;
    data: any;
    timestamp: number;
  }> = [];
  /** Sync history log */
  protected syncHistory: Array<{
    timestamp: number;
    type: string;
    status: string;
    details?: any;
  }> = [];

  constructor(
    options: SyncOptions,
    protected getState: () => TState,
    protected setState: (state: Partial<TState>) => void,
  ) {
    this.options = options;
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Push local state to the server. Must be implemented by subclass.
   */
  abstract push(): Promise<any>;

  /**
   * Pull state from the server. Must be implemented by subclass.
   */
  abstract pull(): Promise<any>;

  /**
   * Emit a sync event (started, completed, failed, etc.)
   */
  protected emit(event: string, payload?: any) {
    this.eventEmitter.emit(event, payload);
  }

  /**
   * Register a listener for sync events.
   */
  on(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Check network connectivity (stub, override for real checks)
   */
  protected async isOnline(): Promise<boolean> {
    // In real apps, use navigator.onLine or a ping endpoint
    return true;
  }

  /**
   * Utility for conflict resolution (stub, override as needed)
   */
  protected resolveConflict(local: TState, remote: TState): TState {
    // Default: prefer remote, override for custom logic
    return remote;
  }

  /**
   * Log sync operations (can be overridden for custom logging)
   */
  protected log(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug(`[SyncController] ${message}`, ...args);
    }
  }

  /**
   * Compute shallow changes between current and base state.
   * Returns an object with only changed keys.
   */
  protected getStateChanges(
    current: Partial<TState>,
    base: Partial<TState>,
  ): Partial<TState> {
    const changes: Partial<TState> = {};
    for (const key in current) {
      if (current[key] !== base[key]) {
        changes[key] = current[key];
      }
    }
    return changes;
  }

  /**
   * Compute a simple checksum for data integrity (JSON string hash).
   */
  protected computeChecksum(data: any): string {
    // Simple hash: not cryptographically secure
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  /**
   * Push only changed data to the server using PATCH.
   * Updates lastSyncedState and lastSyncTimestamp on success.
   * No-op if no changes detected.
   */
  async pushDifferential(): Promise<any> {
    const currentState = this.getState();
    const changes = this.getStateChanges(currentState, this.lastSyncedState);
    if (Object.keys(changes).length === 0) {
      this.log("No changes to sync (differential)");
      return null;
    }
    const checksum = this.computeChecksum(changes);
    try {
      const response = await fetch(this.options.endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes,
          lastSyncTimestamp: this.lastSyncTimestamp,
          checksum,
        }),
      });
      const result = await response.json();
      // Handle server-side conflict (stub, to be expanded in next subtask)
      if (result.conflict) {
        this.log("Conflict detected during differential sync");
        // Optionally handle conflict here
        return result;
      }
      this.lastSyncedState = { ...currentState };
      this.lastSyncTimestamp = Date.now();
      this.log("Differential sync successful", changes);
      return result;
    } catch (error) {
      this.log("Differential sync failed", error);
      throw error;
    }
  }

  /**
   * Chunking stub for large datasets (to be implemented for partial syncs).
   */
  protected chunkData(data: any, chunkSize: number): any[] {
    // TODO: Implement chunking for large objects/arrays
    return [data];
  }

  /** Generate a pseudo-random device ID */
  protected generateDeviceId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  /**
   * Increment version vector and update lastModified for a key.
   */
  protected markModified(key: string) {
    this.versionVector[key] = (this.versionVector[key] || 0) + 1;
    this.lastModified[key] = Date.now();
  }

  /**
   * Detect field-level conflicts between base, local, and remote states.
   * Returns a map of conflicting keys and their values.
   */
  protected detectConflicts(
    base: Partial<TState>,
    local: Partial<TState>,
    remote: Partial<TState>,
  ): Record<string, { local: any; remote: any; base: any }> {
    const conflicts: Record<string, { local: any; remote: any; base: any }> =
      {};
    const keys = new Set([
      ...Object.keys(base),
      ...Object.keys(local),
      ...Object.keys(remote),
    ]);
    for (const key of keys) {
      const baseVal = (base as Record<string, any>)[key];
      const localVal = (local as Record<string, any>)[key];
      const remoteVal = (remote as Record<string, any>)[key];
      if (
        localVal !== remoteVal &&
        localVal !== baseVal &&
        remoteVal !== baseVal
      ) {
        conflicts[key] = { local: localVal, remote: remoteVal, base: baseVal };
      }
    }
    return conflicts;
  }

  /**
   * Conflict matrix stub for severity categorization (to be expanded).
   */
  protected conflictMatrix(key: string, type: string): string {
    // TODO: Implement severity matrix based on field importance/type
    return "medium";
  }

  // ==== GLOBAL SYNC CONTROL (static methods) ====
  private static _globalSyncEnabled = true;
  private static _globalSyncPaused = false;

  /** Enable global sync operations */
  static enableSync() {
    SyncController._globalSyncEnabled = true;
  }

  /** Disable global sync operations */
  static disableSync() {
    SyncController._globalSyncEnabled = false;
  }

  /** Pause all sync operations (temporary) */
  static pauseSync() {
    SyncController._globalSyncPaused = true;
  }

  /** Resume all sync operations */
  static resumeSync() {
    SyncController._globalSyncPaused = false;
  }

  /**
   * Force sync (push and pull) for all controllers.
   */
  static async forceSyncAll(controllers: SyncController[]) {
    if (!SyncController._globalSyncEnabled || SyncController._globalSyncPaused)
      return;
    await Promise.all(
      controllers.map(async (c) => {
        try {
          await c.push();
          await c.pull();
        } catch (e) {
          // Ignore errors here
        }
      }),
    );
  }

  /**
   * Get sync status summary for all controllers.
   */
  static getSyncStatus(controllers: SyncController[]) {
    return controllers.map((c) => ({
      feature: c.options.featureName,
      status: c.status,
      lastSync: c.lastSync,
      pending: c.pendingChanges.length,
      error: c.syncError?.message,
    }));
  }

  /**
   * Clear failed queue and pending changes for all controllers.
   */
  static clearSyncQueue(controllers: SyncController[]) {
    controllers.forEach((c) => {
      // @ts-expect-error: access to protected
      c.failedQueue = [];
      c.pendingChanges = [];
    });
  }

  /**
   * Register a sync event listener on all controllers.
   */
  static registerSyncListener(
    controllers: SyncController[],
    event: string,
    listener: (...args: any[]) => void,
  ) {
    controllers.forEach((c) => c.on(event, listener));
  }

  /**
   * Get sync statistics for monitoring/debugging.
   */
  static syncStatistics(controllers: SyncController[]) {
    return {
      total: controllers.length,
      syncing: controllers.filter((c) => c.status === "syncing").length,
      errors: controllers.filter((c) => c.status === "error").length,
      totalPending: controllers.reduce(
        (sum, c) => sum + c.pendingChanges.length,
        0,
      ),
    };
  }

  /**
   * Migration utilities (stub for future migrations)
   */
  static migrateSyncSystem(/* params */) {
    // TODO: Implement migration logic for sync system updates
  }

  /** Static registry for conflict resolution strategies */
  private static conflictResolutionStrategies: Record<
    string,
    (local: any, remote: any, base: any, key: string) => any
  > = {
    "client-wins": (local, _remote, _base, _key) => local,
    "server-wins": (_local, remote, _base, _key) => remote,
    "last-modified-wins": (local, remote, base, key) => {
      // Use lastModified timestamps if available
      // @ts-expect-error: this context
      const localTime = this?.lastModified?.[key] || 0;
      // @ts-expect-error: this context
      const remoteTime = this?.remoteLastModified?.[key] || 0;
      return localTime >= remoteTime ? local : remote;
    },
    manual: (local, remote, base, key) => ({
      conflict: true,
      local,
      remote,
      base,
      key,
    }),
  };

  /** Register a custom conflict resolution strategy */
  static registerConflictResolutionStrategy(
    type: string,
    handler: (local: any, remote: any, base: any, key: string) => any,
  ) {
    SyncController.conflictResolutionStrategies[type] = handler;
  }

  /**
   * Resolve a conflict for a given key using the configured or default strategy.
   */
  protected resolveConflictStrategy(
    key: string,
    local: any,
    remote: any,
    base: any,
    type: string = "server-wins",
  ): any {
    const strategy =
      SyncController.conflictResolutionStrategies[type] ||
      SyncController.conflictResolutionStrategies["server-wins"];
    const result = strategy.call(this, local, remote, base, key);
    this.auditConflictResolution(key, local, remote, base, type, result);
    return result;
  }

  /**
   * Field-level merge for non-conflicting fields.
   */
  protected mergeNonConflictingFields(
    local: Partial<TState>,
    remote: Partial<TState>,
    base: Partial<TState>,
  ): Partial<TState> {
    const merged: Record<string, any> = {};
    const keys = new Set([
      ...Object.keys(local),
      ...Object.keys(remote),
      ...Object.keys(base),
    ]);
    for (const key of keys) {
      const localVal = (local as Record<string, any>)[key];
      const remoteVal = (remote as Record<string, any>)[key];
      const baseVal = (base as Record<string, any>)[key];
      if (localVal === remoteVal) {
        merged[key] = localVal;
      } else if (localVal === baseVal) {
        merged[key] = remoteVal;
      } else if (remoteVal === baseVal) {
        merged[key] = localVal;
      } else {
        // Conflict: use strategy
        merged[key] = this.resolveConflictStrategy(
          key,
          localVal,
          remoteVal,
          baseVal,
        );
      }
    }
    return merged as Partial<TState>;
  }

  /**
   * Audit log stub for conflict resolution decisions.
   */
  protected auditConflictResolution(
    key: string,
    local: any,
    remote: any,
    base: any,
    strategy: string,
    result: any,
  ) {
    // TODO: Implement persistent audit logging
    this.log(`Conflict resolved for key '${key}' using '${strategy}':`, {
      local,
      remote,
      base,
      result,
    });
  }

  /**
   * Queue an operation for offline support and persist it.
   */
  protected queueOperation(type: string, data: any) {
    this.operationQueue.push({ type, data, timestamp: Date.now() });
    this.persistQueue();
  }

  /**
   * Persist the operation queue (stub: uses localStorage for now).
   */
  protected persistQueue() {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(
        `syncQueue:${this.options.featureName}`,
        JSON.stringify(this.operationQueue),
      );
    }
    // TODO: Use IndexedDB for large queues
  }

  /**
   * Load the operation queue from storage (stub: uses localStorage for now).
   */
  protected loadQueue() {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(
        `syncQueue:${this.options.featureName}`,
      );
      if (raw) {
        this.operationQueue = JSON.parse(raw);
      }
    }
  }

  /**
   * Process the operation queue when back online.
   * Uses command pattern for replaying operations.
   */
  async processQueue() {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const queue = [...this.operationQueue];
    this.operationQueue = [];
    for (const op of queue) {
      try {
        await this.replayOperation(op);
      } catch (e) {
        // Retry with exponential backoff (stub)
        this.queueOperation(op.type, op.data);
      }
    }
    this.persistQueue();
  }

  /**
   * Replay a single operation (command pattern).
   */
  protected async replayOperation(op: {
    type: string;
    data: any;
    timestamp: number;
  }) {
    switch (op.type) {
      case "push":
        // push() does not accept arguments; uses current state
        await this.push();
        break;
      // Add more operation types as needed
      default:
        throw new Error(`Unknown operation type: ${op.type}`);
    }
  }

  /**
   * Batch and compress operations (stub for future optimization).
   */
  protected compressQueue() {
    // TODO: Implement queue compression to combine sequential operations
  }

  /**
   * Track a sync event in the history log.
   */
  protected trackSyncEvent(type: string, status: string, details?: any) {
    this.syncHistory.push({ timestamp: Date.now(), type, status, details });
    // Optionally persist or notify
    this.notifySyncEvent(type, status, details);
  }

  /**
   * Get real-time sync progress (stub).
   */
  getSyncProgress(): { percent: number; pending: number; completed: number } {
    // TODO: Implement real progress tracking
    return {
      percent: this.status === "syncing" ? 50 : 100,
      pending: this.pendingChanges.length,
      completed: this.status === "idle" ? 1 : 0,
    };
  }

  /**
   * Get detailed sync statistics (stub).
   */
  getSyncStatistics(): {
    success: number;
    failure: number;
    bandwidth: number;
    avgTime: number;
  } {
    // TODO: Implement real statistics
    return {
      success: this.syncHistory.filter((e) => e.status === "completed").length,
      failure: this.syncHistory.filter((e) => e.status === "failed").length,
      bandwidth: 0, // Placeholder
      avgTime: 0, // Placeholder
    };
  }

  /**
   * Notify system or user of sync event (stub).
   */
  protected notifySyncEvent(type: string, status: string, details?: any) {
    // TODO: Implement notification system
  }

  /**
   * Get sync history log.
   */
  getSyncHistory() {
    return this.syncHistory;
  }

  /**
   * Performance analytics stub (to be implemented).
   */
  getPerformanceAnalytics() {
    // TODO: Implement analytics for bottleneck detection
    return {};
  }
}
