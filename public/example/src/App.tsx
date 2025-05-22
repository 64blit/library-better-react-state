import { useCounter, useTaskList } from './hooks/useStore'
import Counter from './components/Counter'
import TaskList from './components/TaskList'
import './App.css'

function App() {
  const counterState = useCounter()
  const taskListState = useTaskList()

  return (
    <div className="app-container">
      <h1>Better React State Example</h1>
      <p>This example demonstrates the library's slice-based state management pattern</p>
      
      <Counter {...counterState} />
      <TaskList {...taskListState} />
    </div>
  )
}

export default App
