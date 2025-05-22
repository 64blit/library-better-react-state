// @refresh reset
// ======= COMMON TYPES =======

import { ApiStatus } from '@controllers/sdk/types'

// Session type used across the application
export type Session = {
  accessToken?: string
  expires?: string | Date
  accounts?: string[]
  owned_accounts?: string[]
}

// For backward compatibility
export type ReportSession = Session

// ======= STORE SLICE ARCHITECTURE =======

// Base state interface for all slices
export interface BaseState {
  status: Record<string, string>
  error: any
  initialized: boolean
  version: number
}

// Each slice creates and manages its own controllers
export type SliceControllers = Record<string, any>

// Common slice interface with standard methods
export interface StoreSlice<T extends BaseState, C = SliceControllers> {
  name: string
  state: T
  controllers: C
  getState: () => T
  setState: (state: Partial<T>) => void
  update: () => void
  setError: (error: any) => void
  reset: () => void
  setup: (initObject?: any) => Promise<void>
  persist?: { blacklist?: (keyof T)[]; whitelist?: (keyof T)[] }
  dependencies?: string[]
}

// Middleware configuration for persistence
export interface PersistOptions {
  name: string
  partialize?: (state: any) => any
}

// ======= SLICE CREATORS =======

// Generic slice creator function
/**
 * Creates a store slice with state management and controller setup
 *
 * @template T - The state type that extends BaseState
 * @template C - The controllers type (defaults to SliceControllers) - the controllers manage logic for the slice
 *
 * @param {T} initialState - The initial state for the slice
 * @param {string} sliceName - The name of the slice in the store
 * @param {Function} setupControllers - Async function to initialize controllers which handle all logic for the slice
 *
 * @returns {Function} A function that creates a StoreSlice with the following properties:
 * - state: The current state of the slice
 * - controllers: The initialized controllers for the slice
 * - getState: Function to get the current state
 * - setState: Function to update the state
 * - update: Function to trigger a store update
 * - setError: Function to set error state
 * - reset: Function to reset the slice to initial state
 * - setup: Async function to initialize the slice with session data
 *
 * @example
 * const reportSlice = createStoreSlice(
 *   initialReportState,
 *   'report',
 *   async (update, getState, setState, session) => {
 *     // Initialize controllers here
 *     return controllers;
 *   }
 * );
 */

export interface CreateSliceOptions<T extends BaseState> {
  persist?: { blacklist?: (keyof T)[]; whitelist?: (keyof T)[] }
  dependencies?: string[]
}

export const createStoreSlice = <T extends BaseState, C = SliceControllers>(
  initialState: T,
  sliceName: string,
  setupControllers: (
    update: () => void,
    get: () => any,
    getState: () => T,
    setState: (state: Partial<T>) => void,
    initObject?: any
  ) => Promise<C>,
  options?: CreateSliceOptions<T>
) => {
  // returns a function that creates a StoreSlice
  return (
    set: (state: any) => void,
    get: () => any,
    api: any
  ): StoreSlice<T, C> => {
    const persist = options?.persist
    const dependencies = options?.dependencies
    // Slice update function
    const update = () => {
      set((state: any) => {
        return {
          version: state.version + 1,
        }
      })
    }

    // State getters and setters for this slice
    const getSliceState = (): T => {
      const state = get()
      // During initialization, state[sliceName] might not exist yet
      if (!state) {
        return initialState as T
      }

      if (!state[sliceName]?.state) {
        state[sliceName].state = initialState as T
      }

      return state[sliceName]?.state as T
    }

    const setSliceState = (newState: Partial<T>) => {
      set((state: any) => {
        const currentState = state[sliceName]
        const currentSliceState = getSliceState()
        const mergedState = { ...currentSliceState, ...newState }
        const updatedSlice = { ...currentState, state: mergedState }
        const nextVersion = state.version + 1
        return { ...state, [sliceName]: updatedSlice, version: nextVersion }
      })
    }

    // Slice controllers
    let controllers: C = {} as C

    // Setup the slice with initObject data and initialize controllers
    const setup = async (initObject?: any): Promise<void> => {
      if (!initObject) return Promise.resolve()

      controllers = await setupControllers(
        update,
        get,
        getSliceState,
        setSliceState,
        initObject
      )

      set((state: any) => {
        const newState = { ...state }
        newState[sliceName] = { ...newState[sliceName] }
        newState[sliceName].state = { ...newState[sliceName].state }
        newState[sliceName].initialized = true
        newState[sliceName].state.version = state.version + 1
        newState[sliceName].controllers = controllers
        return newState
      })

      return Promise.resolve()
    }

    const setError = (error: any) => {
      setSliceState({
        error,
        status: {
          ...getSliceState().status,
          error: 'true',
        },
      } as unknown as Partial<T>)
    }

    const reset = () => {
      setSliceState(initialState as unknown as Partial<T>)
    }

    const slice: StoreSlice<T, C> = {
      name: sliceName,
      state: initialState,
      controllers,
      update,
      getState: getSliceState,
      setState: setSliceState,
      setError,
      reset,
      setup,
      persist,
      dependencies,
    }

    return slice
  }
}
