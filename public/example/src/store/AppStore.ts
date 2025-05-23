import {
  createAppStore,
  SliceConfig,
  AppState
} from 'better-react-state'

import {
  createCounterSlice,
  CounterState,
  CounterControllers
} from './CounterStore'

import {
  createTaskListSlice,
  TaskListState,
  TaskListControllers
} from './TaskListStore'

import type { TypedAppStore } from './types'

const appSlices: SliceConfig<any, any>[] = [
  {
    name: 'counter',
    create: createCounterSlice,
    options: {
      persist: { whitelist: ['count'] }
    }
  },
  {
    name: 'taskList',
    create: createTaskListSlice,
    options: {
      persist: { whitelist: ['tasks'] }
    }
  }
]

const onSave = async (state: AppState) => {
  console.log('State saved:', state)
}

// Create the store with proper typing
const store = createAppStore({
  name: 'better-react-state-example',
  slices: appSlices,
  onSave
})

// Export with type casting for better IntelliSense
export const useAppStore = store as unknown as () => TypedAppStore

export type { CounterState, CounterControllers }
export type { TaskListState, TaskListControllers }
