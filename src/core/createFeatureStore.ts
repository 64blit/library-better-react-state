import { create, StateCreator, StoreApi } from "zustand"; // Keep StoreApi
import { devtools, DevtoolsOptions, NamedSet } from "zustand/middleware"; // Removed NamedSet as it's not directly used here and might cause confusion
import { shallow } from "zustand/shallow"; // Import shallow for default equality
import { getConfig as getLibraryConfig } from "../config"; // Import library config getter
import { debugMiddleware } from "./debugMiddleware"; // Import debug middleware
import {
  FeatureStoreConfig,
  FeatureDefinitions,
  InternalState,
  FeatureStore,
  CombinedFeatureSlices,
  StateFromFeature,
  ActionsFromFeature,
  FeatureSlice,
  StoreOptions,
  InitConfig,
  INIT_Object,
  InitializationError,
  ControllerApi,
  ControllerMethod,
} from "./types";
import { Logger } from "../utils/Logger"; // Added Logger import
import { PersistenceLayer } from "../persistence/PersistenceLayer";
import { PersistenceOptions } from "../persistence/PersistenceOptions"; // For type checking options

/**
 * Creates a feature-based Zustand store with modularized state and actions.
 *
 * This function is the main entry point for setting up a store managed by this library.
 * It takes a configuration object defining features (state, actions, controllers, async initialization)
 * and global store options (name, devtools, persistence, logging).
 *
 * Each feature defined in the `config.features` object becomes a top-level property on the store,
 * providing access to its state, actions, and controller methods. These feature slices are isolated
 * but can be composed and interacted with through the store.
 *
 * The store also provides global methods:
 * - `init(config)`: For asynchronous global initialization (e.g., auth tokens, API endpoints).
 *   This makes an `INIT_Object` available to feature controllers.
 * - `onInitialized`: A Promise that resolves when the store, including asynchronous
 *   feature initializations and persistence loading, is ready.
 *
 * Middleware like Redux DevTools and a custom debug logger are applied based on options
 * and environment (DevTools default to on in development).
 *
 * Persistence can be configured globally via `config.options.persistence` to automatically
 * load and save store state using various storage adapters (with code-splitting for adapters).
 *
 * @template TFeatures - An object type where keys are feature names and values are `FeatureDefinition`s.
 * @param {FeatureStoreConfig<TFeatures>} config - The configuration object for the store.
 *   - `features`: An object defining all the features to be included in the store.
 *   - `options`: Optional global configurations for the store (name, devtools, persistence, etc.).
 * @returns {FeatureStore<TFeatures>} The created feature store instance.
 *   This instance is a Zustand store augmented with direct access to feature slices
 *   and the global `init` and `onInitialized` methods.
 */
export function createFeatureStore<TFeatures extends FeatureDefinitions>(
  config: FeatureStoreConfig<TFeatures>,
): FeatureStore<TFeatures> {
  const storeCreationStartTime = performance.now(); // Start timing store creation

  const isDevelopment =
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "development";

  // Define default options, logger is simplified for now
  const defaultStoreOptions: StoreOptions = {
    name: "DefaultFeatureStore",
    devtools: isDevelopment,
    // logger: isDevelopment ? console.debug : false, // Logger simplified
  };

  const mergedOptions: StoreOptions = {
    ...defaultStoreOptions,
    ...config.options,
  };
  // Ensure devtools can be explicitly re-disabled
  if (config.options?.devtools === false) mergedOptions.devtools = false;
  // if (config.options?.logger === false) mergedOptions.logger = false; // Logger simplified

  const { features } = config;
  const storeNameForDevtools = mergedOptions.name || "FeatureStore";
  const reservedKeys = [
    "_isInitialized",
    "_featureStates",
    "_setFeatureState",
    "_setInitialized",
    "getState",
    "setState",
    "subscribe",
    "destroy",
    "onInitialized",
    "init",
  ];

  // Type for the store before it's fully wrapped for export (i.e., the StoreApi)
  type FullStoreState = CombinedFeatureSlices<TFeatures> & InternalState;

  // --- Persistence Layer Setup ---
  let storePersistenceLayer: PersistenceLayer<Partial<FullStoreState>> | undefined;
  let persistenceInitializationPromise: Promise<void> = Promise.resolve();

  if (mergedOptions.persistence && mergedOptions.persistence.enabled) {
    // Type assertion for mergedOptions.persistence as it's optional in StoreOptions
    const persistenceOptions = mergedOptions.persistence as Required<PersistenceOptions>;
    
    // Use storeNameForDevtools or a specific persistence key from options if available
    const persistenceFeatureKey = persistenceOptions.keyPrefix || storeNameForDevtools;

    storePersistenceLayer = new PersistenceLayer<Partial<FullStoreState>>(
      persistenceFeatureKey, // Using a general key for the whole store persistence
      persistenceOptions,
    );

    persistenceInitializationPromise = storePersistenceLayer.initializeStorageAdapter()
      .then(() => storePersistenceLayer!.load()) // storePersistenceLayer will be defined here
      .then(loadedState => {
        if (loadedState && storeApi) { // storeApi might not be defined yet when this promise chain is set up
          // We need to apply this loadedState after storeApi is created.
          // This will be handled after storeApi creation.
          // For now, this promise resolves when loading is done.
        }
      })
      .catch(error => {
        console.error("Error initializing or loading persisted state:", error);
        // Decide if this should prevent store initialization or just log.
      });
  }

  const baseStateCreator: StateCreator<FullStoreState, [], []> = (set, get, api) => {
    const featureSlices = {} as CombinedFeatureSlices<TFeatures>;

    for (const featureNameKey in features) {
      const featureName = featureNameKey as string; // Assuming feature keys are strings
      if (Object.prototype.hasOwnProperty.call(features, featureName)) {
        if (reservedKeys.includes(featureName)) {
          console.warn(`Feature name "${featureName}" is a reserved key.`);
          continue;
        }
        if (featureSlices.hasOwnProperty(featureName)) {
          console.warn(`Duplicate feature name "${featureName}".`);
        }

        const feature = features[featureName as keyof TFeatures];
        type CurrentFeatureState = StateFromFeature<typeof feature>;
        type CurrentFeatureActionsObject = ActionsFromFeature<typeof feature>;
        const featureInitialState = feature.initialState;
        let featureActions: CurrentFeatureActionsObject =
          {} as CurrentFeatureActionsObject;

        if (feature.actions) {
          const featureSet = (
            updater:
              | Partial<CurrentFeatureState>
              | ((state: CurrentFeatureState) => Partial<CurrentFeatureState>),
          ) => {
            const oldFullState = get();
            const oldFeatureSlice = oldFullState[
              featureName as keyof CombinedFeatureSlices<TFeatures>
            ] as FeatureSlice<typeof feature>;
            const newPartialStateForFeature =
              typeof updater === "function"
                ? (
                    updater as (
                      state: CurrentFeatureState,
                    ) => Partial<CurrentFeatureState>
                  )(oldFeatureSlice as CurrentFeatureState)
                : updater;
            const updatedFeatureSlice = {
              ...oldFeatureSlice,
              ...newPartialStateForFeature,
            };
            // Always use 2-argument set. Action naming is middleware's job.
            set({ [featureName]: updatedFeatureSlice } as any);
          };
          const featureGet = () =>
            get()[
              featureName as keyof CombinedFeatureSlices<TFeatures>
            ] as FeatureSlice<typeof feature> as CurrentFeatureState;
          featureActions = feature.actions(
            featureSet,
            featureGet,
          ) as CurrentFeatureActionsObject;
        }
        (featureSlices as any)[featureName] = {
          ...featureInitialState,
          ...featureActions,
        };
      }
    }

    const internalStatePart: InternalState = {
      _isInitialized: false,
      _featureStates: Object.keys(features).reduce(
        (acc, key) => {
          if (!reservedKeys.includes(key)) acc[key] = "pending";
          return acc;
        },
        {} as Record<string, "pending" | "initialized" | "error">,
      ),
      _globalInitCalled: false,
      _INIT: undefined,
      _setFeatureState: (fn, status) => {
        set({
          _featureStates: { ...get()._featureStates, [fn]: status },
        } as Partial<FullStoreState>);
      },
      _setInitialized: (isInit) => {
        set({ _isInitialized: isInit } as Partial<FullStoreState>);
      },
    };

    return {
      ...featureSlices,
      ...internalStatePart,
    } as CombinedFeatureSlices<TFeatures> & InternalState;
  };

  // Initial state creator
  let creatorStep: StateCreator<FullStoreState, [], []> = baseStateCreator;
  const libConfig = getLibraryConfig();

  // Apply debugMiddleware if enabled *before* devtools
  if (libConfig.debugMode) {
    creatorStep = debugMiddleware(creatorStep, storeNameForDevtools); // This should maintain StateCreator<FullStoreState, [], []>
  }

  // Apply devtools middleware if enabled
  let storeHookAndApi_storeHook;

  if (mergedOptions.devtools !== false) {
    const devtoolsActualOptions: DevtoolsOptions =
      typeof mergedOptions.devtools === "object"
        ? mergedOptions.devtools
        : { name: storeNameForDevtools };
    if (!devtoolsActualOptions.name) {
      devtoolsActualOptions.name = storeNameForDevtools;
    }
    // devtools will receive a StateCreator<FullStoreState, [], []> and return one
    // (or one with devtools-specific middleware types, which create() handles)
    const devtoolsAppliedCreator = devtools(creatorStep, devtoolsActualOptions);
    storeHookAndApi_storeHook = create(devtoolsAppliedCreator);
  } else {
    storeHookAndApi_storeHook = create(creatorStep);
  }

  // The storeHook is a UseBoundStore, which also fulfills the StoreApi contract for core methods.
  const storeApi = storeHookAndApi_storeHook as StoreApi<FullStoreState>; 

  // --- Apply Persisted State and Setup Autosave ---
  // This needs to happen after storeApi is created.
  // We have persistenceInitializationPromise which loads the state.
  // Let's make a new promise that chains this correctly.
  
  const allInitialSetupPromise = persistenceInitializationPromise.then(async () => {
    if (storePersistenceLayer && storePersistenceLayer.options && storePersistenceLayer.options.enabled) { // Recheck options from layer
      const loadedState = await storePersistenceLayer.load(); // Load again, or use state from initial promise
      if (loadedState) {
        storeApi.setState(loadedState as Partial<FullStoreState>, true); // Replace state with loaded
      }
      // Setup auto-save
      if (storePersistenceLayer.options.autoSave) {
        storePersistenceLayer.setupAutoSave(storeApi.subscribe);
      }
    }
  }).catch(error => {
      console.error("Error applying persisted state or setting up autosave:", error);
  });

  // --- Attach select methods to feature slices ---
  // This is done after store creation. The feature slices in the store state
  // are initially just state + actions + controllers. We augment them here.
  const stateForAugmentation = storeApi.getState();
  for (const featureNameKey in features) {
    const featureName = featureNameKey as keyof TFeatures;
    const featureNameStr = String(featureName);
    if (
      Object.prototype.hasOwnProperty.call(features, featureNameStr) &&
      !reservedKeys.includes(featureNameStr)
    ) {
      const featureDefinition = features[featureName];
      type CurrentFeatureState = StateFromFeature<typeof featureDefinition>;

      if (stateForAugmentation[featureName]) {
        const featureSliceObject = stateForAugmentation[
          featureName
        ] as FeatureSlice<typeof featureDefinition>;

        (featureSliceObject as any).select = <TSelected>(
          selector: (state: CurrentFeatureState) => TSelected,
          equalityFn?: (a: TSelected, b: TSelected) => boolean,
        ): TSelected => {
          return storeHookAndApi_storeHook(
            (fullState) =>
              selector(fullState[featureName] as any as CurrentFeatureState),
            equalityFn || shallow,
          );
        };

        delete (featureSliceObject as any).getFeatureState;
        (featureSliceObject as any).getSlice = (): FeatureSlice<
          typeof featureDefinition
        > => {
          return storeApi.getState()[featureName] as FeatureSlice<
            typeof featureDefinition
          >;
        };
      }
    }
  }
  // Note: This direct augmentation of state objects is generally not recommended for Zustand.
  // A cleaner pattern might be to have select utilities separate from the store state itself,
  // or make feature slices class instances if they need methods.
  // However, for a `store.feature.select()` API, this is one way.

  // --- onInitialized Promise Setup ---
  let _onInitializedPromiseResolve!: () => void;
  const onInitializedPromise = new Promise<void>((resolve) => {
    _onInitializedPromiseResolve = resolve;
  });

  const originalSubscribeAndResolve = () => {
    const unsub = storeApi.subscribe((state, prevState) => {
      if (state._isInitialized && !prevState._isInitialized) {
        if (_onInitializedPromiseResolve) _onInitializedPromiseResolve();
        unsub();
      }
    });
  };
  
  // Ensure all async setup (including persistence) is done before resolving onInitialized
  // and before globalInit might proceed if it depends on onInitialized.
  // The feature.init promises also need to be considered.

  // --- Global Init Method ---
  async function initializeControllersDependentOnINIT<
    TFeatures extends FeatureDefinitions,
  >(
    INIT: INIT_Object,
    currentStoreApi: StoreApi<CombinedFeatureSlices<TFeatures> & InternalState>,
    allFeatures: TFeatures,
    mergedOptions: StoreOptions,
    reservedKeys: string[],
  ) {
    for (const featureNameKey in allFeatures) {
      const featureName = featureNameKey as keyof TFeatures;
      if (
        Object.prototype.hasOwnProperty.call(
          allFeatures,
          featureName as string,
        ) &&
        !reservedKeys.includes(featureName as string)
      ) {
        const featureDefinition = allFeatures[featureName];
        type CurrentFeatureState = StateFromFeature<typeof featureDefinition>;

        const featureOptions = featureDefinition.featureOptions || {};
        const waitForGlobalInit =
          featureOptions.waitForGlobalInit === undefined
            ? true
            : featureOptions.waitForGlobalInit;

        if (featureDefinition.controllers && waitForGlobalInit) {
          try {
            const controllerFactoryOutput = featureDefinition.controllers(
              INIT,
              currentStoreApi as any,
            );
            const wrappedControllerMethods: ControllerApi<CurrentFeatureState> =
              {};

            for (const methodName in controllerFactoryOutput) {
              if (
                Object.prototype.hasOwnProperty.call(
                  controllerFactoryOutput,
                  methodName,
                )
              ) {
                const originalControllerMethod = controllerFactoryOutput[
                  methodName
                ] as ControllerMethod<CurrentFeatureState>;

                (wrappedControllerMethods as any)[methodName] = async (
                  ...args: any[]
                ) => {
                  const currentFullStoreState = currentStoreApi.getState();
                  const featureStateForMethodInput = currentFullStoreState[
                    featureName
                  ] as any as CurrentFeatureState;

                  try {
                    const result = originalControllerMethod(
                      featureStateForMethodInput,
                      ...args,
                    );
                    let finalResult = result;

                    if (result instanceof Promise) {
                      const promiseResult = await result;
                      finalResult = promiseResult;
                      if (promiseResult) {
                        const oldSlice = currentStoreApi.getState()[
                          featureName
                        ] as FeatureSlice<typeof featureDefinition>;
                        currentStoreApi.setState(
                          {
                            [featureName]: { ...oldSlice, ...promiseResult },
                          } as any,
                          false,
                        );
                      }
                    } else if (result) {
                      const oldSlice = currentStoreApi.getState()[
                        featureName
                      ] as FeatureSlice<typeof featureDefinition>;
                      currentStoreApi.setState(
                        { [featureName]: { ...oldSlice, ...result } } as any,
                        false,
                      );
                    }
                    return finalResult;
                  } catch (error) {
                    console.error(
                      `Error in controller method "${String(featureName)}/${methodName}":`,
                      error,
                    );
                    throw error;
                  }
                };
              }
            }

            const currentSlice = currentStoreApi.getState()[featureName];
            currentStoreApi.setState(
              {
                [featureName]: { ...currentSlice, ...wrappedControllerMethods },
              } as any,
              false,
            );
            if (
              mergedOptions.logger &&
              typeof mergedOptions.logger === "function"
            ) {
              mergedOptions.logger({
                type: "controllers_initialized",
                feature: String(featureName),
                nextState: currentStoreApi.getState(),
              });
            }
          } catch (error) {
            console.error(
              `Error initializing controllers for feature "${String(featureName)}":`,
              error,
            );
          }
        }
      }
    }
  }

  const globalInit = async (initConfig: InitConfig): Promise<INIT_Object> => {
    const globalInitStartTime = performance.now(); // Start timing global init
    await allInitialSetupPromise; // Ensure persistence is loaded and applied first

    const state = storeApi.getState();
    if (state._globalInitCalled) {
      throw new InitializationError(
        "Store global init() method has already been called.",
      );
    }
    storeApi.setState({ _globalInitCalled: true } as any); // Simplified cast
    const INIT: INIT_Object = { ...initConfig, timestamp: Date.now() };
    storeApi.setState({ _INIT: INIT } as any); // Simplified cast
    if (mergedOptions.logger && typeof mergedOptions.logger === "function") {
      mergedOptions.logger({
        type: "global_init",
        payload: INIT,
        nextState: storeApi.getState(),
      });
    }

    await initializeControllersDependentOnINIT(
      INIT,
      storeApi,
      features,
      mergedOptions,
      reservedKeys,
    );

    let allFeaturesReported = true;
    const currentFeatureStates = storeApi.getState()._featureStates;
    // Iterate with featureNameKey which is keyof TFeatures
    for (const featureNameKey of Object.keys(features) as Array<keyof TFeatures>) {
      const featureNameStr = String(featureNameKey); // Use this for string operations

      if (Object.prototype.hasOwnProperty.call(features, featureNameKey)) { // Check ownership using the key
        const featureDef = features[featureNameKey]; // Access using the typed key

        if (!reservedKeys.includes(featureNameStr)) {
          if (!currentFeatureStates[featureNameStr] || currentFeatureStates[featureNameStr] === "pending") {
            // Access .init from the correctly typed featureDef
            if (featureDef.init && currentFeatureStates[featureNameStr] === "pending") {
              console.warn(
                `Feature "${featureNameStr}" still pending after global init. Store may not be fully ready.`,
              );
              allFeaturesReported = false; 
              break; 
            }
          }
        }
      }
    }
    if (allFeaturesReported) {
      storeApi.getState()._setInitialized(true);
    } else {
      // If features are still pending, we might not be fully "initialized" yet.
      // The onInitialized promise resolves based on _isInitialized.
      // For now, if globalInit is called, we mark as initialized for controller purposes,
      // but log a warning.
      console.warn("Global init complete, but some features may still be pending. Store._isInitialized is being set to true.");
      storeApi.getState()._setInitialized(true); 
    }

    const globalInitEndTime = performance.now(); // End timing global init
    if (getLibraryConfig().debugMode) {
      Logger.debug(`[${storeNameForDevtools}] Global init took ${(globalInitEndTime - globalInitStartTime).toFixed(2)}ms`);
    }
    return INIT;
  };
  (storeApi as any).init = globalInit;
  (storeApi as any).onInitialized = onInitializedPromise;

  // --- Feature Level Async Initialization (during store object creation) ---
  const featureInitPromises: Promise<void>[] = [];
  Object.keys(features).forEach((featureNameString) => {
    if (
      Object.prototype.hasOwnProperty.call(features, featureNameString) &&
      !reservedKeys.includes(featureNameString)
    ) {
      const feature = features[featureNameString];
      storeApi.getState()._setFeatureState(featureNameString, "pending");
      if (feature.init) {
        const featureInitStartTime = performance.now(); // Start timing feature init
        const initPromise = feature
          .init(storeApi as any, featureNameString)
          .then(() => {
            storeApi.getState()._setFeatureState(featureNameString, "initialized");
            const featureInitEndTime = performance.now(); // End timing feature init
            if (getLibraryConfig().debugMode) {
              Logger.debug(`[${storeNameForDevtools}] Feature "${featureNameString}" init took ${(featureInitEndTime - featureInitStartTime).toFixed(2)}ms`);
            }
          })
          .catch((error) => {
            console.error(
              `Error during feature.init for "${featureNameString}":`,
              error,
            );
            storeApi.getState()._setFeatureState(featureNameString, "error");
          });
        featureInitPromises.push(initPromise);
      } else {
        storeApi.getState()._setFeatureState(featureNameString, "initialized");
      }
    }
  });

  // Chain all promises: persistence, then feature inits, then resolve onInitialized
  // Note: globalInit is a callable method, not necessarily part of this auto-init sequence unless called.
  // onInitialized should reflect readiness for user interaction post-config and auto-loading.

  Promise.allSettled([allInitialSetupPromise, ...featureInitPromises]).then(() => {
    // At this point, persistence (if enabled) has been loaded/applied,
    // and all feature.init() calls have settled.
    // Now, check if the store should be marked as _isInitialized if globalInit wasn't the trigger.
    // This depends on whether globalInit is mandatory for the store to be considered "ready".
    // The current logic in globalInit sets _isInitialized.
    // If globalInit is NOT called, and all feature.init are done, and persistence is loaded,
    // should the store be _isInitialized?
    // The current onInitialized promise resolves when _isInitialized is true.
    // Let globalInit be the primary method to set _isInitialized=true.
    // If globalInit is never called, onInitialized might never resolve with current logic.

    // This needs to be rethought: onInitialized should resolve when the store is ready
    // after createFeatureStore() call completes, including auto-loaded persistence and feature.init.
    // If globalInit() is a separate step, then _isInitialized might be set true earlier.
    
    // Let's simplify: onInitialized resolves after persistence and all feature.init are done.
    // If globalInit also does things, it needs to be awaited separately if its completion is required.
    // The _isInitialized flag might then be set by this Promise.allSettled completion.

    const currentState = storeApi.getState();
    if (!currentState._isInitialized) { // Only set if not already set by globalInit
        let allFeaturesTrulyDone = true;
        const featureStateKeys = Object.keys(currentState._featureStates); // Get string keys
        for (const key of featureStateKeys) { // Iterate over string keys
            if (currentState._featureStates[key] === 'pending') {
                allFeaturesTrulyDone = false;
                break;
            }
        }
        if (allFeaturesTrulyDone) {
           // This means all feature.init (if any) completed, and persistence (if any) loaded.
           // This is a good point to consider the core store "initialized" from its own setup.
           currentState._setInitialized(true);
        } else {
            console.warn("Store created, persistence/feature.init settled, but some features still pending/error. Store not marked _isInitialized automatically.");
        }
    }
    originalSubscribeAndResolve(); // Start listening for _isInitialized changes to resolve the user's promise.
                                   // If already true, it will resolve immediately.
  });

  const augmentedStore = storeHookAndApi_storeHook as any;
  // Augment storeHook with feature slices (after potential rehydration)
  const finalState = storeApi.getState();
  for (const featureNameKey in features) {
    const featureName = featureNameKey as keyof TFeatures;
    const featureNameStr = String(featureName);
    if (Object.prototype.hasOwnProperty.call(features, featureNameStr) && !reservedKeys.includes(featureNameStr)) {
      const featureDefinition = features[featureName];
      if (finalState[featureName]) {
        const featureSliceObject = finalState[featureName] as FeatureSlice<typeof featureDefinition>;
        // Attach select
        (featureSliceObject as any).select = <TSelected>(
          selector: (state: StateFromFeature<typeof featureDefinition>) => TSelected,
          equalityFn?: (a: TSelected, b: TSelected) => boolean,
        ): TSelected => {
          return storeHookAndApi_storeHook(
            (fullState: FullStoreState) => selector(fullState[featureName] as any),
            equalityFn || shallow,
          );
        };
        // Attach getSlice
        (featureSliceObject as any).getSlice = (): FeatureSlice<typeof featureDefinition> => {
          return storeApi.getState()[featureName] as FeatureSlice<typeof featureDefinition>;
        };
        // Assign to augmentedStore
        augmentedStore[featureNameStr] = featureSliceObject;
      } else {
         // This case should ideally not happen if baseStateCreator sets up all feature slices
         console.warn(`Feature slice ${featureNameStr} not found in state for augmentation.`);
         // Initialize with an empty object and methods if necessary, or ensure baseStateCreator is robust
         augmentedStore[featureNameStr] = {
            select: () => { throw new Error(`Feature ${featureNameStr} not fully initialized for select.`); },
            getSlice: () => { throw new Error(`Feature ${featureNameStr} not fully initialized for getSlice.`); }
         };
      }
    }
  }

  const storeCreationEndTime = performance.now(); // End timing store creation
  const storeCreationDuration = storeCreationEndTime - storeCreationStartTime;
  if (getLibraryConfig().debugMode) {
    Logger.debug(`[${storeNameForDevtools}] Store creation took ${storeCreationDuration.toFixed(2)}ms`);
  }

  return augmentedStore as FeatureStore<TFeatures>;
}
