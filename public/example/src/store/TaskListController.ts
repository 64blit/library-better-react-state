import type { TaskListState, Task } from './TaskListStore'

/**
 * TaskList Controller Class
 * 
 * Handles all task list-related business logic and state mutations.
 * Each method is properly typed and can be navigated to with Ctrl/Cmd+click.
 */
export class TaskListController {
  private getState: () => TaskListState
  private setState: (state: Partial<TaskListState>) => void

  constructor(
    getState: () => TaskListState,
    setState: (state: Partial<TaskListState>) => void
  ) {
    this.getState = getState
    this.setState = setState
  }

  /**
   * Adds a new task to the list
   * @param task - The task to add
   */
  addTask = (task: Task): void => {
    const currentState = this.getState()
    this.setState({
      tasks: [...currentState.tasks, task]
    })
  }

  /**
   * Removes a task from the list by ID
   * @param id - The ID of the task to remove
   */
  removeTask = (id: string): void => {
    const currentState = this.getState()
    this.setState({
      tasks: currentState.tasks.filter(task => task.id !== id)
    })
  }

  /**
   * Toggles the completion status of a task
   * @param id - The ID of the task to toggle
   */
  toggleTask = (id: string): void => {
    const currentState = this.getState()
    this.setState({
      tasks: currentState.tasks.map(task =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      )
    })
  }

  /**
   * Removes all completed tasks from the list
   */
  clearCompleted = (): void => {
    const currentState = this.getState()
    this.setState({
      tasks: currentState.tasks.filter(task => !task.completed)
    })
  }

  /**
   * Updates the text of an existing task
   * @param id - The ID of the task to update
   * @param text - The new text for the task
   */
  updateTaskText = (id: string, text: string): void => {
    const currentState = this.getState()
    this.setState({
      tasks: currentState.tasks.map(task =>
        task.id === id
          ? { ...task, text }
          : task
      )
    })
  }

  /**
   * Creates a new task with the given text
   * @param text - The text for the new task
   * @returns The newly created task
   */
  createTask = (text: string): Task => {
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      completed: false
    }
  }

  /**
   * Adds a new task with the given text
   * @param text - The text for the new task
   */
  addTaskWithText = (text: string): void => {
    const newTask = this.createTask(text)
    this.addTask(newTask)
  }

  /**
   * Loads sample tasks (simulates API call)
   */
  loadTasks = async (): Promise<void> => {
    this.setState({ isLoading: true })

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      const sampleTasks: Task[] = [
        { id: '1', text: 'Learn Zustand', completed: true },
        { id: '2', text: 'Implement store slices', completed: false },
        { id: '3', text: 'Create controllers', completed: false },
        { id: '4', text: 'Add TypeScript support', completed: true },
        { id: '5', text: 'Build example app', completed: false }
      ]

      this.setState({
        tasks: sampleTasks,
        isLoading: false
      })
    } catch (error) {
      this.setState({
        error,
        isLoading: false
      })
    }
  }

  /**
   * Clears all tasks from the list
   */
  clearAllTasks = (): void => {
    this.setState({
      tasks: []
    })
  }

  /**
   * Marks all tasks as completed
   */
  markAllCompleted = (): void => {
    const currentState = this.getState()
    this.setState({
      tasks: currentState.tasks.map(task => ({ ...task, completed: true }))
    })
  }

  /**
   * Marks all tasks as incomplete
   */
  markAllIncomplete = (): void => {
    const currentState = this.getState()
    this.setState({
      tasks: currentState.tasks.map(task => ({ ...task, completed: false }))
    })
  }

  /**
   * Gets the count of completed tasks
   * @returns The number of completed tasks
   */
  getCompletedCount = (): number => {
    const currentState = this.getState()
    return currentState.tasks.filter(task => task.completed).length
  }

  /**
   * Gets the count of incomplete tasks
   * @returns The number of incomplete tasks
   */
  getIncompleteCount = (): number => {
    const currentState = this.getState()
    return currentState.tasks.filter(task => !task.completed).length
  }
} 
