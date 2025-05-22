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
      <p>Demonstrates simple state with controllers</p>
      
      <div className="counter-display">
        <span>Count: {count}</span>
      </div>
      
      <div className="counter-actions">
        <button 
          onClick={() => counterController.increment()}
          disabled={isLoading}
        >
          Increment
        </button>
        <button 
          onClick={() => counterController.decrement()}
          disabled={isLoading || count <= 0}
        >
          Decrement
        </button>
      </div>
    </div>
  )
}

export default Counter
