import {
  createAppStore,
  type SliceConfig
} from 'better-react-state'

import {
  createCounterSlice,
  type CounterState,
  type CounterControllers
} from './CounterStore'

import {
  createTaskListSlice,
  type TaskListState,
  type TaskListControllers
} from './TaskListStore'

// Define slice configurations with proper typing
const counterSliceConfig: SliceConfig<CounterState, CounterControllers> = {
  name: 'counter',
  create: createCounterSlice,
  options: {
    persist: { whitelist: ['count'] }
  }
}

const taskListSliceConfig: SliceConfig<TaskListState, TaskListControllers> = {
  name: 'taskList', 
  create: createTaskListSlice,
  options: {
    persist: { whitelist: ['tasks'] }
  }
}

const appSlices: SliceConfig<any, any>[] = [
  counterSliceConfig,
  taskListSliceConfig
]

const onSave = async (state: any) => {
  console.log('State saved:', state)
}

// Create the store configuration
const storeConfig = {
  name: 'better-react-state-example',
  slices: appSlices,
  onSave
}

// Create the store
const store = createAppStore(storeConfig)

// Define the properly typed interface for our specific app
export interface TypedAppStore {
  // Include all base properties from AppState
  initialized: boolean
  isInitializing: boolean
  error: string | null
  version: number
  initObject?: any
  setup: (initObject?: any) => Promise<void>
  
  // Typed slices with controller classes
  counter: {
    name: 'counter'
    state: CounterState
    controllers: CounterControllers
    getState: () => CounterState
    setState: (state: Partial<CounterState>) => void
    update: () => void
    setError: (error: any) => void
    reset: () => void
    setup: (initObject?: any) => Promise<void>
  }
  taskList: {
    name: 'taskList'
    state: TaskListState
    controllers: TaskListControllers
    getState: () => TaskListState
    setState: (state: Partial<TaskListState>) => void
    update: () => void
    setError: (error: any) => void
    reset: () => void
    setup: (initObject?: any) => Promise<void>
  }
}

// Export with clean type assertion
export const useAppStore = store as unknown as () => TypedAppStore

// Re-export types for components
export type { CounterState, CounterControllers }
export type { TaskListState, TaskListControllers }
