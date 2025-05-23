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

export const useAppStore = createAppStore({
  name: 'better-react-state-example',
  slices: appSlices,
  onSave
})

export type { CounterState, CounterControllers }
export type { TaskListState, TaskListControllers }
