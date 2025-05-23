import type { StoreSlice } from 'better-react-state'
import type { CounterState, CounterControllers } from './CounterStore'
import type { TaskListState, TaskListControllers } from './TaskListStore'

// Re-export controller classes for easier access
export { CounterController } from './CounterController'
export { TaskListController } from './TaskListController'

// Properly typed store interface for our specific app
export interface TypedAppStore {
  // Base store properties
  initialized: boolean
  version: number
  isInitializing: boolean
  error: string | null
  setup: (initObject?: any) => Promise<void>
  
  // Typed slices with controller classes
  counter: StoreSlice<CounterState, CounterControllers>
  taskList: StoreSlice<TaskListState, TaskListControllers>
}

// Type-safe selector hook type
export type StoreSelector<T> = (state: TypedAppStore) => T

// Type-safe store hook return type
export type TypedStoreHook = () => TypedAppStore 
