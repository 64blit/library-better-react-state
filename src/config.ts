interface LibraryConfig {
  debugMode: boolean;
  // Future configuration options can be added here
}

const defaultConfig: LibraryConfig = {
  debugMode: process.env.NODE_ENV !== 'production',
};

let currentConfig: LibraryConfig = { ...defaultConfig };

/**
 * Configures global options for the state management library.
 *
 * This function allows overriding default library settings, such as `debugMode`.
 * It should typically be called once at the application's entry point before any stores are created.
 *
 * @param {Partial<LibraryConfig>} options - An object containing a subset of library configuration options to override.
 *   - `debugMode` (boolean, optional): Enables or disables debug logging and potentially other development-specific behaviors.
 *     Defaults to true if `process.env.NODE_ENV !== 'production'`, unless explicitly set to `false`.
 */
export function configureLibrary(options?: Partial<LibraryConfig>): void {
  currentConfig = {
    ...defaultConfig,
    ...options,
    // Ensure debugMode is explicitly true if NODE_ENV is not production,
    // unless explicitly overridden to false by the user.
    debugMode: options?.debugMode === false 
                 ? false 
                 : (options?.debugMode || process.env.NODE_ENV !== 'production')
  };
}

/**
 * Retrieves the current global configuration of the state management library.
 *
 * This function returns a read-only snapshot of the active library settings,
 * including any overrides applied via `configureLibrary`.
 *
 * @returns {Readonly<LibraryConfig>} The current library configuration object.
 */
export function getConfig(): Readonly<LibraryConfig> {
  return currentConfig;
}

// Initialize with default config check
configureLibrary(); 
