import { createFeatureStore, FeatureStoreConfig } from '../../src'; // Adjust path based on actual structure

interface CounterState {
  count: number;
  lastUpdated?: string;
}

const counterFeature = {
  initialState: { count: 0 } as CounterState,
  actions: (set: (updater: Partial<CounterState> | ((state: CounterState) => Partial<CounterState>)) => void) => ({
    increment: () => set(state => ({ count: state.count + 1, lastUpdated: new Date().toLocaleTimeString() })),
    decrement: () => set(state => ({ count: state.count - 1, lastUpdated: new Date().toLocaleTimeString() })),
    reset: () => set({ count: 0, lastUpdated: new Date().toLocaleTimeString() }),
  }),
};

export const features = {
  counter: counterFeature,
};

export type AppFeatures = typeof features;

const storeConfig: FeatureStoreConfig<AppFeatures> = {
  features,
  options: {
    name: 'BasicExampleStore',
    // Enable devtools if you have Redux DevTools extension installed
    // devtools: true, 
  },
};

export const useAppStore = createFeatureStore(storeConfig);

// Expose feature actions/state directly for easier access in this example
export const counterActions = useAppStore.getState().counter;
// Note: For components, prefer using useFeatureSlice for reactive updates. 
