import { FeatureStoreConfig, FeatureDefinitions, FeatureStore } from "./types";
export declare function createFeatureStore<TFeatures extends FeatureDefinitions>(config: FeatureStoreConfig<TFeatures>): FeatureStore<TFeatures>;
