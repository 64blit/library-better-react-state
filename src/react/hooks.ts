import { shallow } from "zustand/shallow";
import {
  FeatureStore,
  FeatureDefinitions,
  FeatureSlice,
  CombinedFeatureSlices,
  InternalState,
} from "../core/types";

/**
 * A hook to access a specific feature slice from a feature store.
 * It uses shallow equality by default to prevent re-renders if the slice object itself changes but its top-level properties remain the same.
 *
 * @template TFeatures The overall feature definitions for the store.
 * @template K The key (name) of the specific feature slice to access.
 * @param useStore The feature store hook returned by `createFeatureStore`.
 * @param featureName The name of the feature slice to retrieve.
 * @returns The requested feature slice.
 *
 * @example
 * const MyComponent = () => {
 *   const userSlice = useFeatureSlice(useAppStore, 'user');
 *   return <div>{userSlice.name}</div>;
 * };
 */
export function useFeatureSlice<
  TFeatures extends FeatureDefinitions,
  K extends keyof TFeatures,
>(
  useStore: FeatureStore<TFeatures>,
  featureName: K,
): FeatureSlice<TFeatures[K]> {
  return useStore(
    (state) => (state as CombinedFeatureSlices<TFeatures>)[featureName],
    shallow,
  );
}

// It might also be useful to have a hook that provides direct access to a feature's actions or controllers.
// export function useFeatureActions<...>(...)
// export function useFeatureControllers<...>(...)
// These would be similar to useFeatureSlice but select deeper.
