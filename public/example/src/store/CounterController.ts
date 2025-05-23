import type { CounterState } from './CounterStore'

/**
 * Counter Controller Class
 * 
 * Handles all counter-related business logic and state mutations.
 * Each method is properly typed and can be navigated to with Ctrl/Cmd+click.
 * 
 * Safety features:
 * - Input validation on all methods
 * - Immutable state access
 * - Error boundary protection
 * - Type-safe operations
 */
export class CounterController {
  private readonly getState: () => CounterState
  private readonly setState: (state: Partial<CounterState>) => void

  constructor(
    getState: () => CounterState,
    setState: (state: Partial<CounterState>) => void
  ) {
    if (!getState || typeof getState !== 'function') {
      throw new Error('CounterController: getState must be a function')
    }
    if (!setState || typeof setState !== 'function') {
      throw new Error('CounterController: setState must be a function')
    }
    
    this.getState = getState
    this.setState = setState
  }

  /**
   * Increments the counter by 1
   * Safe operation with bounds checking
   */
  increment = (): void => {
    try {
      const currentState = this.getState()
      const newCount = currentState.count + 1
      
      // Safety check for reasonable bounds
      if (newCount > Number.MAX_SAFE_INTEGER) {
        console.warn('CounterController: Increment would exceed safe integer bounds')
        return
      }
      
      this.setState({ count: newCount })
    } catch (error) {
      console.error('CounterController.increment failed:', error)
    }
  }

  /**
   * Decrements the counter by 1 (minimum 0)
   * Safe operation with bounds checking
   */
  decrement = (): void => {
    try {
      const currentState = this.getState()
      const newCount = Math.max(0, currentState.count - 1)
      this.setState({ count: newCount })
    } catch (error) {
      console.error('CounterController.decrement failed:', error)
    }
  }

  /**
   * Resets the counter to 0
   * Safe operation with validation
   */
  reset = (): void => {
    try {
      this.setState({ count: 0 })
    } catch (error) {
      console.error('CounterController.reset failed:', error)
    }
  }

  /**
   * Sets the counter to a specific value
   * @param count - The new count value (must be non-negative integer)
   */
  setCount = (count: number): void => {
    try {
      // Input validation
      if (typeof count !== 'number' || !Number.isInteger(count)) {
        console.warn('CounterController.setCount: count must be an integer')
        return
      }
      
      if (count < 0) {
        console.warn('CounterController.setCount: count must be non-negative')
        return
      }
      
      if (count > Number.MAX_SAFE_INTEGER) {
        console.warn('CounterController.setCount: count exceeds safe integer bounds')
        return
      }
      
      this.setState({ count })
    } catch (error) {
      console.error('CounterController.setCount failed:', error)
    }
  }

  /**
   * Increments the counter by a custom amount
   * @param amount - The amount to increment by (must be positive integer)
   */
  incrementBy = (amount: number): void => {
    try {
      // Input validation
      if (typeof amount !== 'number' || !Number.isInteger(amount)) {
        console.warn('CounterController.incrementBy: amount must be an integer')
        return
      }
      
      if (amount <= 0) {
        console.warn('CounterController.incrementBy: amount must be positive')
        return
      }
      
      const currentState = this.getState()
      const newCount = currentState.count + amount
      
      // Safety check for reasonable bounds
      if (newCount > Number.MAX_SAFE_INTEGER) {
        console.warn('CounterController.incrementBy: result would exceed safe integer bounds')
        return
      }
      
      this.setState({ count: newCount })
    } catch (error) {
      console.error('CounterController.incrementBy failed:', error)
    }
  }

  /**
   * Decrements the counter by a custom amount (minimum 0)
   * @param amount - The amount to decrement by (must be positive integer)
   */
  decrementBy = (amount: number): void => {
    try {
      // Input validation
      if (typeof amount !== 'number' || !Number.isInteger(amount)) {
        console.warn('CounterController.decrementBy: amount must be an integer')
        return
      }
      
      if (amount <= 0) {
        console.warn('CounterController.decrementBy: amount must be positive')
        return
      }
      
      const currentState = this.getState()
      const newCount = Math.max(0, currentState.count - amount)
      this.setState({ count: newCount })
    } catch (error) {
      console.error('CounterController.decrementBy failed:', error)
    }
  }

  /**
   * Gets the current count value safely
   * @returns The current count value
   */
  getCurrentCount = (): number => {
    try {
      const currentState = this.getState()
      return currentState.count
    } catch (error) {
      console.error('CounterController.getCurrentCount failed:', error)
      return 0
    }
  }

  /**
   * Checks if the counter is at its maximum safe value
   * @returns True if at maximum safe value
   */
  isAtMaximum = (): boolean => {
    try {
      const currentState = this.getState()
      return currentState.count >= Number.MAX_SAFE_INTEGER
    } catch (error) {
      console.error('CounterController.isAtMaximum failed:', error)
      return false
    }
  }

  /**
   * Checks if the counter is at zero
   * @returns True if counter is at zero
   */
  isAtZero = (): boolean => {
    try {
      const currentState = this.getState()
      return currentState.count === 0
    } catch (error) {
      console.error('CounterController.isAtZero failed:', error)
      return true
    }
  }
} 
