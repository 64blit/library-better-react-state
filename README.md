# Better React State

A modern, type-safe state management library for React built on Zustand with controller classes and slice architecture.

## Features

- 🏗️ **Controller Classes**: Organize logic in type-safe, navigable classes
- 🔄 **Slice Architecture**: Modular state management with clear separation
- 💾 **Smart Persistence**: Fine-grained control over what gets persisted
- 🛡️ **Type Safe**: Full TypeScript support with Ctrl/Cmd+click navigation
- ⚡ **Performance**: Minimal re-renders with Zustand optimizations

## Installation

```bash
npm install better-react-state zustand
```

## Quick Start

### 1. Create a Controller Class

```typescript
import type { CounterState } from './CounterStore'

export class CounterController {
  constructor(
    private getState: () => CounterState,
    private setState: (state: Partial<CounterState>) => void
  ) {}

  increment = (): void => {
    const state = this.getState()
    this.setState({ count: state.count + 1 })
  }

  decrement = (): void => {
    const state = this.getState()
    this.setState({ count: Math.max(0, state.count - 1) })
  }

  reset = (): void => {
    this.setState({ count: 0 })
  }
}
```

### 2. Create a Store Slice

```typescript
import { createStoreSlice, BaseState } from 'better-react-state'
import { CounterController } from './CounterController'

interface CounterState extends BaseState {
  count: number
}

interface CounterControllers {
  counterController: CounterController
}

export const createCounterSlice = createStoreSlice<CounterState, CounterControllers>(
  { count: 0, status: {}, error: null, initialized: false, version: 0 },
  'counter',
  async (_update, _get, getState, setState) => {
    const counterController = new CounterController(getState, setState)
    return { counterController }
  }
)
```

### 3. Create the App Store

```typescript
import { createAppStore } from 'better-react-state'
import { createCounterSlice } from './CounterStore'

export const useAppStore = createAppStore({
  name: 'my-app',
  slices: [
    {
      name: 'counter',
      create: createCounterSlice,
      options: { persist: { whitelist: ['count'] } }
    }
  ]
})
```

### 4. Use in React

```typescript
import { useEffect } from 'react'

function Counter() {
  const store = useAppStore()
  
  useEffect(() => {
    if (!store.initialized) {
      store.setup()
    }
  }, [store])

  const { count } = store.counter.state
  const { counterController } = store.counter.controllers

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => counterController.increment()}>+</button>
      <button onClick={() => counterController.decrement()}>-</button>
      <button onClick={() => counterController.reset()}>Reset</button>
    </div>
  )
}
```

## Key Benefits

### 🎯 **Controller Navigation**
Ctrl/Cmd+click on any controller method to navigate directly to its definition:

```typescript
// Click to navigate to the actual method implementation
counterController.increment()  // ← Navigate to CounterController.increment()
```

### 🔒 **Type Safety**
Full TypeScript support with IntelliSense and compile-time validation:

```typescript
// Auto-complete shows all available methods
counterController.   // ← Shows: increment, decrement, reset, etc.
```

### 📦 **Modular Architecture**
Clean separation of concerns:
- **State**: Type-safe data structures
- **Controllers**: Business logic in classes  
- **Slices**: Encapsulated modules
- **Store**: Centralized state management

## API Reference

### `createStoreSlice<State, Controllers>(initialState, name, setup, options?)`

Creates a reusable store slice with controller classes.

### `createAppStore(config)`

Creates the main application store that combines slices.

### Controller Classes

Controllers are regular TypeScript classes with:
- Private state accessors injected via constructor
- Public methods for business logic
- Full type safety and navigation support

## Example Structure

```
src/
├── store/
│   ├── CounterController.ts    # Business logic class
│   ├── CounterStore.ts         # Slice definition
│   └── AppStore.ts            # Main store
└── components/
    └── Counter.tsx            # React component
```

## License

MIT
