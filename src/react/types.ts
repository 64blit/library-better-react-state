import {
  FeatureStore,
  FeatureDefinitions,
  FeatureSlice,
  CombinedFeatureSlices,
  InternalState,
} from "../core/types";

/**
 * Represents the props expected by a component that requires access to a specific feature slice.
 * This utility type is typically used with Higher-Order Components (HOCs) or context patterns
 * to inject a feature slice into a component's props.
 *
 * The resulting prop name will be `${featureName}Slice` (e.g., if `K` is "user", the prop will be `userSlice`).
 *
 * @template TFeatures The overall feature definitions for the store, as passed to `createFeatureStore`.
 * @template K The key (name) of the specific feature slice required by the component.
 * @example
 * type MyComponentProps = OwnProps & WithFeatureSlice<AppFeatures, 'user'>;
 * // MyComponentProps will now require a prop named `userSlice` of type `FeatureSlice<AppFeatures['user']>`.
 */
export type WithFeatureSlice<
  TFeatures extends FeatureDefinitions,
  K extends keyof TFeatures,
> = {
  [P in K as `${string & K}Slice`]: FeatureSlice<TFeatures[K]>;
};

/**
 * Represents the props for a component that needs access to the entire feature store hook.
 * Useful if the component needs to select various parts of the store or multiple slices.
 * @template TFeatures The overall feature definitions for the store.
 */
export type WithFeatureStore<TFeatures extends FeatureDefinitions> = {
  useStore: FeatureStore<TFeatures>;
};
