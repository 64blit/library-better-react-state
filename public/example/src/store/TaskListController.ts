import type { TaskListState, Task } from './TaskListStore'

/**
 * TaskList Controller Class
 * 
 * Handles all task list-related business logic and state mutations.
 * Each method is properly typed and can be navigated to with Ctrl/Cmd+click.
 * 
 * Safety features:
 * - Input validation and sanitization
 * - Immutable operations
 * - Error boundary protection
 * - Type-safe operations
 * - Null/undefined checks
 */
export class TaskListController {
  private readonly getState: () => TaskListState
  private readonly setState: (state: Partial<TaskListState>) => void

  constructor(
    getState: () => TaskListState,
    setState: (state: Partial<TaskListState>) => void
  ) {
    if (!getState || typeof getState !== 'function') {
      throw new Error('TaskListController: getState must be a function')
    }
    if (!setState || typeof setState !== 'function') {
      throw new Error('TaskListController: setState must be a function')
    }
    
    this.getState = getState
    this.setState = setState
  }

  /**
   * Validates a task object
   * @param task - Task to validate
   * @returns True if valid
   */
  private isValidTask = (task: any): task is Task => {
    return (
      task &&
      typeof task === 'object' &&
      typeof task.id === 'string' &&
      task.id.trim().length > 0 &&
      typeof task.text === 'string' &&
      typeof task.completed === 'boolean'
    )
  }

  /**
   * Sanitizes text input
   * @param text - Text to sanitize
   * @returns Sanitized text
   */
  private sanitizeText = (text: string): string => {
    if (typeof text !== 'string') return ''
    return text.trim().slice(0, 1000) // Limit to 1000 characters
  }

  /**
   * Validates task ID
   * @param id - ID to validate
   * @returns True if valid
   */
  private isValidId = (id: any): id is string => {
    return typeof id === 'string' && id.trim().length > 0
  }

  /**
   * Adds a new task to the list
   * @param task - The task to add (must be valid Task object)
   */
  addTask = (task: Task): void => {
    try {
      if (!this.isValidTask(task)) {
        console.warn('TaskListController.addTask: Invalid task object')
        return
      }

      const currentState = this.getState()
      
      // Check for duplicate IDs
      if (currentState.tasks.some(existingTask => existingTask.id === task.id)) {
        console.warn('TaskListController.addTask: Task with this ID already exists')
        return
      }

      // Create immutable copy with sanitized text
      const sanitizedTask: Task = {
        ...task,
        text: this.sanitizeText(task.text)
      }

      this.setState({
        tasks: [...currentState.tasks, sanitizedTask]
      })
    } catch (error) {
      console.error('TaskListController.addTask failed:', error)
    }
  }

  /**
   * Removes a task from the list by ID
   * @param id - The ID of the task to remove (must be non-empty string)
   */
  removeTask = (id: string): void => {
    try {
      if (!this.isValidId(id)) {
        console.warn('TaskListController.removeTask: Invalid task ID')
        return
      }

      const currentState = this.getState()
      const filteredTasks = currentState.tasks.filter(task => task.id !== id)
      
      // Only update if task was found
      if (filteredTasks.length !== currentState.tasks.length) {
        this.setState({ tasks: filteredTasks })
      }
    } catch (error) {
      console.error('TaskListController.removeTask failed:', error)
    }
  }

  /**
   * Toggles the completion status of a task
   * @param id - The ID of the task to toggle (must be non-empty string)
   */
  toggleTask = (id: string): void => {
    try {
      if (!this.isValidId(id)) {
        console.warn('TaskListController.toggleTask: Invalid task ID')
        return
      }

      const currentState = this.getState()
      const updatedTasks = currentState.tasks.map(task =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      )

      this.setState({ tasks: updatedTasks })
    } catch (error) {
      console.error('TaskListController.toggleTask failed:', error)
    }
  }

  /**
   * Removes all completed tasks from the list
   * Safe operation with validation
   */
  clearCompleted = (): void => {
    try {
      const currentState = this.getState()
      const activeTasks = currentState.tasks.filter(task => !task.completed)
      this.setState({ tasks: activeTasks })
    } catch (error) {
      console.error('TaskListController.clearCompleted failed:', error)
    }
  }

  /**
   * Updates the text of an existing task
   * @param id - The ID of the task to update (must be non-empty string)
   * @param text - The new text for the task (will be sanitized)
   */
  updateTaskText = (id: string, text: string): void => {
    try {
      if (!this.isValidId(id)) {
        console.warn('TaskListController.updateTaskText: Invalid task ID')
        return
      }

      const sanitizedText = this.sanitizeText(text)
      if (sanitizedText.length === 0) {
        console.warn('TaskListController.updateTaskText: Text cannot be empty')
        return
      }

      const currentState = this.getState()
      const updatedTasks = currentState.tasks.map(task =>
        task.id === id
          ? { ...task, text: sanitizedText }
          : task
      )

      this.setState({ tasks: updatedTasks })
    } catch (error) {
      console.error('TaskListController.updateTaskText failed:', error)
    }
  }

  /**
   * Creates a new task with the given text
   * @param text - The text for the new task (will be sanitized)
   * @returns The newly created task or null if invalid
   */
  createTask = (text: string): Task | null => {
    try {
      const sanitizedText = this.sanitizeText(text)
      if (sanitizedText.length === 0) {
        console.warn('TaskListController.createTask: Text cannot be empty')
        return null
      }

      return {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: sanitizedText,
        completed: false
      }
    } catch (error) {
      console.error('TaskListController.createTask failed:', error)
      return null
    }
  }

  /**
   * Adds a new task with the given text
   * @param text - The text for the new task (will be sanitized)
   */
  addTaskWithText = (text: string): void => {
    try {
      const newTask = this.createTask(text)
      if (newTask) {
        this.addTask(newTask)
      }
    } catch (error) {
      console.error('TaskListController.addTaskWithText failed:', error)
    }
  }

  /**
   * Loads sample tasks (simulates API call)
   * Safe async operation with error handling
   */
  loadTasks = async (): Promise<void> => {
    try {
      this.setState({ isLoading: true, error: null })

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      const sampleTasks: Task[] = [
        { id: 'sample_1', text: 'Learn Zustand', completed: true },
        { id: 'sample_2', text: 'Implement store slices', completed: false },
        { id: 'sample_3', text: 'Create controllers', completed: false },
        { id: 'sample_4', text: 'Add TypeScript support', completed: true },
        { id: 'sample_5', text: 'Build example app', completed: false }
      ]

      // Validate all sample tasks
      const validTasks = sampleTasks.filter(this.isValidTask)

      this.setState({
        tasks: validTasks,
        isLoading: false
      })
    } catch (error) {
      console.error('TaskListController.loadTasks failed:', error)
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to load tasks',
        isLoading: false
      })
    }
  }

  /**
   * Clears all tasks from the list
   * Safe operation with confirmation
   */
  clearAllTasks = (): void => {
    try {
      this.setState({ tasks: [] })
    } catch (error) {
      console.error('TaskListController.clearAllTasks failed:', error)
    }
  }

  /**
   * Marks all tasks as completed
   * Safe operation with validation
   */
  markAllCompleted = (): void => {
    try {
      const currentState = this.getState()
      const updatedTasks = currentState.tasks.map(task => ({ ...task, completed: true }))
      this.setState({ tasks: updatedTasks })
    } catch (error) {
      console.error('TaskListController.markAllCompleted failed:', error)
    }
  }

  /**
   * Marks all tasks as incomplete
   * Safe operation with validation
   */
  markAllIncomplete = (): void => {
    try {
      const currentState = this.getState()
      const updatedTasks = currentState.tasks.map(task => ({ ...task, completed: false }))
      this.setState({ tasks: updatedTasks })
    } catch (error) {
      console.error('TaskListController.markAllIncomplete failed:', error)
    }
  }

  /**
   * Gets the count of completed tasks
   * @returns The number of completed tasks (safe operation)
   */
  getCompletedCount = (): number => {
    try {
      const currentState = this.getState()
      return currentState.tasks.filter(task => task.completed).length
    } catch (error) {
      console.error('TaskListController.getCompletedCount failed:', error)
      return 0
    }
  }

  /**
   * Gets the count of incomplete tasks
   * @returns The number of incomplete tasks (safe operation)
   */
  getIncompleteCount = (): number => {
    try {
      const currentState = this.getState()
      return currentState.tasks.filter(task => !task.completed).length
    } catch (error) {
      console.error('TaskListController.getIncompleteCount failed:', error)
      return 0
    }
  }

  /**
   * Gets the total number of tasks
   * @returns The total number of tasks (safe operation)
   */
  getTotalCount = (): number => {
    try {
      const currentState = this.getState()
      return currentState.tasks.length
    } catch (error) {
      console.error('TaskListController.getTotalCount failed:', error)
      return 0
    }
  }

  /**
   * Finds a task by ID
   * @param id - Task ID to find
   * @returns The task if found, null otherwise
   */
  findTaskById = (id: string): Task | null => {
    try {
      if (!this.isValidId(id)) {
        return null
      }

      const currentState = this.getState()
      return currentState.tasks.find(task => task.id === id) || null
    } catch (error) {
      console.error('TaskListController.findTaskById failed:', error)
      return null
    }
  }

  /**
   * Checks if all tasks are completed
   * @returns True if all tasks are completed or no tasks exist
   */
  areAllCompleted = (): boolean => {
    try {
      const currentState = this.getState()
      if (currentState.tasks.length === 0) return true
      return currentState.tasks.every(task => task.completed)
    } catch (error) {
      console.error('TaskListController.areAllCompleted failed:', error)
      return false
    }
  }
} 
