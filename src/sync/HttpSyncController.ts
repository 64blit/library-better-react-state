import { SyncController, SyncOptions, SyncStatus } from "./SyncController";

/**
 * Concrete SyncController for HTTP RESTful endpoints.
 * Handles push/pull with error handling, retry, and transformation utilities.
 */
export class HttpSyncController<TState = any> extends SyncController<TState> {
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // ms
  private timeout = 10000; // ms
  private failedQueue: (() => Promise<void>)[] = [];

  /**
   * Push local state or pending changes to the server.
   */
  async push(): Promise<any> {
    if (!(await this.isOnline())) {
      this.log("Offline, cannot push");
      this.status = "error";
      this.emit("failed", { type: "offline" });
      return;
    }
    this.status = "syncing";
    this.emit("started", { direction: "push" });
    const state = this.getState();
    const { endpoint, whitelist } = this.options;
    let dataToSync: any;
    if (
      whitelist &&
      typeof state === "object" &&
      state !== null &&
      !Array.isArray(state)
    ) {
      dataToSync = Object.fromEntries(
        Object.entries(state).filter(([k]) => whitelist.includes(k)),
      );
    } else {
      dataToSync = state;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSync),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const result = await response.json();
      this.lastSync = Date.now();
      this.status = "idle";
      this.emit("completed", { direction: "push", result });
      this.retryCount = 0;
      return result;
    } catch (error) {
      this.status = "error";
      this.syncError = error as Error;
      this.log("Push failed", error);
      this.emit("failed", { direction: "push", error });
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => this.push(), this.retryDelay);
      } else {
        this.failedQueue.push(() => this.push());
      }
      throw error;
    }
  }

  /**
   * Pull state from the server and update local state.
   */
  async pull(): Promise<any> {
    if (!(await this.isOnline())) {
      this.log("Offline, cannot pull");
      this.status = "error";
      this.emit("failed", { type: "offline" });
      return;
    }
    this.status = "syncing";
    this.emit("started", { direction: "pull" });
    const { endpoint } = this.options;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const remoteData = await response.json();
      // Optionally transform/validate remoteData here
      const local = this.getState();
      const merged = this.resolveConflict(local, remoteData);
      this.setState(merged);
      this.lastSync = Date.now();
      this.status = "idle";
      this.emit("completed", { direction: "pull", data: merged });
      this.retryCount = 0;
      return merged;
    } catch (error) {
      this.status = "error";
      this.syncError = error as Error;
      this.log("Pull failed", error);
      this.emit("failed", { direction: "pull", error });
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => this.pull(), this.retryDelay);
      } else {
        this.failedQueue.push(() => this.pull());
      }
      throw error;
    }
  }

  /**
   * Push only pending changes (if any) to the server.
   */
  async pushChanges(): Promise<void> {
    if (this.pendingChanges.length === 0) return;
    for (const change of this.pendingChanges) {
      try {
        await this.push();
        // Remove from queue if successful
        this.pendingChanges = this.pendingChanges.filter((c) => c !== change);
      } catch (e) {
        // Already handled in push()
      }
    }
  }

  /**
   * Pull changes from the server with pagination support (stub).
   */
  async pullChanges(page: number = 1, pageSize: number = 100): Promise<void> {
    // Example: append ?page=1&pageSize=100 to endpoint
    const url = `${this.options.endpoint}?page=${page}&pageSize=${pageSize}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const remoteData = await response.json();
      // Merge or process remoteData as needed
      this.setState(this.resolveConflict(this.getState(), remoteData));
      this.lastSync = Date.now();
      this.emit("completed", { direction: "pull", data: remoteData });
    } catch (error) {
      this.log("PullChanges failed", error);
      this.emit("failed", { direction: "pull", error });
      throw error;
    }
  }

  /**
   * Retry all failed operations in the queue.
   */
  async retryFailedQueue() {
    const queue = [...this.failedQueue];
    this.failedQueue = [];
    for (const op of queue) {
      try {
        await op();
      } catch (e) {
        // If still fails, re-queue
        this.failedQueue.push(op);
      }
    }
  }

  /**
   * Transaction support (stub for future atomic sync)
   */
  async runTransaction(fn: () => Promise<void>) {
    // In real implementation, wrap sync ops in a transaction
    await fn();
  }

  /**
   * Data transformation utility (stub for API compatibility)
   */
  protected transformForApi(data: TState): any {
    // Override to map local state to API format
    return data;
  }
}
