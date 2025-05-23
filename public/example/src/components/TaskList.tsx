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
      <p><small>Ctrl/Cmd+click on controller methods to navigate to their definitions!</small></p>
      
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
          title="Ctrl/Cmd+click to see addTaskWithText method"
        >
          Add Task
        </button>
      </div>
      
      <div className="task-actions">
        <button 
          onClick={() => taskController.markAllCompleted()}
          disabled={isLoading || tasks.length === 0}
          title="Ctrl/Cmd+click to navigate to markAllCompleted method"
        >
          Complete All
        </button>
        <button 
          onClick={() => taskController.markAllIncomplete()}
          disabled={isLoading || tasks.length === 0}
          title="Ctrl/Cmd+click to navigate to markAllIncomplete method"
        >
          Uncomplete All
        </button>
        <button 
          onClick={() => taskController.clearCompleted()}
          disabled={isLoading || completedCount === 0}
          title="Ctrl/Cmd+click to navigate to clearCompleted method"
        >
          Clear Completed
        </button>
        <button 
          onClick={() => taskController.clearAllTasks()}
          disabled={isLoading || tasks.length === 0}
          title="Ctrl/Cmd+click to navigate to clearAllTasks method"
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
                  title="Ctrl/Cmd+click to navigate to toggleTask method"
                />
                <span>{task.text}</span>
              </label>
              <button 
                onClick={() => taskController.removeTask(task.id)}
                title="Ctrl/Cmd+click to navigate to removeTask method"
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
