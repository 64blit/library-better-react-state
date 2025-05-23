
import { useAppStore } from './store/AppStore'
import Counter from './components/Counter'
import TaskList from './components/TaskList'
import TypeNavigationDemo from './demo/TypeNavigationDemo'
import './App.css'

function LoadingSpinner({count}:{count:number}) {

  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <h2>Initializing Better React State...</h2>
      <h2>Waiting for setup function: {count} seconds left</h2>
      <p>Setting up store slices and controllers</p>
      <div className="loading-steps">
        <div className="loading-step">⚡ Loading Counter slice</div>
        <div className="loading-step">📝 Loading TaskList slice</div>
        <div className="loading-step">🏗️ Initializing controllers</div>
        <div className="loading-step">💾 Restoring persisted state</div>
      </div>
    </div>
  )
}

function App() {
  const store = useAppStore()

  console.log('🍻App.tsx:25/(store):', store)
  if(!store.initialized){
    store.setup()
  }

  // Show loading spinner while initializing
  if (store.isInitializing) {
    return <LoadingSpinner count={store.counter.state.loadingCountDown} />
  }

  // Show error if initialization failed
  if (store.error) {
    return (
      <div className="error-container">
        <h2>❌ Initialization Error</h2>
        <p>{store.error}</p>
        <button onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    )
  }

  // Ensure store and slices are fully initialized
  if (!store.initialized) {
    return <LoadingSpinner count={store.counter.state.loadingCountDown} />
  }

  // Render main app content
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🚀 Better React State Example</h1>
        <p>A modern, type-safe state management library with controller classes</p>
      </header>
      
      <main className="app-main">
        <div className="demo-section">
          <Counter 
            state={store.counter.state}
            controllers={store.counter.controllers}
            update={store.counter.update}
            setState={store.counter.setState}
          />
        </div>
        
        <div className="demo-section">
          <TaskList 
            state={store.taskList.state}
            controllers={store.taskList.controllers}
            update={store.taskList.update}
            setState={store.taskList.setState}
          />
        </div>
        
        <div className="demo-section">
          <TypeNavigationDemo />
        </div>
      </main>
      
      <footer className="app-footer">
        <p>Store Status: ✅ Initialized | Controllers: ✅ Ready | Persistence: ✅ Active</p>
      </footer>
    </div>
  )
}

export default App
