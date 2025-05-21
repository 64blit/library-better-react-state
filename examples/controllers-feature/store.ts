import { createFeatureStore, FeatureStoreConfig, FeatureStore, INIT_Object } from '../../src';

// --- Global Init Config ---
export interface MyAppInitConfig {
  apiKey: string;
  apiBaseUrl: string;
}

// --- Greeter Feature ---
interface GreeterState {
  greeting: string;
  nameToGreet: string;
  personalizedMessage?: string; // Added for controller to update
}

const greeterFeature = {
  initialState: { greeting: 'Hello', nameToGreet: 'World' } as GreeterState,
  actions: (set: (updater: Partial<GreeterState> | ((state: GreeterState) => Partial<GreeterState>)) => void) => ({
    setGreetingText: (greeting: string) => set({ greeting }), // Renamed to avoid conflict
    setNameToGreet: (name: string) => set({ nameToGreet: name }),
    clearPersonalizedMessage: () => set({ personalizedMessage: undefined }),
  }),
  controllers: (INIT: INIT_Object, storeApi: any /* StoreApi type for example simplicity */) => ({
    generatePersonalizedMessage: (currentSliceState: GreeterState): Partial<GreeterState> => {
      const myInit = INIT as MyAppInitConfig & INIT_Object; 
      console.log('Controller using INIT object:', myInit);
      let message: string;
      if (!myInit.apiKey) {
        message = `${currentSliceState.greeting} ${currentSliceState.nameToGreet}! (Warning: API Key not found in INIT)`;
      } else {
        message = `${currentSliceState.greeting} ${currentSliceState.nameToGreet} from ${myInit.apiBaseUrl}! (API Key: ${myInit.apiKey.substring(0, 5)}...)`;
      }
      return { personalizedMessage: message }; // Update state with the message
    },
    async fetchAndSetName(currentSliceState: GreeterState): Promise<Partial<GreeterState>> {
        console.log('Controller fetchAndSetName called. Current name:', currentSliceState.nameToGreet);
        await new Promise(resolve => setTimeout(resolve, 500));
        const names = ["Alice", "Bob", "Charlie", "Diana"];
        const newName = names[Math.floor(Math.random() * names.length)];
        console.log('Controller fetched new name:', newName);
        return { nameToGreet: newName }; 
    }
  }),
  featureOptions: {
    waitForGlobalInit: true, 
  }
};

// --- App Store Setup ---
export const features = {
  greeter: greeterFeature,
};
export type AppFeatures = typeof features;

const storeConfig: FeatureStoreConfig<AppFeatures> = {
  features,
  options: { name: 'ControllersExampleStore' },
};

export const useAppStore: FeatureStore<AppFeatures> = createFeatureStore(storeConfig); 
