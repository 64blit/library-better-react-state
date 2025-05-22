import {
  createAppStore,
  SliceConfig,
  AppState
} from '../../../../dist/do-you-zunderstand.es.js'

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
    create: (set, get, api) => createCounterSlice(set, get, api),
    options: {
      persist: { whitelist: ['count'] }
    }
  },
  {
    name: 'taskList',
    create: (set, get, api) => createTaskListSlice(set, get, api),
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
