# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Library Development:**
```bash
# Build the library
npm run build

# Start development server for library
npm run dev

# Preview the build
npm run preview
```

**Example Application:**
```bash
# Navigate to example app
cd public/example

# Install dependencies and run example
npm install
npm run dev

# Build example app
npm run build

# Preview built example app
npm run preview
```

## Architecture Overview

This is a React state management library built on Zustand with object-oriented controller classes and modular slice architecture.

**Core Library Structure:**
- `src/AppStore.ts` - Main store creation and slice orchestration
- `src/StoreUitls.ts` - Utility functions and type definitions
- `src/index.ts` - Public API exports

**Key Architectural Patterns:**

1. **Slice-Based Architecture**: State is organized into independent slices (e.g., counter, taskList), each with their own state interface and controller classes.

2. **Controller Classes**: Business logic is encapsulated in controller classes that receive `getState` and `setState` functions via constructor injection:
   ```typescript
   constructor(
     private getState: () => StateType,
     private setState: (state: Partial<StateType>) => void
   ) {}
   ```

3. **Type Safety**: All state interfaces must extend `BaseState` which provides: `status`, `error`, `initialized`, `version` properties.

4. **Store Configuration**: Applications define typed slice configurations with `SliceConfig<StateType, ControllersType>` and combine them into an app store.

**Example Implementation Pattern:**
The `public/example/` directory contains a complete reference implementation showing:
- Counter slice with increment/decrement/reset functionality
- TaskList slice with CRUD operations
- Proper TypeScript typing with `TypedAppStore` interface
- Store initialization with loading states
- Component integration patterns

**Library Build Output:**
- `dist/better-react-state.es.js` - ES modules build
- `dist/better-react-state.umd.js` - UMD build
- `dist/index.d.ts` - TypeScript declarations

The library is designed for TypeScript projects requiring type-safe state management with IDE navigation support and modular architecture.