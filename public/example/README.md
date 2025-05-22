# Better React State Example

This example demonstrates how to use the library-better-react-state with React and TypeScript.

## Features

- Modular state management with encapsulated business logic
- Store slices with typed state and controllers
- Persistent state across sessions
- Controlled state updates through dedicated methods

## Examples Included

1. **Counter** - Simple numeric state with increment/decrement controllers
2. **Task List** - Complex state with CRUD operations and persistence

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Open your browser to http://localhost:3000

## How It Works

This example uses the library-better-react-state which is built on Zustand. The library provides a slice-based pattern for state management with strong typing and controlled updates.

Each feature (Counter, TaskList) has its own store slice with:
- Typed state definition
- Controllers for business logic
- Standard methods for state manipulation

The application combines these slices into a unified store while maintaining separation of concerns.
