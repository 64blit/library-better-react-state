import { useAppStore } from '../store/AppStore'
import type { CounterState, CounterControllers } from '../store/AppStore'
import type { TaskListState, TaskListControllers } from '../store/AppStore'

type CounterHookType = {
  state: CounterState
  controllers: CounterControllers
  update: () => void
  setState: (state: Partial<CounterState>) => void
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
  const store = useAppStore()

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
  const store = useAppStore()

  return {
    state: store.taskList.state,
    controllers: store.taskList.controllers,
    update: store.taskList.update,
    setState: store.taskList.setState
  }
}

/**
 * Hook for accessing the main app store
 * 
 * Provides direct access to the store for advanced use cases
 * Note: Store initialization is handled at the App level
 */
export const useStore = () => {
  return useAppStore()
}
