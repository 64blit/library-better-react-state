import { StoreApi } from 'zustand';
import { getConfig } from '../config';
import { HistoryEntry, perStoreHistory } from '../core/debugMiddleware'; // Assuming perStoreHistory is exported or accessible

/**
 * Retrieves the captured state history for a specific store instance.
 * Only available if debug mode is active and history was captured by debugMiddleware.
 *
 * @param storeName - The name of the store instance (must match the name used in debugMiddleware).
 * @returns An array of HistoryEntry objects, or an empty array if no history or not in debug mode.
 */
export function getStoreHistory<T extends object>(storeName: string): ReadonlyArray<HistoryEntry<T>> {
  if (!getConfig().debugMode || !perStoreHistory[storeName]) {
    return [];
  }
  // Return a shallow copy to prevent direct mutation of the history array
  return [...perStoreHistory[storeName]] as ReadonlyArray<HistoryEntry<T>>;
}

/**
 * Allows programmatically jumping to a previous state from the captured history.
 * This directly calls setState on the store, replacing the entire state.
 * Only works if debug mode is active and history was captured.
 *
 * @param storeApi - The StoreApi instance of the target store.
 * @param storeName - The name of the store instance.
 * @param historyIndex - The index in the history array to jump to.
 * @param targetStateType - Whether to jump to the 'prevState' or 'nextState' of the historical entry.
 * @returns True if the jump was successful, false otherwise (e.g., index out of bounds, not in debug mode).
 */
export function jumpToHistoryState<T extends object>(
  storeApi: StoreApi<T>,
  storeName: string,
  historyIndex: number,
  targetStateType: 'prevState' | 'nextState' = 'nextState'
): boolean {
  if (!getConfig().debugMode) {
    console.warn('[jumpToHistoryState] Debug mode is not active.');
    return false;
  }

  const history = perStoreHistory[storeName];
  if (!history || historyIndex < 0 || historyIndex >= history.length) {
    console.warn(`[jumpToHistoryState] Invalid history index (${historyIndex}) for store "${storeName}". History length: ${history?.length || 0}`);
    return false;
  }

  const entry = history[historyIndex];
  const stateToRestore = targetStateType === 'prevState' ? entry.prevState : entry.nextState;

  if (stateToRestore) {
    storeApi.setState(stateToRestore as T, true); // Replace entire state
    console.log(`[jumpToHistoryState] Store "${storeName}" jumped to history index ${historyIndex} (${targetStateType}).`);
    return true;
  }
  return false;
}

// To make perStoreHistory accessible, debugMiddleware.ts needs to export it.
// If direct export is problematic (e.g. for testing or module structure),
// an alternative is a registration function within debugMiddleware that stores
// a reference to the history for a given store name, accessible by these utils.
// For now, assuming direct export for simplicity of this step.
// If perStoreHistory is not exported, these functions won't work as written. 
