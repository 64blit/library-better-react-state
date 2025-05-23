import { useAppStore } from '../store/AppStore'
import type { CounterState, CounterControllers } from '../store/AppStore'
import type { TaskListState, TaskListControllers } from '../store/AppStore'
import { useEffect } from 'react'

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
 */
export const useCounter = (): CounterHookType => {
  const store = useAppStore()

  useEffect(() => {
    if (!store.initialized) {
      store.setup()
    }
  }, [store])

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
 */
export const useTaskList = (): TaskListHookType => {
  const store = useAppStore()

  useEffect(() => {
    if (!store.initialized) {
      store.setup().then(() => {
        console.log('🍭Store setup completed!')
        console.log('🍭Counter controllers:', store.counter.controllers)
        console.log('🍭TaskList controllers:', store.taskList.controllers)
        
        // Now we can call controllers safely with full type safety
        // Ctrl/Cmd+click on loadTasks to navigate to the method definition!
        store.taskList.controllers.taskController.loadTasks()
      })
    }
  }, [store.initialized])

  return {
    state: store.taskList.state,
    controllers: store.taskList.controllers,
    update: store.taskList.update,
    setState: store.taskList.setState
  }
}
