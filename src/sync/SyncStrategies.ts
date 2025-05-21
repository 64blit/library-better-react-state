import { SyncController } from "./SyncController";

/**
 * Base interface for a sync strategy.
 */
export interface SyncStrategy {
  start(): void;
  stop(): void;
}

/**
 * Manual sync strategy: user triggers sync explicitly.
 */
export class ManualSyncStrategy implements SyncStrategy {
  constructor(private controller: SyncController) {}
  start() {}
  stop() {}
  /** Trigger a manual sync (push and/or pull) */
  async sync() {
    await this.controller.push();
    await this.controller.pull();
  }
}

/**
 * Periodic sync strategy: syncs at a fixed interval.
 */
export class PeriodicSyncStrategy implements SyncStrategy {
  private intervalId: NodeJS.Timeout | null = null;
  constructor(
    private controller: SyncController,
    private interval: number = 60000, // default 1 min
  ) {}
  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.controller.push();
      this.controller.pull();
    }, this.interval);
  }
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * OnChange sync strategy: syncs when state changes.
 * Requires a subscribe function (e.g., from Zustand store).
 */
export class OnChangeSyncStrategy implements SyncStrategy {
  private unsubscribe: (() => void) | null = null;
  constructor(
    private controller: SyncController,
    private subscribe: (listener: () => void) => () => void,
  ) {}
  start() {
    if (this.unsubscribe) return;
    this.unsubscribe = this.subscribe(() => {
      this.controller.push();
    });
  }
  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

/**
 * Factory to create a sync strategy by name.
 */
export function createSyncStrategy(
  type: "manual" | "periodic" | "onChange",
  controller: SyncController,
  options?: {
    interval?: number;
    subscribe?: (listener: () => void) => () => void;
  },
): SyncStrategy {
  switch (type) {
    case "manual":
      return new ManualSyncStrategy(controller);
    case "periodic":
      return new PeriodicSyncStrategy(controller, options?.interval);
    case "onChange":
      if (!options?.subscribe)
        throw new Error("subscribe function required for onChange");
      return new OnChangeSyncStrategy(controller, options.subscribe);
    default:
      throw new Error(`Unknown sync strategy: ${type}`);
  }
}

// Stubs for battery/network/idle awareness (to be implemented as needed)
export function isBatteryLow(): boolean {
  // TODO: Implement battery check for mobile/web
  return false;
}
export function isNetworkMetered(): boolean {
  // TODO: Implement network metering check
  return false;
}
export function isUserIdle(): boolean {
  // TODO: Implement idle detection
  return false;
}
