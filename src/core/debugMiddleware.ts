import { StateCreator, StoreApi } from 'zustand';
import { Logger } from '../utils/Logger';
import { getConfig } from '../config';

// Type for Zustand's setState, which is what `set` will be in the middleware arguments
// We are not trying to model devtools' specific action type here, just be compatible.
type ZustandSet<T> = StoreApi<T>['setState'];

// Type for the set function that might be enhanced by devtools or other middleware
// to accept an action name/object as the third argument.
interface SetWithActionName<T extends object> {
  (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean, action?: string | { type: string; [key: string]: any }): void;
}

// Max history items for time travel debugging
const MAX_HISTORY_ITEMS = 50; // Could be made configurable

export interface HistoryEntry<T extends object> {
  actionName: string;
  timestamp: number;
  prevState: T;
  nextState: T;
  actionPayload: any;
  durationMs?: number;
}

// Store history per store instance (identified by storeName for simplicity here)
// Export for time-travel utilities
export const perStoreHistory: Record<string, HistoryEntry<any>[]> = {};

/**
 * Debug middleware for Zustand that logs state changes and optionally captures history for time-travel.
 *
 * @param config - The StateCreator function to wrap.
 * @param storeName - Optional name for the store, used in logging.
 * @returns A StateCreator wrapped with debug logging functionality.
 */
export const debugMiddleware = <T extends object>(
  config: StateCreator<T>,
  storeName: string = 'FeatureStore'
): StateCreator<T> => (set, get, api) => {
  const libConfig = getConfig();

  if (!libConfig.debugMode) {
    return config(set, get, api);
  }

  // Initialize history for this store instance if it doesn't exist
  if (!perStoreHistory[storeName]) {
    perStoreHistory[storeName] = [];
  }
  const currentHistory = perStoreHistory[storeName];

  const loggedSet: SetWithActionName<T> = (partial, replace, action) => {
    const prevState = get();
    const startTime = performance.now(); // Start timing

    (set as SetWithActionName<T>)(partial, replace, action);
    
    const endTime = performance.now(); // End timing
    const duration = endTime - startTime;
    const nextState = get();
    
    let actionName = 'unknownAction';
    if (typeof action === 'string') {
      actionName = action;
    } else if (action && typeof (action as { type: string })?.type === 'string') {
      actionName = (action as { type: string }).type;
    } else if (typeof partial === 'function') {
      // Try to get function name, fallback if anonymous
      actionName = (partial as Function).name || 'anonymousFunctionUpdate';
    } else if (partial !== null && typeof partial === 'object') {
      actionName = 'objectUpdate';
    } // Add more sophisticated action naming if needed

    Logger.debug(`[${storeName}] Action: ${actionName} (took ${duration.toFixed(2)}ms)`, {
      prevState,
      actionPayload: typeof partial === 'function' ? '[function update]' : partial,
      nextState,
    });

    // Capture history if debug mode is on (already checked, but good for clarity)
    if (currentHistory.length >= MAX_HISTORY_ITEMS) {
      currentHistory.shift(); // Keep history size bounded
    }
    currentHistory.push({
      actionName,
      timestamp: Date.now(),
      prevState,
      nextState,
      actionPayload: typeof partial === 'function' ? '[function update]' : partial,
      durationMs: duration,
    });
  };
  
  // The api object provided to `config` should have its `setState` as the `loggedSet`.
  // And the `set` function itself passed to `config` should be `loggedSet`.
  const newApi = { ...api, setState: loggedSet as ZustandSet<T> };

  return config(loggedSet as ZustandSet<T>, get, newApi);
}; 
