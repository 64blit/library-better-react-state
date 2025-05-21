import { StoreApi } from 'zustand';
import { CombinedFeatureSlices, InternalState } from '../core/types'; // Adjust path as needed
import { diff, Diff } from 'deep-diff'; // Import from deep-diff

/**
 * Creates a deep copy (snapshot) of the current state of a feature store.
 * This implementation uses JSON.stringify/parse for deep cloning,
 * which works well for serializable state but has limitations (e.g., Dates, undefined, functions).
 *
 * @param storeApi - The Zustand store API instance.
 * @returns A deep copy of the store's state, excluding internal properties like _INIT.
 */
export function createStateSnapshot<S extends object>(
  storeApi: StoreApi<S>
): Partial<S> {
  const currentState = storeApi.getState();
  
  // Attempt to create a cleaner snapshot by excluding known internal/non-state data if possible,
  // or by selecting only the feature slices if the store structure is known.
  // For a generic approach, we clone the whole state but then might want to filter it.

  // Simple deep clone using JSON methods:
  let clonedState: S;
  try {
    clonedState = JSON.parse(JSON.stringify(currentState));
  } catch (e) {
    console.error("Failed to create state snapshot using JSON methods. State might contain non-serializable data.", e);
    // Fallback or throw error, depending on desired robustness
    // For now, return a shallow copy as a fallback, with a warning
    console.warn("Returning a shallow copy as a fallback for snapshot.");
    return { ...currentState }; 
  }

  // If S is CombinedFeatureSlices & InternalState, we might want to exclude InternalState fields
  // For now, let's assume S is the user-facing state and clone it all.
  // If specific internal fields (like _INIT or functions) should be excluded, 
  // they need to be handled explicitly.
  
  // Example of trying to exclude a known internal field if its name is fixed:
  // if (clonedState && typeof clonedState === 'object' && '_INIT' in clonedState) {
  //   delete (clonedState as any)._INIT;
  // }

  return clonedState;
}

// We will add the diffing utility here later. 

/**
 * Type definition for the kinds of differences `deep-diff` can report.
 */
export type DiffKind = "N" | "D" | "E" | "A";
// N - indicates a newly added property/element
// D - indicates a property/element was deleted
// E - indicates a property/element was edited
// A - indicates a change occurred within an array

/**
 * Represents a single difference between two objects, as reported by `deep-diff`.
 */
export interface StateDiff<LHS = any, RHS = any> {
  kind: DiffKind;
  path: (string | number)[];
  lhs?: LHS; // Left-hand side (original value)
  rhs?: RHS; // Right-hand side (new value)
  index?: number;
  item?: StateDiff<LHS, RHS>; // Used for array changes
}

/**
 * Calculates the differences between two state snapshots.
 *
 * @param snapshotA - The first state snapshot (e.g., previous state).
 * @param snapshotB - The second state snapshot (e.g., current state).
 * @returns An array of diff objects, or undefined if no differences are found or an error occurs.
 *          Each diff object details a change (kind, path, lhs, rhs).
 */
export function diffStates<S extends object>(
  snapshotA: Partial<S>,
  snapshotB: Partial<S>
): StateDiff[] | undefined {
  try {
    const differences = diff(snapshotA, snapshotB);
    // Cast to StateDiff[] as deep-diff's Diff type is generic
    return differences as StateDiff[] | undefined;
  } catch (e) {
    console.error("Failed to diff states:", e);
    return undefined;
  }
}
