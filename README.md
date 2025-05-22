# Library Store Architecture Guide (v2.1)

## Overview

The store architecture uses a slice-based pattern built on Zustand to provide:

- Modular state management with encapsulated business logic
- Strong typing with TypeScript
- Persistent state across sessions
- Controlled state updates through dedicated methods

## Core Concepts

### Store Slices

A store slice is a self-contained module with:

1. **State** - Typed data structure
2. **Controllers** - Business logic handlers
3. **Standard Methods** - Consistent API for state manipulation

```typescript
// Example slice structure
interface StoreSlice<T extends BaseState, C = SliceControllers> {
  name: string // Unique identifier
  state: T // Typed state data
  controllers: C // Business logic handlers
  getState: () => T // Get current state
  setState: (state: Partial<T>) => void // Update state
  update: () => void // Force re-render
  setError: (error: any) => void // Set error state
  reset: () => void // Reset to initial state
  setup: (session: Session | null) => Promise<void> // Initialize
}
```

### Application Store

The root store combines all slices and provides:

- Session management
- Initialization orchestration
- Persistence configuration

## Implementation Guide

### 1. Create a New Store Slice

Create a file `MyFeatureStore.ts`:

```typescript
import { BaseState, createStoreSlice } from './StoreUitls'

// State interface
export interface MyFeatureState extends BaseState {
  items: Item[]
  isLoading: boolean
}

// Controllers interface
export interface MyFeatureControllers {
  itemController: {
    loadItems: () => Promise<void>
    addItem: (item: Item) => Promise<void>
  }
}

// Initial state
export const initialMyFeatureState: MyFeatureState = {
  items: [],
  isLoading: false,
  status: {},
  error: null,
  initialized: false,
  version: 0,
}

// Create slice using the factory function
export const createMyFeatureSlice = createStoreSlice<
  MyFeatureState,
  MyFeatureControllers
>(
  initialMyFeatureState,
  'myFeature',
  async (update, get, getState, setState, session) => {
    // Initialize controllers
    const itemController = {
      loadItems: async () => {
        setState({ isLoading: true })
        try {
          // API call or data fetch logic
          const items = await fetchItems(session?.accessToken)
          setState({ items, isLoading: false })
        } catch (error) {
          setState({ error, isLoading: false })
        }
      },

      addItem: async (item) => {
        // Implementation
      },
    }

    // Return controllers
    return {
      itemController,
    }
  }
)
```

### 2. Integrate Slice into AppStore

Update `AppStore.ts`:

```typescript
// Import your slice
import { createMyFeatureSlice, MyFeatureState, MyFeatureControllers } from './MyFeatureStore';

// Update AppState interface
export interface AppState extends AppRootState {
  // Existing slices
  report: StoreSlice<ReportState, ReportControllers>;
  // Add your slice
  myFeature: StoreSlice<MyFeatureState, MyFeatureControllers>;
}

// Add to createNewStores function
const createNewStores = (set: any, get: any, api: any) => {
  const reportSlice = createReportSlice(set, get, api);
  // Add your slice
  const myFeatureSlice = createMyFeatureSlice(set, get, api);

  return {
    reportSlice,
    // Other slices
    myFeatureSlice,
  };
};

// Add to the setup function
setup: async (session: Session | null) => {
  // Setup other slices
  if (reportSlice.setup) await reportSlice.setup(session);
  // Add your slice setup
  if (myFeatureSlice.setup) await myFeatureSlice.setup(session);
};

// Update persistence configuration
partialize: ((state: any) => ({
  // Existing slices
  report: { state: state.report.state },
  // Add your slice
  myFeature: { state: state.myFeature.state },
})),

// Add to merge function
merge: (persistedState: any, currentState: any) => {
  // Merge existing slices
  if (persistedState.myFeature?.state) {
    currentState.myFeature.state = {
      ...currentState.myFeature.state,
      ...persistedState.myFeature.state
    };
  }

  return {
    ...currentState,
    session: persistedState.session || currentState.session,
  };
}
```

### 3. Create a Custom Hook

Update `useStore.ts`:

```typescript
// Define hook type
export type MyFeatureHookType = AppStoreHookReturn & {
  state: MyFeatureState
  controllers: MyFeatureControllers
  update: () => void
  setState: (state: Partial<MyFeatureState>) => void
}

// Create hook
export const useMyFeature = (): MyFeatureHookType => {
  const store = useAppStore()

  return {
    ...store,
    state: store.myFeature.state,
    controllers: store.myFeature.controllers,
    update: store.myFeature.update,
    setState: store.myFeature.setState,
  }
}
```

### 4. Use in Components

```tsx
import { useMyFeature } from '../store/useStore'

export default function MyComponent() {
  const { state, controllers, setState } = useMyFeature()

  useEffect(() => {
    // Load data on component mount
    controllers.itemController.loadItems()
  }, [])

  return (
    <div>
      {state.isLoading ? (
        <div>Loading...</div>
      ) : (
        state.items.map((item) => <div key={item.id}>{item.name}</div>)
      )}
    </div>
  )
}
```

## Best Practices

### State Management

- Use `setState` to update state, never mutate directly
- Keep state normalized and minimal
- Use controllers for all business logic
- Call `update()` after operations that may not trigger re-renders

### Controllers

- Design controllers around specific domains
- Keep controller methods pure and focused
- Handle side effects (API calls, etc.) in controllers
- Return Promises from async methods to enable proper await chains

### Persistence

- Only persist serializable state (no functions or complex objects)
- Always update both `partialize` and `merge` when adding a slice
- Clean up sensitive data before persistence

### Error Handling

- Use the `setError` method to handle and propagate errors
- Include proper error recovery in controllers
- Maintain error state per slice for granular error handling

## Architecture Improvement Suggestions

1. **Selector Optimization**

   - Implement memoized selectors to prevent unnecessary re-renders
   - Add a `createSelector` utility for derived state
   - Use `useSelector` hook for optimized state access

2. **Middleware Pattern**

   - Add support for slice-specific middleware (logging, validation)
   - Create a middleware API for cross-cutting concerns
   - Use `useMiddleware` hook to apply middleware to slices

3. **Command Pattern**

   - Implement a command queue for operations that should be atomic
   - Add undo/redo capability with command history
   - Use `createCommand` utility for atomic operations

4. **Enhanced Type Safety**

   - Add runtime type validation with Zod or similar
   - Create stricter typing for controller methods
   - Use `typeSafeController` decorator for validation

5. **Testing Improvements**

   - Add a store mock factory for testing
   - Create test utilities for slice testing in isolation
   - Use `mockStore` utility for unit testing

6. **Async Improvements**

   - Add loading state standardization
   - Implement request cancellation for controllers
   - Use `useLoading` hook to track loading states

7. **Performance Monitoring**
   - Add performance tracking to measure state update frequency
   - Implement slice-specific update throttling
   - Use `usePerformance` hook for monitoring

## Common Pitfalls

1. **Circular Dependencies**

   - Avoid importing hooks in store files
   - Use `import type` for type-only imports

2. **Persistence Issues**

   - Never return `{...currentState, ...persistedState}` in merge
   - Only persist data, not functions or controllers
   - Use `persistData` utility for safe persistence

3. **State Update Timing**

   - State updates may not reflect immediately
   - Always use state from hook returns rather than accessing store directly
   - Use `useEffect` for side effects that depend on state changes

4. **Slice Isolation**
   - Avoid direct cross-slice dependencies
   - Use the AppStore's setup method to coordinate initialization
   - Use `useStore` hook for coordinated access
