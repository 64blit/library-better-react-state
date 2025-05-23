# Better React State

A modern, type-safe state management library for React applications built on top of Zustand with a powerful slice architecture.

## Features

- 🏗️ **Slice Architecture**: Organize your state into modular, maintainable slices
- 🔄 **Dependency Management**: Define dependencies between slices for ordered initialization
- 💾 **Selective Persistence**: Fine-grained control over what state gets persisted
- 🔧 **Controller Pattern**: Separate business logic from state management
- 📱 **DevTools Support**: Built-in Redux DevTools integration
- 🛡️ **Type Safe**: Full TypeScript support with type inference
- ⚡ **Performance**: Minimal re-renders with Zustand's optimized subscriptions

## Installation

```bash
npm install better-react-state zustand
# or
yarn add better-react-state zustand
# or
pnpm add better-react-state zustand
```

## Quick Start

### 1. Create a Slice

```typescript
import { createStoreSlice, BaseState } from 'better-react-state'

// Define your slice state
interface UserState extends BaseState {
  user: User | null
  isLoading: boolean
}

const initialUserState: UserState = {
  user: null,
  isLoading: false,
  status: {},
  error: null,
  initialized: false,
  version: 0
}

// Define your controllers
interface UserControllers {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
}

// Create the slice
export const userSlice = createStoreSlice<UserState, UserControllers>(
  initialUserState,
  'user',
  async (update, get, getState, setState, initObject) => {
    // Initialize controllers with access to state management functions
    return {
      login: async (email: string, password: string) => {
        setState({ isLoading: true })
        try {
          const user = await authService.login(email, password)
          setState({ user, isLoading: false })
        } catch (error) {
          setState({ isLoading: false, error })
        }
      },
      logout: () => {
        setState({ user: null })
      },
      updateProfile: async (data: Partial<User>) => {
        // Implementation here
      }
    }
  },
  {
    persist: {
      whitelist: ['user'] // Only persist the user object
    }
  }
)
```

### 2. Create the App Store

```typescript
import { createAppStore } from 'better-react-state'
import { userSlice } from './slices/userSlice'
import { settingsSlice } from './slices/settingsSlice'

export const useAppStore = createAppStore({
  name: 'my-app-store',
  slices: [
    {
      name: 'user',
      create: userSlice,
      options: {
        persist: {
          whitelist: ['user']
        }
      }
    },
    {
      name: 'settings',
      create: settingsSlice,
      options: {
        dependencies: ['user'], // Initialize after user slice
        persist: {
          blacklist: ['temporaryData']
        }
      }
    }
  ],
  onSave: async (state) => {
    // Optional: Save state to server
    await api.saveUserPreferences(state)
  }
})
```

### 3. Initialize and Use in React

```typescript
import { useEffect } from 'react'
import { useAppStore } from './store'

function App() {
  const setup = useAppStore(state => state.setup)
  const initialized = useAppStore(state => state.initialized)
  const user = useAppStore(state => state.user?.state.user)
  const userControllers = useAppStore(state => state.user?.controllers)

  useEffect(() => {
    // Initialize the store with any required data
    setup({ apiToken: 'your-token', userId: '123' })
  }, [setup])

  if (!initialized) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Welcome {user?.name}</h1>
      <button onClick={() => userControllers?.logout()}>
        Logout
      </button>
    </div>
  )
}
```

## API Reference

### `createStoreSlice<T, C>(initialState, sliceName, setupControllers, options?)`

Creates a reusable store slice.

**Parameters:**
- `initialState: T` - Initial state for the slice
- `sliceName: string` - Unique name for the slice
- `setupControllers: Function` - Async function that returns controllers
- `options?: CreateSliceOptions<T>` - Optional configuration

### `createAppStore(config)`

Creates the main application store.

**Parameters:**
- `config.name: string` - Store name for persistence
- `config.slices: SliceConfig[]` - Array of slice configurations
- `config.onSave?: Function` - Optional callback for state persistence

### Slice Options

```typescript
interface CreateSliceOptions<T> {
  persist?: {
    whitelist?: (keyof T)[]  // Only persist these keys
    blacklist?: (keyof T)[]  // Don't persist these keys
  }
  dependencies?: string[]    // Slice names this slice depends on
}
```

## License

MIT

## Contributing

We welcome contributions! Please see our contributing guidelines for more details.
