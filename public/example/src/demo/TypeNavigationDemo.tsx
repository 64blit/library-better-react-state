import { useCounter, useTaskList } from '../hooks/useStore'

/**
 * TypeScript Navigation Demo
 * 
 * This file demonstrates the improved developer experience with controller classes.
 * 
 * INSTRUCTIONS FOR DEVELOPERS:
 * 1. Ctrl/Cmd+click on any controller method call to navigate to its definition
 * 2. Hover over methods to see full type information
 * 3. Use auto-complete to discover available methods
 */
export function TypeNavigationDemo() {
  const { controllers: counterControllers } = useCounter()
  const { controllers: taskControllers } = useTaskList()

  // ====== COUNTER CONTROLLER METHODS ======
  // Ctrl/Cmd+click on any of these to navigate to the method definition:
  const handleCounterDemo = () => {
    counterControllers.counterController.increment()        // <- Navigate to increment method
    counterControllers.counterController.decrement()       // <- Navigate to decrement method  
    counterControllers.counterController.reset()           // <- Navigate to reset method
    counterControllers.counterController.setCount(42)      // <- Navigate to setCount method
    counterControllers.counterController.incrementBy(10)   // <- Navigate to incrementBy method
    counterControllers.counterController.decrementBy(5)    // <- Navigate to decrementBy method
  }

  // ====== TASK CONTROLLER METHODS ======
  // Ctrl/Cmd+click on any of these to navigate to the method definition:
  const handleTaskDemo = () => {
    // Basic task operations
    taskControllers.taskController.addTaskWithText('New task')  // <- Navigate to addTaskWithText
    taskControllers.taskController.removeTask('task-id')       // <- Navigate to removeTask
    taskControllers.taskController.toggleTask('task-id')       // <- Navigate to toggleTask
    taskControllers.taskController.updateTaskText('id', 'new') // <- Navigate to updateTaskText

    // Bulk operations
    taskControllers.taskController.clearCompleted()            // <- Navigate to clearCompleted
    taskControllers.taskController.clearAllTasks()             // <- Navigate to clearAllTasks
    taskControllers.taskController.markAllCompleted()          // <- Navigate to markAllCompleted
    taskControllers.taskController.markAllIncomplete()         // <- Navigate to markAllIncomplete

    // Utility methods
    const completed = taskControllers.taskController.getCompletedCount()    // <- Navigate to getCompletedCount
    const incomplete = taskControllers.taskController.getIncompleteCount()  // <- Navigate to getIncompleteCount
    const newTask = taskControllers.taskController.createTask('text')       // <- Navigate to createTask

    // Async operations
    taskControllers.taskController.loadTasks()                 // <- Navigate to loadTasks (async)

    console.log({ completed, incomplete, newTask })
  }

  return (
    <div style={{ padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '8px', margin: '1rem' }}>
      <h3>🎯 Type Navigation Demo</h3>
      <p>Open this file in your IDE and try the following:</p>
      
      <ol style={{ textAlign: 'left' }}>
        <li><strong>Ctrl/Cmd+click</strong> on any controller method to navigate to its definition</li>
        <li><strong>Hover</strong> over methods to see full type information and documentation</li>
        <li><strong>Type</strong> <code>counterControllers.counterController.</code> and see auto-complete</li>
        <li><strong>Type</strong> <code>taskControllers.taskController.</code> and see all available methods</li>
      </ol>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button onClick={handleCounterDemo} style={{ padding: '0.5rem' }}>
          Test Counter Navigation
        </button>
        <button onClick={handleTaskDemo} style={{ padding: '0.5rem' }}>
          Test Task Navigation
        </button>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#ccc' }}>
        <strong>What you'll see:</strong>
        <ul style={{ textAlign: 'left' }}>
          <li>Controller classes with full JSDoc documentation</li>
          <li>Type-safe method signatures</li>
          <li>Arrow function methods with proper binding</li>
          <li>Parameter validation and return types</li>
        </ul>
      </div>
    </div>
  )
}

export default TypeNavigationDemo 
