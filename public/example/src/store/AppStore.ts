import {
  createAppStore,
  SliceConfig,
  AppState
} from 'do-you-zunderustand'

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
    create: (set:any, get:any, api:any) => createCounterSlice(set, get, api),
    options: {
      persist: { whitelist: ['count'] }
    }
  },
  {
    name: 'taskList',
    create: (set:any, get:any, api:any) => createTaskListSlice(set, get, api),
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
