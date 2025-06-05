export declare interface AppRootState {
    initObject?: any;
    initialized: boolean;
    version: number;
    isInitializing: boolean;
    error: string | null;
}

export declare type AppState = AppRootState & {
    [key: string]: StoreSlice<any, any>;
} & {
    setup: (initObject?: any) => Promise<void>;
};

export declare interface AppStoreConfig {
    name: string;
    slices: SliceConfig<any, any>[];
    onSave?: (state: any) => Promise<void>;
}

export declare interface BaseState {
    status: Record<string, string>;
    error: any;
    initialized: boolean;
    version: number;
}

export declare function createAppStore(config: AppStoreConfig): () => AppState;

/**
 * Creates a store slice with state management and controller setup
 *
 * @template T - The state type that extends BaseState
 * @template C - The controllers type (defaults to SliceControllers) - the controllers manage logic for the slice
 *
 * @param {T} initialState - The initial state for the slice
 * @param {string} sliceName - The name of the slice in the store
 * @param {Function} setupControllers - Async function to initialize controllers which handle all logic for the slice
 *
 * @returns {Function} A function that creates a StoreSlice with the following properties:
 * - state: The current state of the slice
 * - controllers: The initialized controllers for the slice
 * - getState: Function to get the current state
 * - setState: Function to update the state
 * - update: Function to trigger a store update
 * - setError: Function to set error state
 * - reset: Function to reset the slice to initial state
 * - setup: Async function to initialize the slice with session data
 *
 * @example
 * const reportSlice = createStoreSlice(
 *   initialReportState,
 *   'report',
 *   async (update, getState, setState, session) => {
 *     // Initialize controllers here
 *     return controllers;
 *   }
 * );
 */
export declare interface CreateSliceOptions<T extends BaseState> {
    persist?: {
        blacklist?: (keyof T)[];
        whitelist?: (keyof T)[];
    };
    dependencies?: string[];
}

export declare const createStoreSlice: <T extends BaseState, C = SliceControllers>(initialState: T, sliceName: string, setupControllers: (update: () => void, get: () => any, getState: () => T, setState: (state: Partial<T>) => void, initObject?: any) => Promise<C>, options?: CreateSliceOptions<T>) => (set: (state: any) => void, get: () => any) => StoreSlice<T, C>;

export declare function defineSliceConfig<TState extends BaseState, TControllers = SliceControllers>(config: SliceConfig<TState, TControllers>): SliceConfig<TState, TControllers>;

export declare function defineStoreConfig(config: AppStoreConfig): AppStoreConfig;

export declare interface PersistOptions {
    name: string;
    partialize?: (state: any) => any;
}

export declare interface SliceConfig<TState extends BaseState = BaseState, TControllers = SliceControllers> {
    name: string;
    create: (set: any, get: any, api: any, options?: CreateSliceOptions<TState>) => StoreSlice<TState, TControllers>;
    options?: CreateSliceOptions<TState>;
}

export declare type SliceControllers = Record<string, any>;

export declare interface StoreSlice<T extends BaseState, C = SliceControllers> {
    name: string;
    state: T;
    controllers: C;
    getState: () => T;
    setState: (state: Partial<T>) => void;
    update: () => void;
    setError: (error: any) => void;
    reset: () => void;
    setup: (initObject?: any) => Promise<void>;
    persist?: {
        blacklist?: (keyof T)[];
        whitelist?: (keyof T)[];
    };
    dependencies?: string[];
}

export { }
