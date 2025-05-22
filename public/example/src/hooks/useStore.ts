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

export const useTaskList = (): TaskListHookType => {
  const store = useAppStore()

  useEffect(() => {
    if (!store.initialized) {
      store.setup().then(() => {
        store.taskList.controllers.taskController.loadTasks()
      })
    }
  }, [store])

  return {
    state: store.taskList.state,
    controllers: store.taskList.controllers,
    update: store.taskList.update,
    setState: store.taskList.setState
  }
}
