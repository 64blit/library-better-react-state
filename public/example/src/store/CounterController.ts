import type { CounterState } from './CounterStore'

/**
 * Counter Controller Class
 * 
 * Handles all counter-related business logic and state mutations.
 * Each method is properly typed and can be navigated to with Ctrl/Cmd+click.
 */
export class CounterController {
  private getState: () => CounterState
  private setState: (state: Partial<CounterState>) => void

  constructor(
    getState: () => CounterState,
    setState: (state: Partial<CounterState>) => void
  ) {
    this.getState = getState
    this.setState = setState
  }

  /**
   * Increments the counter by 1
   */
  increment = (): void => {
    const currentState = this.getState()
    this.setState({
      count: currentState.count + 1
    })
  }

  /**
   * Decrements the counter by 1 (minimum 0)
   */
  decrement = (): void => {
    const currentState = this.getState()
    if (currentState.count > 0) {
      this.setState({
        count: currentState.count - 1
      })
    }
  }

  /**
   * Resets the counter to 0
   */
  reset = (): void => {
    this.setState({
      count: 0
    })
  }

  /**
   * Sets the counter to a specific value
   * @param count - The new count value
   */
  setCount = (count: number): void => {
    this.setState({
      count
    })
  }

  /**
   * Increments the counter by a custom amount
   * @param amount - The amount to increment by
   */
  incrementBy = (amount: number): void => {
    const currentState = this.getState()
    this.setState({
      count: currentState.count + amount
    })
  }

  /**
   * Decrements the counter by a custom amount (minimum 0)
   * @param amount - The amount to decrement by
   */
  decrementBy = (amount: number): void => {
    const currentState = this.getState()
    const newCount = Math.max(0, currentState.count - amount)
    this.setState({
      count: newCount
    })
  }
} 
