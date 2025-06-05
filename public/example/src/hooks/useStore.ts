import { AppState, StoreSlice } from '../../../../better-react-state-library'
import { useAppStore } from '../store/AppStore'
import type { CounterState, CounterControllers, TypedAppStore } from '../store/AppStore'
import type { TaskListState, TaskListControllers } from '../store/AppStore'

type CounterHookType = {
  state: CounterState
  controllers: CounterControllers
  update: () => void
  setState: (state: Partial<CounterState>) => void
}

export const useStore = (): TypedAppStore => {
  const store = useAppStore()

  if(!store.initialized){
    store.setup()
  }

  return store
}

/**
 * Hook for accessing counter state and controllers
 * 
 * All controller methods are fully typed and can be navigated to with Ctrl/Cmd+click
 * Example: controllers.counterController.increment() <- Click to navigate!
 * 
 * Note: Store initialization is handled at the App level
 */
export const useCounter = (): CounterHookType => {
  const store = useStore()

  return {
    state: store.counter.state,
    controllers: store.counter.controllers,
    update: store.counter.update,
    setState: store.counter.setState
  }
}

type TaskListHookType = {
  state: TaskListState
  controllers: TaskListControllers
  update: () => void
  setState: (state: Partial<TaskListState>) => void
}

/**
 * Hook for accessing task list state and controllers
 * 
 * All controller methods are fully typed and can be navigated to with Ctrl/Cmd+click
 * Example: controllers.taskController.addTask() <- Click to navigate!
 * 
 * Note: Store initialization is handled at the App level
 */
export const useTaskList = (): TaskListHookType => {
  const store = useStore()

  return {
    state: store.taskList.state,
    controllers: store.taskList.controllers,
    update: store.taskList.update,
    setState: store.taskList.setState
  }
}
