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
      taskController.addTask({
        id: Date.now().toString(),
        text: newTaskText,
        completed: false
      })
      setNewTaskText('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask()
    }
  }

  return (
    <div className="task-list-container">
      <h2>Task List Example</h2>
      <p>Demonstrates complex state with controllers and persistence</p>
      
      <div className="task-input">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a new task"
          disabled={isLoading}
        />
        <button onClick={handleAddTask} disabled={isLoading || !newTaskText.trim()}>
          Add Task
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
                />
                <span>{task.text}</span>
              </label>
              <button onClick={() => taskController.removeTask(task.id)}>
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export default TaskList
