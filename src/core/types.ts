import { StoreApi, UseBoundStore } from "zustand";
import { DevtoolsOptions } from "zustand/middleware";
import { PersistenceOptions as CorePersistenceOptions } from "../persistence/PersistenceOptions";

/**
 * Optional global configurations for the feature store, passed within `FeatureStoreConfig.options`.
 * These settings control behaviors like debugging, Redux DevTools integration, persistence, and logging.
 */
export interface StoreOptions {
  /**
   * An optional name for the store. This name is used for:
   * - Identifying the store in Redux DevTools (if enabled).
   * - As a default key prefix for persisted state if `persistence.keyPrefix` is not set.
   * @example "MyApplicationStore"
   */
  name?: string;

  /**
   * Configures Zustand's Redux DevTools middleware integration.
   * - `true` (default in development): Enables DevTools with default settings (using `store.name`).
   * - `false` (default in production): Disables DevTools integration.
   * - `DevtoolsOptions` object: Allows for custom DevTools configuration (e.g., custom name, serializers).
   * @see https://github.com/pmndrs/zustand/blob/main/docs/integrations/redux-devtools-integration.md
   */
  devtools?: boolean | DevtoolsOptions;

  /**
   * Configures state persistence for the entire store.
   * If provided and `enabled` is true, the store will attempt to automatically load state from
   * and save state to the configured storage (e.g., localStorage, IndexedDB).
   * Utilizes the `PersistenceLayer` which supports dynamic adapter loading for code splitting.
   * @see CorePersistenceOptions for detailed configuration like storage type, whitelist/blacklist, debounce, etc.
   */
  persistence?: CorePersistenceOptions;

  /**
   * Provides a global logger function for observing store activities.
   * When defined, this function is called for various events like feature actions, state changes,
   * and initialization steps, providing context about the event.
   * - Set to `false` to explicitly disable all logging through this mechanism.
   * - If undefined, a default logger (`console.debug`) is used in development, and it's disabled in production.
   * The `log` object parameter includes:
   *   - `type`: The type of event (e.g., "ACTION", "STATE_CHANGE", "INIT").
   *   - `feature`: (Optional) The name of the feature involved.
   *   - `action`: (Optional) The name of the action called.
   *   - `payload`: (Optional) The payload of the action.
   *   - `prevState`: (Optional) The state before a change.
   *   - `nextState`: The state after a change or the current state for informational logs.
   */
  logger?:
    | ((log: {
        type: string;
        feature?: string;
        action?: string;
        payload?: any;
        prevState?: any;
        nextState: any;
      }) => void)
    | false;
}

// Forward declaration for CombinedFeatureSlices and InternalState for init method signature
interface PlaceHolder_CombinedSlicesAndInternalState {
  [key: string]: any;
}

/**
 * Represents a single method within a feature's controller.
 * It receives the current state of its feature slice and any arguments.
 * It can return a partial state to update the slice, or void if it handles updates internally (e.g., by calling actions).
 * It can also return a Promise for async operations.
 * @template TFeatureState The state type of the feature slice this controller method operates on.
 */
export type ControllerMethod<TFeatureState = any> = (
  currentSliceState: TFeatureState,
  ...args: any[]
) => Partial<TFeatureState> | void | Promise<Partial<TFeatureState> | void>;

/**
 * Represents the API of a feature's controller, typically a set of methods.
 * These methods encapsulate business logic and can interact with the feature's state and the global `INIT_Object`.
 * Each method should conform to the `ControllerMethod` signature.
 * @template TFeatureState The state type of the feature slice this controller operates on.
 */
export type ControllerApi<TFeatureState = any> = Record<
  string,
  ControllerMethod<TFeatureState>
>;

/**
 * Defines the complete structure and behavior of a single feature within the store.
 * Each feature encapsulates its own state, actions for state manipulation, optional asynchronous
 * initialization logic, controllers for business logic, and specific feature options.
 *
 * @template TState The type of the feature's state slice (e.g., `{ count: number; user?: User }`).
 * @template TActionsCreator A function that defines actions for this feature.
 *   It receives feature-scoped `set` (to update its slice) and `get` (to read its slice) functions.
 *   Example: `(set, get) => ({ increment: () => set(state => ({ count: state.count + 1 })) })`
 */
export interface FeatureDefinition<
  TState = any,
  TActionsCreator extends
    | ((
        set: (
          updater: Partial<TState> | ((state: TState) => Partial<TState>),
        ) => void,
        get: () => TState,
      ) => any)
    | undefined = undefined,
> {
  /** The initial state of the feature. */
  initialState: TState;
  /**
   * An optional function that returns an object of action creators for this feature.
   * Actions are functions that can update the feature's state slice.
   * They receive `set` and `get` functions scoped to this feature's state.
   * - `set(updater)`: Updates the feature's state. `updater` can be a partial state object
   *   or a function `(currentState) => partialStateUpdates`.
   * - `get()`: Returns the current state of this feature's slice.
   * @example actions: (set, get) => ({ loadUser: async (id) => { const user = await api.fetchUser(id); set({ user }); } })
   */
  actions?: TActionsCreator;
  /**
   * Optional asynchronous initialization function specifically for this feature.
   * This function is called once when the store is being set up.
   * It can be used for tasks like fetching initial data required by the feature or setting up subscriptions.
   * The feature's state is marked as "pending" until this promise resolves, or "error" if it rejects.
   * Receives the full Zustand store API (allowing interaction with other features if necessary, use with caution)
   * and the name of this feature.
   * @param storeApi The complete Zustand `StoreApi` instance for the entire feature store.
   * @param featureName The name of the current feature being initialized.
   * @example init: async (storeApi, featureName) => { const data = await fetchInitialData(); storeApi.getState()[featureName].someAction(data); }
   */
  init?: (
    storeApi: StoreApi<PlaceHolder_CombinedSlicesAndInternalState>,
    featureName: string,
  ) => Promise<void>;
  /**
   * Optional factory function to create controllers for this feature.
   * Called after the global `INIT_Object` is available if `featureOptions.waitForGlobalInit` is not `false`.
   * The returned methods are merged into the feature's slice in the store.
   * @param INIT The globally initialized `INIT_Object`, providing app-wide configuration and auth data.
   * @param featureStoreApi The full Zustand store API, allowing interaction with any part of the store if necessary (use with caution to maintain feature encapsulation).
   * @returns An object of controller methods (conforming to `ControllerApi<TState>`). These methods typically operate on their own feature's state or orchestrate actions.
   */
  controllers?: (
    INIT: INIT_Object,
    featureStoreApi: StoreApi<PlaceHolder_CombinedSlicesAndInternalState>,
  ) => ControllerApi<TState>;
  /**
   * Optional feature-specific configurations.
   * This allows for extending features with unique settings or behaviors.
   * @example featureOptions: { refreshInterval: 5000 }
   */
  featureOptions?: {
    /**
     * If `true` (default), the feature's `controllers` factory (if defined) will only be invoked
     * after the global `store.init()` method has successfully completed and the global `INIT_Object` is available.
     * This ensures controllers have access to app-wide configurations or authentication data from `INIT_Object`.
     * If `controllers` are defined and this option is explicitly set to `false`, the `controllers` factory
     * will be called during the initial store setup phase, but it will NOT receive the `INIT_Object`
     * (the `INIT` parameter to the factory will be undefined or an empty object).
     * This might be useful for controllers that do not depend on global initialization data.
     */
    waitForGlobalInit?: boolean;
    // Other feature-specific options can be added here as needed.
  };
}

/**
 * A map of feature names (keys) to their `FeatureDefinition`s.
 * This is the primary configuration input for defining features in the store.
 */
export type FeatureDefinitions = {
  [key: string]: FeatureDefinition<any, any>;
};

/**
 * Utility type to extract the state type from a `FeatureDefinition`.
 * @template F The feature definition.
 */
export type StateFromFeature<F extends FeatureDefinition<any, any>> =
  F["initialState"];

/**
 * Utility type to extract the type of the actions object created by a `FeatureDefinition`'s `actions` function.
 * If `actions` is not defined or doesn't return an object, it defaults to an empty object type.
 * @template F The feature definition.
 */
export type ActionsFromFeature<F extends FeatureDefinition<any, any>> =
  F["actions"] extends (set: any, get: any) => infer R
    ? R extends object
      ? R
      : {}
    : {};

/**
 * Utility type to extract the type of the controllers object (implementing `ControllerApi<StateFromFeature<F>>`)
 * created by a `FeatureDefinition`'s `controllers` factory function.
 */
export type ControllersFromFeature<F extends FeatureDefinition<any, any>> =
  F["controllers"] extends (INIT: any, storeApi: any) => infer R
    ? R extends ControllerApi<StateFromFeature<F>>
      ? R
      : {}
    : {};

/**
 * Type for a feature-specific selector hook method.
 * @template TFeatureState The state type of the feature slice.
 */
export type FeatureSelectorMethod<TFeatureState> = <TSelected>(
  selector: (state: TFeatureState) => TSelected,
  equalityFn?: (a: TSelected, b: TSelected) => boolean,
) => TSelected;

/**
 * Represents a single feature slice within the store, combining its state, actions, and controllers.
 * Also includes a feature-specific `select` hook method and a `getState` method.
 * @template F The feature definition.
 */
export type FeatureSlice<F extends FeatureDefinition<any, any>> =
  StateFromFeature<F> &
    ActionsFromFeature<F> &
    ControllersFromFeature<F> & {
      /**
       * Hook to select and subscribe to a part of this feature's state.
       * @param selector A function that takes the feature's state and returns the desired slice/value.
       * @param equalityFn Optional equality function to prevent re-renders (default is referential equality).
       *                   For objects/arrays from the slice, consider using `shallow` from `zustand/shallow`.
       * @returns The selected state.
       */
      select: FeatureSelectorMethod<StateFromFeature<F>>;
      /**
       * Synchronously gets the current full slice for this feature (state, actions, controllers).
       * Useful for accessing state or calling actions/controllers outside of React components.
       * @returns The current full feature slice (FeatureSlice<F>).
       */
      getSlice: () => FeatureSlice<F>;
    };

/**
 * Represents the combined object of all feature slices, forming the main part of the store's state.
 * Each key is a feature name, and its value is the corresponding `FeatureSlice`.
 * @template TFeatures The `FeatureDefinitions` object.
 */
export type CombinedFeatureSlices<TFeatures extends FeatureDefinitions> = {
  [K in keyof TFeatures]: FeatureSlice<TFeatures[K]>;
};

/**
 * Generic type for a selector function that operates on a specific state type.
 * @template S The state type the selector operates on.
 * @template R The return type of the selector.
 */
export type Selector<S, R> = (state: S) => R;

// --- Initialization Pattern Types ---

/**
 * Configuration data provided to the global `store.init()` method.
 * This typically includes authentication tokens, API endpoints, and other app-wide configs.
 * While core fields are optional, applications should extend or type this more strictly
 * if specific parameters are required for their controllers.
 */
export interface InitConfig {
  /** Optional access token for authentication. */
  accessToken?: string;
  /** Optional refresh token for authentication. */
  refreshToken?: string;
  /** Optional user identifier. */
  userId?: string | number;
  /** Optional base URL for API calls. */
  apiUrl?: string;
  /** Allows extending with other dynamic configuration values needed by the application. */
  [key: string]: any;
}

/**
 * The `INIT` object that is made available to features/controllers after global initialization.
 * It contains resolved configuration and authentication data.
 */
export interface INIT_Object {
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly userId?: string | number;
  readonly apiUrl?: string;
  readonly timestamp: number; // Timestamp of when INIT object was created
  readonly [key: string]: any; // Allow access to other dynamic config values
}

/**
 * Custom error class for initialization failures.
 */
export class InitializationError extends Error {
  constructor(
    message: string,
    public readonly featureName?: string,
    public readonly originalError?: any,
  ) {
    super(message);
    this.name = "InitializationError";
    // Set the prototype explicitly to allow instanceof to work correctly
    Object.setPrototypeOf(this, InitializationError.prototype);
  }
}

/**
 * Extends InternalState to include the INIT_Object placeholder once initialized.
 * The actual INIT_Object will be part of the store's state, perhaps under a specific key.
 */
export interface InternalState {
  /** Indicates if the store and all its features have been initialized. */
  _isInitialized: boolean;
  /** Tracks the initialization status of each feature. */
  _featureStates: Record<string, "pending" | "initialized" | "error">;
  /**
   * Internal method to set the initialization status of a specific feature.
   * @param featureName The name of the feature.
   * @param status The new initialization status.
   */
  _setFeatureState: (
    featureName: string,
    status: "pending" | "initialized" | "error",
  ) => void;
  /**
   * Internal method to set the overall initialization status of the store.
   * @param isInitialized The new initialization status.
   */
  _setInitialized: (isInitialized: boolean) => void;
  /** Holds the globally initialized INIT_Object. Undefined until store.init() is called. */
  _INIT?: INIT_Object;
  /**
   * Indicates whether the global initialization method has been called.
   * This is used to prevent multiple calls to the global initialization method.
   */
  _globalInitCalled?: boolean;
}

/**
 * Represents the fully constructed feature store instance returned by `createFeatureStore`.
 * It extends the base Zustand `UseBoundStore` (making it a hook for React) and adds:
 * - Direct properties for each defined feature slice, allowing access to feature-specific state, actions, and controllers.
 *   (e.g., `store.user.getState()`, `store.cart.addItem(...)`).
 * - A global `init` method for asynchronous application-wide initialization.
 * - An `onInitialized` promise that resolves when the store and all its features (including async setup) are ready.
 *
 * @template TFeatures - An object type defining the features in the store, matching the input to `createFeatureStore`.
 * @see createFeatureStore
 * @see FeatureSlice
 * @see UseBoundStore
 */
export type FeatureStore<TFeatures extends FeatureDefinitions> = UseBoundStore<
  StoreApi<CombinedFeatureSlices<TFeatures> & InternalState>
> & {
  /**
   * Initializes the store with global configuration, such as authentication tokens or API endpoints.
   * This method should typically be called once when the application starts and has the necessary
   * configuration data available. It facilitates the creation of an `INIT_Object` which is then
   * passed to feature controllers that depend on global configuration.
   *
   * Calling this method is crucial for features that have `waitForGlobalInit: true` in their `featureOptions`,
   * as their controllers will only be instantiated after this `init` method completes.
   *
   * The method is idempotent in effect if called multiple times with identical config, but will throw
   * an `InitializationError` if an attempt is made to call it while a previous call is still in progress
   * or if it's called after the store has already been marked as globally initialized by a previous call.
   * (Note: current implementation error is simpler, `_globalInitCalled` flag)
   *
   * @param {InitConfig} config - The global initialization configuration object.
   * @returns {Promise<INIT_Object>} A promise that resolves with the created `INIT_Object`,
   *   making it available for chaining or further setup if needed.
   * @throws {InitializationError} if the store's global init has already been called.
   */
  init: (config: InitConfig) => Promise<INIT_Object>;
  /**
   * A promise that resolves when the store and all its constituent features have completed their
   * initial asynchronous setup. This includes:
   * - Loading and applying any persisted state (if persistence is enabled).
   * - Resolution of all feature-specific `init()` methods defined in `FeatureDefinition`.
   *
   * This promise can be awaited to ensure that the store is fully ready before performing actions
   * that depend on complete state hydration or feature readiness (e.g., rendering initial UI,
   * dispatching initial data-dependent actions).
   * Note: If `store.init()` is also used for global initialization, `onInitialized` resolving does not necessarily
   * mean `store.init()` has completed. They are separate lifecycle events, though `store.init()` itself
   * ensures persistence is loaded before it proceeds.
   */
  onInitialized: Promise<void>;
  // The intersection `& CombinedFeatureSlices<TFeatures>` is implied by how createFeatureStore constructs
  // and returns the store, directly attaching feature slices. This makes store.featureName accessible.
  // However, explicitly adding it to the type here can be complex due to how UseBoundStore works.
  // The current structure relies on `createFeatureStore` correctly augmenting the hook.
} & Partial<CombinedFeatureSlices<TFeatures>>; // Add this to hint at direct feature access, though actual type is more dynamic.

/**
 * Configuration object required by the `createFeatureStore` function to set up a new feature store.
 * It consists of the feature definitions and optional global store configurations.
 *
 * @template TFeatures - An object type where keys are feature names and values are `FeatureDefinition`s.
 *                     This defines the shape and behavior of all features in the store.
 * @see createFeatureStore
 * @see FeatureDefinitions
 * @see StoreOptions
 */
export interface FeatureStoreConfig<TFeatures extends FeatureDefinitions> {
  /**
   * Optional global configurations for the store.
   * These settings apply to the entire store and control aspects like its name for devtools,
   * persistence behavior, logging, and Redux DevTools integration.
   * If omitted, default options will be applied (e.g., devtools enabled in development).
   * @see StoreOptions for detailed configuration options.
   */
  options?: StoreOptions;
  /**
   * The definitions of all features to be included in the store.
   * This is a map where each key is a unique feature name (string) and the value is a `FeatureDefinition`
   * object describing the feature's initial state, actions, controllers, and initialization logic.
   * @see FeatureDefinition
   * @example
   * const features = {
   *   user: { initialState: { name: null }, actions: (set) => ({ setName: (name) => set({ name }) }) },
   *   cart: { initialState: { items: [] }, actions: (set) => ({ addItem: (item) => set(s => ({ items: [...s.items, item] })) }) }
   * };
   */
  features: TFeatures;
}

// --- Async Operation Utilities ---

/** Represents the result of an asynchronous operation, which can be data or an error. */
export type AsyncResult<TData, TError = Error> =
  | { data: TData; error?: undefined; isLoading: false }
  | { data?: undefined; error: TError; isLoading: false }
  | { data?: undefined; error?: undefined; isLoading: true };

/** Helper to create a pending async result. */
export function pendingResult<TData, TError = Error>(): AsyncResult<
  TData,
  TError
> {
  return { isLoading: true };
}

/** Helper to create a success async result. */
export function successResult<TData, TError = Error>(
  data: TData,
): AsyncResult<TData, TError> {
  return { data, isLoading: false };
}

/** Helper to create an error async result. */
export function errorResult<TData, TError = Error>(
  error: TError,
): AsyncResult<TData, TError> {
  return { error, isLoading: false };
}
