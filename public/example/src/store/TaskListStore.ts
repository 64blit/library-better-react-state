import { 
  BaseState, 
  createStoreSlice
} from 'better-react-state'

import { TaskListController } from './TaskListController'

export interface Task {
  id: string
  text: string
  completed: boolean
}

export interface TaskListState extends BaseState {
  tasks: Task[]
  isLoading: boolean
}

export interface TaskListControllers {
  taskController: TaskListController
}

export const initialTaskListState: TaskListState = {
  tasks: [],
  isLoading: false,
  status: {},
  error: null,
  initialized: false,
  version: 0
}

export const createTaskListSlice = createStoreSlice<
  TaskListState,
  TaskListControllers
>(
  initialTaskListState,
  'taskList',
  async (_update, _get, getState, setState) => {
    // Create the controller instance with proper dependency injection
    const taskController = new TaskListController(getState, setState)

    return {
      taskController
    }
  },
  {
    persist: {
      whitelist: ['tasks']
    }
  }
)
