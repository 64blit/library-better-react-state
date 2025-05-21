// Main entry point for the library

// Core
export * from "./core/types";
export * from "./core/createFeatureStore";

// React specific
export * from "./react/types";
export * from "./react/hooks";

// Configuration
export { configureLibrary, getConfig } from "./config";

// Domain (Error Handling, Events) - Generally useful
export * from "./domain/ErrorSystem";
export * from "./domain/DomainEvent";

// Devtools Utilities
export { createStateSnapshot, diffStates } from "./devtools/stateUtils";
export type { StateDiff, DiffKind } from "./devtools/stateUtils";
export * from "./devtools/timeTravel";

// Persistence (optional, may involve larger code if used)
export { PersistenceLayer } from "./persistence/PersistenceLayer";
export type { PersistenceOptions, StorageType } from "./persistence/PersistenceOptions";
export type { StorageAdapter } from "./persistence/StorageAdapter";
export { LocalStorageAdapter } from "./persistence/LocalStorageAdapter";
export { IndexedDBAdapter } from "./persistence/IndexedDBAdapter";

// Note: Specific adapter *implementations* like LocalStorageAdapter, IndexedDBAdapter are not exported here by default.
// They are intended to be dynamically imported by PersistenceLayer based on configuration.
// We export the classes here to allow manual instantiation if needed.
