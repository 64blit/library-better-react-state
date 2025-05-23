# Better React State - Example Project

This example project demonstrates the Better React State library with proper initialization handling, controller classes, and type-safe state management.

## ✨ Key Features Demonstrated

### 🚀 **Proper Initialization System**
- **Loading States**: Beautiful loading spinner while store initializes
- **Error Handling**: Graceful error states with recovery options  
- **Centralized Setup**: Single initialization point in App component
- **Validation**: Comprehensive checks before rendering content

### 🏗️ **Controller Classes**
- **Type Safety**: Full TypeScript support with IntelliSense
- **Navigation**: Ctrl/Cmd+click to navigate to method definitions
- **Safety**: Input validation, error boundaries, and immutable operations
- **Documentation**: JSDoc comments for all methods

### 📦 **Slice Architecture**
- **Counter Slice**: Simple state with mathematical operations
- **TaskList Slice**: Complex state with persistence and async operations
- **Modular Design**: Clean separation of concerns

## 🔄 Initialization Flow

1. **App Component Mount**
   - Centralized store setup in `useEffect`
   - Loading state management with `useState`
   - Error boundary with recovery options

2. **Store Setup**
   - Initialize Zustand store with slices
   - Create controller class instances
   - Restore persisted state from localStorage
   - Load initial data (sample tasks)

3. **Validation**
   - Verify store is initialized
   - Check all slices are ready
   - Ensure controllers are instantiated
   - Validate state structure

4. **Render**
   - Only render when fully initialized
   - Pass validated store data to components
   - Enable full type safety and navigation

## 🛡️ Safety Features

### **Controller Classes**
```typescript
// Input validation
if (!this.isValidId(id)) {
  console.warn('Invalid task ID')
  return
}

// Error boundaries
try {
  const state = this.getState()
  this.setState({ count: state.count + 1 })
} catch (error) {
  console.error('Operation failed:', error)
}

// Immutable operations
const updatedTasks = currentState.tasks.map(task =>
  task.id === id ? { ...task, completed: !task.completed } : task
)
```

### **Initialization Validation**
```typescript
// Comprehensive initialization checks
if (!store.initialized || 
    !store.counter?.state?.initialized || 
    !store.taskList?.state?.initialized ||
    !store.counter?.controllers?.counterController ||
    !store.taskList?.controllers?.taskController) {
  return <LoadingSpinner />
}
```

## 🎯 Type Navigation

Press **Ctrl/Cmd+click** on any controller method to navigate to its definition:

```typescript
// Navigate to CounterController.increment()
counterController.increment()

// Navigate to TaskListController.addTask()
taskController.addTask(newTask)

// Navigate to TaskListController.loadTasks()
taskController.loadTasks()
```

## 🏃‍♂️ Running the Example

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── Counter.tsx      # Counter demo component
│   ├── TaskList.tsx     # Task list demo component
│   └── *.css           # Component styles
├── store/               # State management
│   ├── AppStore.ts      # Main store configuration
│   ├── CounterController.ts   # Counter business logic
│   ├── CounterStore.ts        # Counter slice definition
│   ├── TaskListController.ts  # TaskList business logic
│   ├── TaskListStore.ts      # TaskList slice definition
│   └── types.ts              # TypeScript definitions
├── hooks/               # Custom React hooks
│   └── useStore.ts      # Store access hooks
├── demo/                # Demo components
│   └── TypeNavigationDemo.tsx # Navigation examples
├── utils/               # Utilities
│   └── testInitialization.ts # Testing utilities
└── App.tsx              # Main app with initialization
```

## 💡 Learning Points

1. **Centralized Initialization**: Handle store setup in one place
2. **Loading States**: Always show loading while initializing
3. **Error Boundaries**: Gracefully handle initialization failures
4. **Type Safety**: Use TypeScript for better developer experience
5. **Controller Classes**: Organize business logic in navigable classes
6. **Immutable Operations**: Always create new state objects
7. **Input Validation**: Validate all inputs to controller methods

## 🔗 Related Files

- [Main Library README](../../README.md)
- [Counter Controller](src/store/CounterController.ts)
- [TaskList Controller](src/store/TaskListController.ts)
- [Type Navigation Demo](src/components/demo/TypeNavigationDemo.tsx)
