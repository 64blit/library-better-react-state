import { 
  BaseState, 
  createStoreSlice
} from 'better-react-state'

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
  taskController: {
    addTask: (task: Task) => void
    removeTask: (id: string) => void
    toggleTask: (id: string) => void
    clearCompleted: () => void
    loadTasks: () => Promise<void>
  }
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
    const taskController = {
      addTask: (task: Task) => {
        const currentState = getState()
        
        setState({
          tasks: [...currentState.tasks, task]
        })
      },
      
      removeTask: (id: string) => {
        const currentState = getState()
        
        setState({
          tasks: currentState.tasks.filter(task => task.id !== id)
        })
      },
      
      toggleTask: (id: string) => {
        const currentState = getState()
        
        setState({
          tasks: currentState.tasks.map(task => 
            task.id === id 
              ? { ...task, completed: !task.completed } 
              : task
          )
        })
      },
      
      clearCompleted: () => {
        const currentState = getState()
        
        setState({
          tasks: currentState.tasks.filter(task => !task.completed)
        })
      },
      
      loadTasks: async () => {
        setState({ isLoading: true })
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const sampleTasks: Task[] = [
            { id: '1', text: 'Learn Zustand', completed: true },
            { id: '2', text: 'Implement store slices', completed: false },
            { id: '3', text: 'Create controllers', completed: false }
          ]
          
          setState({
            tasks: sampleTasks,
            isLoading: false
          })
        } catch (error) {
          setState({
            error,
            isLoading: false
          })
        }
      }
    }

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
