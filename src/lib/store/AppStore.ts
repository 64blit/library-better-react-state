// @refresh reset

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  StoreSlice,
  BaseState,
  SliceControllers,
  CreateSliceOptions,
} from './StoreUitls'

// Re-export core types from StoreUitls for easier access
export type { BaseState, SliceControllers, CreateSliceOptions, StoreSlice }

// // Session type used across the application
// export type Session = {
//   accessToken?: string
//   expires?: string | Date
//   accounts?: string[]
//   owned_accounts?: string[]
// }

// export type ReportSession = Session // Keep for backward compatibility if needed

// Configuration for the App Store
export interface AppStoreConfig {
  name: string // Name for persistence
  slices: SliceConfig<any, any>[] // Array of slice configurations
  onSave?: (state: any) => Promise<void> // Optional callback for server-side saving
}

// Interface for slice configuration passed to createAppStore
export interface SliceConfig<T extends BaseState, C = SliceControllers> {
  name: string
  create: (
    set: any,
    get: any,
    api: any,
    options?: CreateSliceOptions<T>
  ) => StoreSlice<T, C>
  options?: CreateSliceOptions<T>
}

// ======= APP STORE ARCHITECTURE =======

// Root app state combines all slice states
export interface AppRootState {
  initObject?: any
  initialized: boolean
  version: number
  isInitializing: boolean
  error: string | null // Added error to root state for global errors
}

// App state will dynamically include slice states
// Using intersection type to combine AppRootState, dynamic slices, and the setup function
export type AppState = AppRootState & {
  [key: string]: StoreSlice<any, any> // Dynamically added slices
} & {
  setup: (initObject?: any) => Promise<void>
}

// Initial app state
const initialAppState: AppRootState = {
  initObject: null,
  initialized: false,
  version: 0,
  isInitializing: false,
  error: null,
}

// ======= ROOT STORE =======

// Create the root store that combines all slices
export const createAppStore = (config: AppStoreConfig) => {
  const { name, slices, onSave } = config

  // Create the Zustand store
  const useStore = create<AppState>()(
    devtools(
      persist(
        (set, get, api) => {
          // Dynamically create and register slices
          const sliceMap: { [key: string]: StoreSlice<any, any> } = {}
          slices.forEach((sliceConfig) => {
            const slice = sliceConfig.create(set, get, api)
            sliceMap[slice.name] = slice

            if (
              sliceConfig.options.persist.blacklist &&
              sliceConfig.options.persist.whitelist
            ) {
              console.error(
                '--ZustandSlices-- Cannot have both blacklist and whitelist in slice options'
              )
            }
          })

          // Placeholder for dependency-based initialization
          const setup = async (initObject?: any) => {
            const state = get()
            if (state.initialized || state.isInitializing) return

            set((state) => ({
              ...state,
              isInitializing: true,
              initObject,
              version: state.version + 1,
            }))

            try {
              // TODO: Implement dependency-based initialization order
              // This would involve building a dependency graph from sliceConfig.options.dependencies
              // and initializing slices in topological order.
              for (const sliceConfig of slices) {
                const slice = sliceMap[sliceConfig.name]
                if (slice && slice.setup) {
                  // Pass the entire store's get function to allow slices to access other slices
                  await slice.setup(initObject)
                }
              }

              set({
                initialized: true,
                isInitializing: false,
                error: null, // Clear any previous initialization errors on success
              })
            } catch (error: any) {
              console.error('Failed to initialize store slices:', error)
              set({
                isInitializing: false,
                initialized: false,
                error: `Initialization failed: ${error.message || 'Unknown error'}`,
              })
            }
          }

          // Subscribe to state changes to trigger server-side save
          if (onSave) {
            // Use a simple subscription for now, debouncing/throttling can be added later
            api.subscribe((state: AppState) => {
              // Avoid saving during initialization or if there's a global error
              if (!state.isInitializing && state.initialized && !state.error) {
                // TODO: Implement debouncing or throttling for onSave
                onSave(state).catch((error) => {
                  console.error('Failed to save state to server:', error)
                })
              }
            })
          }

          // here we take the slices and put them in their own objects, using their slice.name as the key
          // so that we can access them like this: store.report.getState()
          const sliceStore = Object.fromEntries(
            Object.entries(sliceMap).map(([key, slice]) => [key, slice])
          )
          const returnStore = {
            ...initialAppState,
            ...sliceStore,
            setup,
          }

          return returnStore
        },
        {
          name: name,
          // Implement selective partialize based on slice options
          partialize: (state: any) => {
            const persistedState: any = {}
            slices.forEach((sliceConfig) => {
              const slice = state[sliceConfig.name]
              if (slice && sliceConfig.options?.persist) {
                const sliceStateToPersist: any = {}
                const stateKeys = Object.keys(slice.state)
                if (sliceConfig.options.persist.whitelist) {
                  sliceConfig.options.persist.whitelist.forEach((key) => {
                    if (stateKeys.includes(key as string)) {
                      sliceStateToPersist[key] = slice.state[key]
                    }
                  })
                } else if (sliceConfig.options.persist.blacklist) {
                  stateKeys.forEach((key) => {
                    if (
                      !sliceConfig.options.persist.blacklist.includes(
                        key as any
                      )
                    ) {
                      sliceStateToPersist[key] = slice.state[key]
                    }
                  })
                } else {
                  // If no blacklist or whitelist, persist the entire slice state
                  Object.assign(sliceStateToPersist, slice.state)
                }
                persistedState[sliceConfig.name] = {
                  state: sliceStateToPersist,
                }
              }
            })
            // Persist root state properties explicitly if needed, or handle via a dedicated root slice
            // For now, only persist session and version if they are part of AppRootState and intended for persistence
            // Note: Persisting version might not be desired for external reuse
            if (state.session !== undefined)
              persistedState.session = state.session
            // if (state.version !== undefined) persistedState.version = state.version; // Decide if version should be persisted

            return persistedState
          },
          // Implement selective merge based on slice options
          merge: (persisted: any, current: any) => {
            const mergedState = { ...current }
            slices.forEach((sliceConfig) => {
              const sliceName = sliceConfig.name
              if (
                persisted[sliceName]?.state &&
                mergedState[sliceName]?.state
              ) {
                // Merge persisted slice state into current slice state
                mergedState[sliceName].state = {
                  ...current[sliceName].state,
                  ...persisted[sliceName].state,
                }
              }
            })
            // Merge root state properties
            if (persisted.session !== undefined)
              mergedState.session = persisted.session
            // if (persisted.version !== undefined) mergedState.version = persisted.version; // Decide if version should be merged

            // Don't merge initialized/isInitializing as they are managed by the setup process
            return mergedState
          },
        }
      ),
      {
        name: name,
        enabled: true,
      }
    )
  )

  return useStore
}

// Remove the direct creation of the app store instance here
// The app will create the store instance by calling createAppStore with its specific slices and config.
