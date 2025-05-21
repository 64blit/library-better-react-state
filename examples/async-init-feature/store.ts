import { createFeatureStore, FeatureStoreConfig, FeatureStore } from '../../src';
// StoreApi and INIT_Object are types for internal library use or advanced scenarios,
// not typically imported directly by simple feature definitions in examples.

// --- User Feature ---
interface UserState {
  userData: { id: string; name: string; email: string } | null;
  isLoading: boolean;
  error?: string;
}

const userFeature = {
  initialState: { userData: null, isLoading: false } as UserState,
  actions: (set: (updater: Partial<UserState> | ((state: UserState) => Partial<UserState>)) => void) => ({
    fetchUserStart: () => set({ isLoading: true, error: undefined }),
    fetchUserSuccess: (userData: UserState['userData']) => set({ userData, isLoading: false }),
    fetchUserFailure: (error: string) => set({ isLoading: false, error }),
  }),
  // The type for storeApi (StoreApi<any>) is inferred correctly by TypeScript
  // when used as a parameter within the FeatureDefinition structure, based on how
  // createFeatureStore provides it.
  init: async (storeApi: any, featureName: string) => { // Using 'any' for storeApi type in example for simplicity
    console.log(`Async init started for feature: ${featureName}`);
    // Accessing feature slice via storeApi.getState()
    // Note: In a real app, ensure featureName is correctly typed if using it as an index.
    const featureSliceActions = storeApi.getState()[featureName];
    
    if (!featureSliceActions || typeof featureSliceActions.fetchUserStart !== 'function') {
        console.error(`fetchUserStart action not found on feature ${featureName}. State:`, storeApi.getState());
        return;
    }
    featureSliceActions.fetchUserStart();

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockUserData = { id: '1', name: 'Jane Doe', email: 'jane.doe@example.com' };
      featureSliceActions.fetchUserSuccess(mockUserData);
      console.log(`Async init completed for feature: ${featureName}`);
    } catch (e: any) {
      featureSliceActions.fetchUserFailure(e.message || 'Failed to fetch user');
      console.error(`Async init error for feature: ${featureName}`, e);
    }
  },
};

// --- App Store Setup ---
export const features = {
  user: userFeature,
};
export type AppFeatures = typeof features;

const storeConfig: FeatureStoreConfig<AppFeatures> = {
  features,
  options: { name: 'AsyncInitExampleStore' },
};

export const useAppStore: FeatureStore<AppFeatures> = createFeatureStore(storeConfig); 
