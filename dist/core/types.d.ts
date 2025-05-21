import { StoreApi, UseBoundStore } from "zustand";
export interface StoreOptions {
    name?: string;
}
export interface FeatureDefinition<TState = any, TActionsCreator extends ((set: any, get: any) => any) | undefined = undefined> {
    initialState: TState;
    actions?: TActionsCreator;
}
export type FeatureDefinitions = {
    [key: string]: FeatureDefinition<any, any>;
};
export type StateFromFeature<F extends FeatureDefinition<any, any>> = F["initialState"];
export type ActionsFromFeature<F extends FeatureDefinition<any, any>> = F["actions"] extends (set: any, get: any) => infer R ? R extends object ? R : {} : {};
export type FeatureSlice<F extends FeatureDefinition<any, any>> = StateFromFeature<F> & ActionsFromFeature<F>;
export type CombinedFeatureSlices<TFeatures extends FeatureDefinitions> = {
    [K in keyof TFeatures]: FeatureSlice<TFeatures[K]>;
};
export interface InternalState {
    _isInitialized: boolean;
    _featureStates: Record<string, "pending" | "initialized" | "error">;
    _setFeatureState: (featureName: string, status: "initialized" | "error") => void;
    _setInitialized: (isInitialized: boolean) => void;
}
export type FeatureStore<TFeatures extends FeatureDefinitions> = UseBoundStore<StoreApi<CombinedFeatureSlices<TFeatures> & InternalState>>;
export interface FeatureStoreConfig<TFeatures extends FeatureDefinitions> {
    options?: StoreOptions;
    features: TFeatures;
}
