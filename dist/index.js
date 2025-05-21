'use strict';

var zustand = require('zustand');

const trackedConnections = /* @__PURE__ */ new Map();
const getTrackedConnectionState = (name) => {
  const api = trackedConnections.get(name);
  if (!api) return {};
  return Object.fromEntries(
    Object.entries(api.stores).map(([key, api2]) => [key, api2.getState()])
  );
};
const extractConnectionInformation = (store, extensionConnector, options) => {
  if (store === void 0) {
    return {
      type: "untracked",
      connection: extensionConnector.connect(options)
    };
  }
  const existingConnection = trackedConnections.get(options.name);
  if (existingConnection) {
    return { type: "tracked", store, ...existingConnection };
  }
  const newConnection = {
    connection: extensionConnector.connect(options),
    stores: {}
  };
  trackedConnections.set(options.name, newConnection);
  return { type: "tracked", store, ...newConnection };
};
const devtoolsImpl = (fn, devtoolsOptions = {}) => (set, get, api) => {
  const { enabled, anonymousActionType, store, ...options } = devtoolsOptions;
  let extensionConnector;
  try {
    extensionConnector = (enabled != null ? enabled : (undefined ? undefined.MODE : void 0) !== "production") && window.__REDUX_DEVTOOLS_EXTENSION__;
  } catch (_e) {
  }
  if (!extensionConnector) {
    if ((undefined ? undefined.MODE : void 0) !== "production" && enabled) {
      console.warn(
        "[zustand devtools middleware] Please install/enable Redux devtools extension"
      );
    }
    return fn(set, get, api);
  }
  const { connection, ...connectionInformation } = extractConnectionInformation(store, extensionConnector, options);
  let isRecording = true;
  api.setState = (state, replace, nameOrAction) => {
    const r = set(state, replace);
    if (!isRecording) return r;
    const action = nameOrAction === void 0 ? { type: anonymousActionType || "anonymous" } : typeof nameOrAction === "string" ? { type: nameOrAction } : nameOrAction;
    if (store === void 0) {
      connection == null ? void 0 : connection.send(action, get());
      return r;
    }
    connection == null ? void 0 : connection.send(
      {
        ...action,
        type: `${store}/${action.type}`
      },
      {
        ...getTrackedConnectionState(options.name),
        [store]: api.getState()
      }
    );
    return r;
  };
  const setStateFromDevtools = (...a) => {
    const originalIsRecording = isRecording;
    isRecording = false;
    set(...a);
    isRecording = originalIsRecording;
  };
  const initialState = fn(api.setState, get, api);
  if (connectionInformation.type === "untracked") {
    connection == null ? void 0 : connection.init(initialState);
  } else {
    connectionInformation.stores[connectionInformation.store] = api;
    connection == null ? void 0 : connection.init(
      Object.fromEntries(
        Object.entries(connectionInformation.stores).map(([key, store2]) => [
          key,
          key === connectionInformation.store ? initialState : store2.getState()
        ])
      )
    );
  }
  if (api.dispatchFromDevtools && typeof api.dispatch === "function") {
    let didWarnAboutReservedActionType = false;
    const originalDispatch = api.dispatch;
    api.dispatch = (...a) => {
      if ((undefined ? undefined.MODE : void 0) !== "production" && a[0].type === "__setState" && !didWarnAboutReservedActionType) {
        console.warn(
          '[zustand devtools middleware] "__setState" action type is reserved to set state from the devtools. Avoid using it.'
        );
        didWarnAboutReservedActionType = true;
      }
      originalDispatch(...a);
    };
  }
  connection.subscribe((message) => {
    var _a;
    switch (message.type) {
      case "ACTION":
        if (typeof message.payload !== "string") {
          console.error(
            "[zustand devtools middleware] Unsupported action format"
          );
          return;
        }
        return parseJsonThen(
          message.payload,
          (action) => {
            if (action.type === "__setState") {
              if (store === void 0) {
                setStateFromDevtools(action.state);
                return;
              }
              if (Object.keys(action.state).length !== 1) {
                console.error(
                  `
                    [zustand devtools middleware] Unsupported __setState action format. 
                    When using 'store' option in devtools(), the 'state' should have only one key, which is a value of 'store' that was passed in devtools(),
                    and value of this only key should be a state object. Example: { "type": "__setState", "state": { "abc123Store": { "foo": "bar" } } }
                    `
                );
              }
              const stateFromDevtools = action.state[store];
              if (stateFromDevtools === void 0 || stateFromDevtools === null) {
                return;
              }
              if (JSON.stringify(api.getState()) !== JSON.stringify(stateFromDevtools)) {
                setStateFromDevtools(stateFromDevtools);
              }
              return;
            }
            if (!api.dispatchFromDevtools) return;
            if (typeof api.dispatch !== "function") return;
            api.dispatch(action);
          }
        );
      case "DISPATCH":
        switch (message.payload.type) {
          case "RESET":
            setStateFromDevtools(initialState);
            if (store === void 0) {
              return connection == null ? void 0 : connection.init(api.getState());
            }
            return connection == null ? void 0 : connection.init(getTrackedConnectionState(options.name));
          case "COMMIT":
            if (store === void 0) {
              connection == null ? void 0 : connection.init(api.getState());
              return;
            }
            return connection == null ? void 0 : connection.init(getTrackedConnectionState(options.name));
          case "ROLLBACK":
            return parseJsonThen(message.state, (state) => {
              if (store === void 0) {
                setStateFromDevtools(state);
                connection == null ? void 0 : connection.init(api.getState());
                return;
              }
              setStateFromDevtools(state[store]);
              connection == null ? void 0 : connection.init(getTrackedConnectionState(options.name));
            });
          case "JUMP_TO_STATE":
          case "JUMP_TO_ACTION":
            return parseJsonThen(message.state, (state) => {
              if (store === void 0) {
                setStateFromDevtools(state);
                return;
              }
              if (JSON.stringify(api.getState()) !== JSON.stringify(state[store])) {
                setStateFromDevtools(state[store]);
              }
            });
          case "IMPORT_STATE": {
            const { nextLiftedState } = message.payload;
            const lastComputedState = (_a = nextLiftedState.computedStates.slice(-1)[0]) == null ? void 0 : _a.state;
            if (!lastComputedState) return;
            if (store === void 0) {
              setStateFromDevtools(lastComputedState);
            } else {
              setStateFromDevtools(lastComputedState[store]);
            }
            connection == null ? void 0 : connection.send(
              null,
              // FIXME no-any
              nextLiftedState
            );
            return;
          }
          case "PAUSE_RECORDING":
            return isRecording = !isRecording;
        }
        return;
    }
  });
  return initialState;
};
const devtools = devtoolsImpl;
const parseJsonThen = (stringified, f) => {
  let parsed;
  try {
    parsed = JSON.parse(stringified);
  } catch (e) {
    console.error(
      "[zustand devtools middleware] Could not parse the received json",
      e
    );
  }
  if (parsed !== void 0) f(parsed);
};

function createFeatureStore(config) {
    const { options = {}, features } = config;
    const reservedKeys = [
        "_isInitialized",
        "_featureStates",
        "_setFeatureState",
        "_setInitialized",
        "getState",
        "setState",
        "subscribe",
        "destroy",
    ];
    // Define the state creator function with explicit types for set and get
    const stateCreator = (set, get) => {
        const featureSlices = {};
        for (const featureName in features) {
            if (Object.prototype.hasOwnProperty.call(features, featureName)) {
                if (reservedKeys.includes(featureName)) {
                    console.warn(`Feature name "${featureName}" is a reserved key and will be ignored. Please choose a different name.`);
                    continue;
                }
                if (featureSlices.hasOwnProperty(featureName)) {
                    console.warn(`Duplicate feature name "${featureName}" detected. Definitions might be overwritten if not careful in feature object construction.`);
                }
                const feature = features[featureName];
                const featureInitialState = feature.initialState;
                let featureActions = {};
                if (feature.actions) {
                    const featureSet = (updater) => {
                        const currentFullState = get();
                        const oldFeatureSlice = currentFullState[featureName]; // Get the whole slice
                        const newPartialStateForFeature = typeof updater === "function"
                            ? updater(oldFeatureSlice)
                            : updater;
                        // Create the updated feature slice by merging old state and new partial state
                        const updatedFeatureSlice = {
                            ...oldFeatureSlice, // Spread existing slice (state and actions)
                            ...newPartialStateForFeature, // Override with new state parts
                        };
                        set({ [featureName]: updatedFeatureSlice });
                    };
                    const featureGet = () => get()[featureName];
                    featureActions = feature.actions(featureSet, featureGet);
                }
                featureSlices[featureName] = {
                    ...featureInitialState,
                    ...featureActions,
                };
            }
        }
        // Define InternalState with its methods included
        const internalStatePart = {
            _isInitialized: false,
            _featureStates: Object.keys(features).reduce((acc, key) => {
                if (!reservedKeys.includes(key))
                    acc[key] = "pending";
                return acc;
            }, {}),
            _setFeatureState: (fn, status) => {
                set((state) => ({
                    _featureStates: { ...state._featureStates, [fn]: status },
                }));
            },
            _setInitialized: (isInit) => {
                set({ _isInitialized: isInit });
            },
        };
        return {
            ...featureSlices,
            ...internalStatePart,
        };
    };
    const store = zustand.create()(devtools(stateCreator, options.name
        ? { name: `FeatureStore_${options.name}` }
        : { name: "FeatureStore" }));
    // Placeholder for future async initialization logic
    // store.getState()._setInitialized(true);
    // Object.keys(features).forEach(featureName => {
    //   if (!reservedKeys.includes(featureName)) {
    //     store.getState()._setFeatureState(featureName, 'initialized');
    //   }
    // });
    return store;
}

exports.createFeatureStore = createFeatureStore;
//# sourceMappingURL=index.js.map
