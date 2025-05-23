import { CounterState, CounterControllers } from '../store/CounterStore'
import './Counter.css'

interface CounterProps {
  state: CounterState
  controllers: CounterControllers
  update: () => void
  setState: (state: Partial<CounterState>) => void
}

function Counter({ state, controllers }: CounterProps) {
  const { count, isLoading } = state
  const { counterController } = controllers

  return (
    <div className="counter-container">
      <h2>Counter Example</h2>
      <p>Demonstrates simple state with typed controller classes</p>
      <p><small>Ctrl/Cmd+click on controller methods to navigate to their definitions!</small></p>
      
      <div className="counter-display">
        <span>Count: {count}</span>
      </div>
      
      <div className="counter-actions">
        <button 
          onClick={() => counterController.increment()}
          disabled={isLoading}
          title="Ctrl/Cmd+click to navigate to increment method"
        >
          Increment
        </button>
        <button 
          onClick={() => counterController.decrement()}
          disabled={isLoading || count <= 0}
          title="Ctrl/Cmd+click to navigate to decrement method"
        >
          Decrement
        </button>
        <button 
          onClick={() => counterController.reset()}
          disabled={isLoading}
          title="Ctrl/Cmd+click to navigate to reset method"
        >
          Reset
        </button>
        <button 
          onClick={() => counterController.incrementBy(5)}
          disabled={isLoading}
          title="Ctrl/Cmd+click to navigate to incrementBy method"
        >
          +5
        </button>
        <button 
          onClick={() => counterController.decrementBy(3)}
          disabled={isLoading}
          title="Ctrl/Cmd+click to navigate to decrementBy method"
        >
          -3
        </button>
        <button 
          onClick={() => counterController.setCount(100)}
          disabled={isLoading}
          title="Ctrl/Cmd+click to navigate to setCount method"
        >
          Set to 100
        </button>
      </div>
    </div>
  )
}

export default Counter
