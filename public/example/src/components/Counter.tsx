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

      
      <div className="counter-display">
        <span>Count: {count}</span>
      </div>
      
      <div className="counter-actions">
        <button 
          onClick={() => counterController.increment()}
          disabled={isLoading}
          title="increment"
        >
          Increment
        </button>
        <button 
          onClick={() => counterController.decrement()}
          disabled={isLoading || count <= 0}
          title="decrement"
        >
          Decrement
        </button>
        <button 
          onClick={() => counterController.reset()}
          disabled={isLoading}
          title="reset"
        >
          Reset
        </button>
        <button 
          onClick={() => counterController.incrementBy(5)}
          disabled={isLoading}
          title="incrementBy"
        >
          +5
        </button>
        <button 
          onClick={() => counterController.decrementBy(3)}
          disabled={isLoading}
          title="decrementBy"
        >
          -3
        </button>
        <button 
          onClick={() => counterController.setCount(100)}
          disabled={isLoading}
          title="setCount"
        >
          Set to 100
        </button>
      </div>
    </div>
  )
}

export default Counter
