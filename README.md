# Better React State

A robust, feature-oriented state management library for React applications, built on top of Zustand while embracing Clean Architecture principles.

## Features

- **Feature-Based Architecture**: Organize your state into isolated feature slices
- **Clean Architecture Support**: Domain entities, validation, error handling, and event systems
- **Powerful React Hooks**: Simple hooks for accessing and updating state
- **TypeScript First**: Strong typing for state, actions, and controllers
- **Async Initialization**: Support for asynchronous feature initialization
- **Controller Pattern**: Business logic separated from state and UI
- **Enhanced DevTools**: Time-travel debugging, state snapshots, and diffing
- **Persistence Layer**: Flexible storage adapters with code splitting
- **Performance Optimized**: Tree-shakable, lightweight core with minimal re-renders

## Installation

```bash
npm install library-better-react-state
```

## Basic Usage

```tsx
import { createFeatureStore, useFeatureSlice } from 'library-better-react-state';

// Define your feature
const counterFeature = {
  initialState: { count: 0 },
  actions: (set) => ({
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
    reset: () => set({ count: 0 }),
  }),
};

// Create your store
const useStore = createFeatureStore({
  features: {
    counter: counterFeature,
  },
  options: {
    name: 'MyAppStore',
  },
});

// Use in a component
function Counter() {
  const counter = useFeatureSlice(useStore, 'counter');
  
  return (
    <div>
      <h2>Count: {counter.count}</h2>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
      <button onClick={counter.reset}>Reset</button>
    </div>
  );
}
```

## Core Concepts

### Feature Store

The central piece of this library is the `createFeatureStore` function which creates a Zustand store with feature-based organization:

```tsx
const useStore = createFeatureStore({
  features: {
    user: userFeature,
    products: productsFeature,
    cart: cartFeature,
  },
  options: {
    name: 'ECommerceStore',
    devtools: true,
    persistence: {
      enabled: true,
      type: 'localStorage',
      keyPrefix: 'ecommerce',
    },
  },
});
```

### Feature Definition

Each feature is defined with:

- `initialState`: The starting state for this feature
- `actions`: Functions that update state (similar to reducers)
- `controllers`: Business logic functions that can access global configuration and perform complex operations
- `init`: Async initialization for the feature
- `featureOptions`: Additional configuration for the feature

```tsx
const userFeature = {
  initialState: { 
    profile: null, 
    isLoading: false, 
    error: null 
  },
  actions: (set) => ({
    setProfile: (profile) => set({ profile }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
  }),
  controllers: (INIT, storeApi) => ({
    async fetchProfile(state) {
      // Access to global config via INIT
      const api = INIT.apiBaseUrl;
      
      try {
        // Update state with loading indicator
        storeApi.getState().user.setLoading(true);
        
        // Perform API call
        const response = await fetch(`${api}/user/profile`);
        const profile = await response.json();
        
        // Return state update (will be merged automatically)
        return { profile, isLoading: false };
      } catch (error) {
        return { error: error.message, isLoading: false };
      }
    }
  }),
  init: async (storeApi, featureName) => {
    // Initialize feature on store creation
    const feature = storeApi.getState()[featureName];
    await feature.fetchProfile(feature);
  },
};
```

### Accessing State in Components

```tsx
function UserProfile() {
  // Get the whole feature slice
  const user = useFeatureSlice(useStore, 'user');
  
  // Or use selectors for performance optimization
  const userName = useStore.user.select(state => state.profile?.name);
  
  if (user.isLoading) return <div>Loading...</div>;
  if (user.error) return <div>Error: {user.error}</div>;
  if (!user.profile) return <div>No profile found</div>;
  
  return (
    <div>
      <h2>{user.profile.name}</h2>
      <p>{user.profile.email}</p>
      <button onClick={() => user.fetchProfile(user)}>Refresh</button>
    </div>
  );
}
```

## Advanced Features

### Async Initialization and Global Config

```tsx
// Initialize the store with global configuration
useStore.init({
  apiKey: 'your-api-key',
  apiBaseUrl: 'https://api.example.com/v1',
  theme: 'dark',
}).then(() => {
  console.log('Store initialized');
});

// Wait for full store initialization (including async features)
useStore.onInitialized.then(() => {
  console.log('Store ready for use');
});
```

### Persistence

```tsx
const useStore = createFeatureStore({
  features: { /* ... */ },
  options: {
    persistence: {
      enabled: true,
      type: 'localStorage', // or 'indexedDB' or 'memoryCache'
      keyPrefix: 'myApp',
      autoSave: true,
      syncInterval: 1000, // ms between auto-saves
      include: ['user', 'settings'], // only save these features
      exclude: ['temporaryState'], // don't save these features
    }
  }
});
```

### Debug Mode

```tsx
import { configureLibrary } from 'library-better-react-state';

// Enable debugging globally (more verbose logging)
configureLibrary({ debugMode: true });

// Access debugging utilities
import { getStoreHistory, jumpToHistoryState } from 'library-better-react-state';

// Get recorded state changes
const history = getStoreHistory('MyAppStore');

// Jump to a previous state
jumpToHistoryState(useStore, 'MyAppStore', 3);
```

### Error Handling System

```tsx
import { ErrorSystem, ValidationError } from 'library-better-react-state';

try {
  // Your logic here
} catch (error) {
  if (ErrorSystem.isInstanceOf(error, ValidationError)) {
    // Handle validation errors
  } else {
    // Handle other errors
  }
}
```

### Domain Events

```tsx
import { DomainEventBus } from 'library-better-react-state';

// Subscribe to events
const unsubscribe = DomainEventBus.subscribe('user.created', (event) => {
  console.log('User created:', event.payload);
});

// Publish events
DomainEventBus.publish('user.created', { userId: '123', name: 'John' });

// Cleanup
unsubscribe();
```

## API Reference

See the [API Documentation](./docs/api) for detailed API reference.

## Examples

The library includes several examples to get you started:

- [Basic Setup](./examples/basic-setup): A simple counter feature
- [Async Initialization](./examples/async-init-feature): Feature-level async initialization
- [Controllers](./examples/controllers-feature): Using controllers and global initialization

## License

MIT
