import type { TypedAppStore } from './AppStore'

// Re-export controller classes for easier access
export { CounterController } from './CounterController'
export { TaskListController } from './TaskListController'

// Export the properly typed store interface
export type { TypedAppStore }

// Type-safe selector hook type - no manual typing needed!
export type StoreSelector<T> = (state: TypedAppStore) => T

// Type-safe store hook return type - automatically inferred!
export type TypedStoreHook = () => TypedAppStore

// Example of how the new typing provides better developer experience:

/* 
BEFORE (manual type casting required):
const store = useAppStore() as unknown as TypedAppStore

AFTER (automatic type inference):
const store = useAppStore() // TypedAppStore is automatically inferred!

The store now provides:
- ✅ Full IntelliSense on store.counter.state.count
- ✅ Full IntelliSense on store.taskList.controllers.taskController.addTask()
- ✅ Ctrl/Cmd+click navigation to controller method definitions
- ✅ Compile-time type checking for all operations
- ✅ Auto-completion for state properties and controller methods

Example usage with full type safety:
```typescript
const store = useAppStore()

// TypeScript knows this is a number
const count = store.counter.state.count

// TypeScript knows these are the available methods
store.counter.controllers.counterController.increment()
store.taskList.controllers.taskController.addTaskWithText('New task')

// Compile-time error if you try invalid operations
store.counter.state.count = 'invalid' // ❌ Type error!
store.taskList.controllers.taskController.invalidMethod() // ❌ Type error!
```
*/

// Utility type to extract controller types from the store
export type ExtractControllers<T> = T extends { controllers: infer C } ? C : never

// Example: Extract counter controllers type
export type CounterControllers = ExtractControllers<TypedAppStore['counter']>

// Example: Extract task list controllers type  
export type TaskListControllers = ExtractControllers<TypedAppStore['taskList']>

// Utility type to extract state types from the store
export type ExtractState<T> = T extends { state: infer S } ? S : never

// Example: Extract counter state type
export type CounterState = ExtractState<TypedAppStore['counter']>

// Example: Extract task list state type
export type TaskListState = ExtractState<TypedAppStore['taskList']> 
