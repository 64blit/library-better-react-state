// Main entry point for better-react-state library
export { 
  type BaseState,
  type SliceControllers,
  createAppStore,
  createStoreSlice,
  type AppStoreConfig, 
  type SliceConfig, 
  type AppRootState, 
  type AppState
} from './AppStore'

export {
    type StoreSlice,
    type PersistOptions,
    type CreateSliceOptions
} from './StoreUitls'

// Import required types for utility functions
import type { 
  StoreSlice, 
  AppState, 
  AppStoreConfig, 
  SliceConfig, 
  BaseState, 
  SliceControllers 
} from './AppStore'

// Utility functions for better developer experience
export function defineSliceConfig<TState extends BaseState, TControllers = SliceControllers>(
  config: SliceConfig<TState, TControllers>
): SliceConfig<TState, TControllers> {
  return config
}

export function defineStoreConfig(config: AppStoreConfig): AppStoreConfig {
  return config
} 
