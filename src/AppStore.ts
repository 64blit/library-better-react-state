// @refresh reset

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import {
  type StoreSlice,
  type BaseState,
  type SliceControllers,
  type CreateSliceOptions,
  createStoreSlice
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

// Simplified SliceConfig interface - users can specify exact state and controller types
export interface SliceConfig<TState extends BaseState = BaseState, TControllers = SliceControllers> {
  name: string
  create: (
    set: any,
    get: any,
    api: any,
    options?: CreateSliceOptions<TState>
  ) => StoreSlice<TState, TControllers>
  options?: CreateSliceOptions<TState>
}

// Configuration for the App Store - simplified approach
export interface AppStoreConfig {
  name: string // Name for persistence
  slices: SliceConfig<any, any>[] // Array of slice configurations
  onSave?: (state: any) => Promise<void> // Optional callback for server-side saving
}

// ======= APP STORE ARCHITECTURE =======

// Root app state combines all slice states
export interface AppRootState {
  initObject?: any
  initialized: boolean
  version: number
  isInitializing: boolean
  error: string | null
}

// App state combines root state with dynamically added slices
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

// Create the root store - simplified approach
function createAppStore(config: AppStoreConfig): () => AppState {
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
          })

          // Setup function with proper error handling
          const setup = async (initObject?: any) => {
            const state = get()
            if (state.initialized || state.isInitializing) return

            set((state: AppState) => ({
              ...state,
              isInitializing: true,
              initObject,
              version: state.version + 1,
            } as AppState))

            try {
              // Initialize slices in order
              for (const sliceConfig of slices) {
                const slice = sliceMap[sliceConfig.name]
                if (slice && slice.setup) {
                  await slice.setup(initObject)
                }
              }

              set({
                initialized: true,
                isInitializing: false,
                error: null,
              } as Partial<AppState>)
            } catch (error: any) {
              console.error('Failed to initialize store slices:', error)
              set({
                isInitializing: false,
                initialized: false,
                error: `Initialization failed: ${error.message || 'Unknown error'}`,
              } as Partial<AppState>)
            }
          }

          // Subscribe to state changes for server-side save
          if (onSave) {
            api.subscribe((state: AppState) => {
              if (!state.isInitializing && state.initialized && !state.error) {
                onSave(state).catch((error) => {
                  console.error('Failed to save state to server:', error)
                })
              }
            })
          }

          // Create the store with proper slice integration
          const returnStore = {
            ...initialAppState,
            ...sliceMap,
            setup,
          } as AppState

          return returnStore
        },
        {
          name: name,
          // Implement selective partialize based on slice options
          partialize: (state: AppState) => {
            const persistedState: any = {}
            slices.forEach((sliceConfig) => {
              const slice = (state as any)[sliceConfig.name]
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
                      !sliceConfig?.options?.persist?.blacklist?.includes(
                        key as any
                      )
                    ) {
                      sliceStateToPersist[key] = slice.state[key]
                    }
                  })
                } else {
                  Object.assign(sliceStateToPersist, slice.state)
                }
                persistedState[sliceConfig.name] = {
                  state: sliceStateToPersist,
                }
              }
            })

            return persistedState
          },
          // Implement selective merge based on slice options
          merge: (persisted: any, current: AppState) => {
            const mergedState = { ...current }
            slices.forEach((sliceConfig) => {
              const sliceName = sliceConfig.name
              if (
                persisted[sliceName]?.state &&
                (mergedState as any)[sliceName]?.state
              ) {
                ;(mergedState as any)[sliceName].state = {
                  ...(current as any)[sliceName].state,
                  ...persisted[sliceName].state,
                }
              }
            })

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

  return useStore as () => AppState
}

export {
  createAppStore,
  createStoreSlice
}
