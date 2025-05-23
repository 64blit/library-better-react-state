import { useState } from 'react'
import { TaskListState, TaskListControllers } from '../store/TaskListStore'
import './TaskList.css'

interface TaskListProps {
  state: TaskListState
  controllers: TaskListControllers
  update: () => void
  setState: (state: Partial<TaskListState>) => void
}

function TaskList({ state, controllers }: TaskListProps) {
  const { tasks, isLoading } = state
  const { taskController } = controllers
  const [newTaskText, setNewTaskText] = useState('')

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      taskController.addTaskWithText(newTaskText)
      setNewTaskText('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask()
    }
  }

  const completedCount = taskController.getCompletedCount()
  const incompleteCount = taskController.getIncompleteCount()

  return (
    <div className="task-list-container">
      <h2>Task List Example</h2>
      <p>Demonstrates complex state with typed controller classes and persistence</p>
      
      <div className="task-stats">
        <span>Total: {tasks.length}</span>
        <span>Completed: {completedCount}</span>
        <span>Remaining: {incompleteCount}</span>
      </div>
      
      <div className="task-input">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a new task"
          disabled={isLoading}
        />
        <button 
          onClick={handleAddTask} 
          disabled={isLoading || !newTaskText.trim()}
          title="addTaskWithText"
        >
          Add Task
        </button>
      </div>
      
      <div className="task-actions">
        <button 
          onClick={() => taskController.markAllCompleted()}
          disabled={isLoading || tasks.length === 0}
          title="markAllCompleted"
        >
          Complete All
        </button>
        <button 
          onClick={() => taskController.markAllIncomplete()}
          disabled={isLoading || tasks.length === 0}
          title="markAllIncomplete"
        >
          Uncomplete All
        </button>
        <button 
          onClick={() => taskController.clearCompleted()}
          disabled={isLoading || completedCount === 0}
          title="clearCompleted"
        >
          Clear Completed
        </button>
        <button 
          onClick={() => taskController.clearAllTasks()}
          disabled={isLoading || tasks.length === 0}
          title="clearAllTasks"
        >
          Clear All
        </button>
      </div>
      
      <ul className="task-items">
        {tasks.length === 0 ? (
          <li className="empty-state">No tasks yet. Add one above!</li>
        ) : (
          tasks.map(task => (
            <li key={task.id} className={task.completed ? 'completed' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => taskController.toggleTask(task.id)}
                  title="toggleTask"
                />
                <span>{task.text}</span>
              </label>
              <button 
                onClick={() => taskController.removeTask(task.id)}
                title="removeTask"
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
      
      {isLoading && (
        <div className="loading-indicator">Loading tasks...</div>
      )}
    </div>
  )
}

export default TaskList
