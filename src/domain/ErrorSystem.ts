import { DomainError } from "./DomainError";
import { handleError, ErrorHandlingOptions } from "./ErrorHandling";
import { Logger } from "../utils/Logger";
import { getConfig } from "../config"; // Import global config

// Type for error handlers
type ErrorHandler = (error: Error) => void;

/**
 * Configuration options for the ErrorSystem
 */
export interface ErrorSystemConfig {
  /**
   * Whether to automatically capture and log unhandled exceptions
   */
  captureGlobalErrors?: boolean;
  
  /**
   * Log level to use for errors (already handled by Logger methods)
   */
  // logLevel?: "error" | "warn" | "log"; // Keep for potential future use but Logger handles levels
  
  /**
   * Whether to include stack traces in error logs.
   * If undefined, defaults to the global debugMode setting.
   */
  includeStackTrace?: boolean;
  
  /**
   * Whether to serialize errors to JSON format when logging.
   * If undefined, defaults to the global debugMode setting.
   */
  serializeErrors?: boolean;
  
  /**
   * Custom error handlers that will be called for each error
   */
  customHandlers?: ErrorHandler[];
}

/**
 * Centralized error handling and monitoring system
 */
export class ErrorSystem {
  private static _instance: ErrorSystem;
  private _initialized = false;
  private _globalHandlers: ErrorHandler[] = [];
  private _config: ErrorSystemConfig;
  
  /**
   * Get the singleton ErrorSystem instance
   */
  static get instance(): ErrorSystem {
    if (!ErrorSystem._instance) {
      ErrorSystem._instance = new ErrorSystem();
    }
    return ErrorSystem._instance;
  }
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Initialize config considering global debugMode for defaults
    const globalConfig = getConfig();
    this._config = {
      captureGlobalErrors: true,
      // logLevel: "error", // Logger handles its own level, this could be for filtering reported errors
      includeStackTrace: globalConfig.debugMode,
      serializeErrors: globalConfig.debugMode,
      customHandlers: []
    };
  }
  
  /**
   * Initialize the error system with the provided configuration
   * @param config Configuration options
   */
  initialize(config: Partial<ErrorSystemConfig> = {}): void {
    if (this._initialized) {
      Logger.warn("ErrorSystem already initialized. Call reset() before reinitializing.");
      return;
    }
    
    const globalConfig = getConfig();
    this._config = {
      ...this._config, // Start with current defaults (which includes global checks)
      ...config,      // Override with user-provided config
      // Explicitly set defaults based on globalConfig if not provided by user
      includeStackTrace: config.includeStackTrace !== undefined 
        ? config.includeStackTrace 
        : globalConfig.debugMode,
      serializeErrors: config.serializeErrors !== undefined
        ? config.serializeErrors
        : globalConfig.debugMode,
    };
    
    // Add custom handlers
    if (config.customHandlers) {
      this._globalHandlers.push(...config.customHandlers);
    }
    
    // Set up global error capturing
    if (this._config.captureGlobalErrors) {
      this._setupGlobalErrorHandling();
    }
    
    this._initialized = true;
    Logger.debug("ErrorSystem initialized", this._config); // Use Logger.debug
  }
  
  /**
   * Reset the error system to its default state
   */
  reset(): void {
    // Remove global handlers if added
    if (typeof window !== "undefined") {
      window.removeEventListener("error", this._windowErrorHandler);
      window.removeEventListener("unhandledrejection", this._promiseRejectionHandler);
    } else if (typeof process !== "undefined") {
      process.removeListener("uncaughtException", this._nodeUncaughtExceptionHandler);
      process.removeListener("unhandledRejection", this._nodeUnhandledRejectionHandler);
    }
    
    this._globalHandlers = [];
    const globalConfig = getConfig();
    this._config = {
      captureGlobalErrors: true,
      // logLevel: "error",
      includeStackTrace: globalConfig.debugMode,
      serializeErrors: globalConfig.debugMode,
      customHandlers: []
    };
    this._initialized = false;
    
    Logger.debug("ErrorSystem reset"); // Use Logger.debug
  }
  
  /**
   * Register a global error handler
   * @param handler The error handler function
   * @returns A function to unregister the handler
   */
  registerHandler(handler: ErrorHandler): () => void {
    this._globalHandlers.push(handler);
    
    return () => {
      const index = this._globalHandlers.indexOf(handler);
      if (index !== -1) {
        this._globalHandlers.splice(index, 1);
      }
    };
  }
  
  /**
   * Report an error to the error system
   * @param error The error to report
   * @param options Additional error handling options
   * @returns The processed error
   */
  reportError(error: unknown, options: ErrorHandlingOptions = {}): Error {
    const processedError = handleError(error, {
      ...options,
      rethrow: false // ErrorSystem's reportError should not rethrow by default
    });
    
    // Enhanced logging in debug mode
    const libConfig = getConfig();
    if (libConfig.debugMode) {
      const loggableError = this._config.serializeErrors 
        ? (processedError instanceof DomainError ? processedError.serialize() : { message: processedError.message, stack: processedError.stack })
        : processedError;
      
      if (this._config.includeStackTrace) {
        Logger.debug("Error reported to ErrorSystem:", loggableError, processedError.stack);
      } else {
        Logger.debug("Error reported to ErrorSystem:", loggableError);
      }
    } else {
      // Standard logging (already done by handleError, but we might want a specific ErrorSystem log entry)
      // Logger.error(processedError.message, processedError); // This might be redundant if handleError always logs
    }
    
    // Call all registered handlers
    this._notifyHandlers(processedError);
    
    return processedError;
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): Readonly<ErrorSystemConfig> {
    return { ...this._config };
  }
  
  /**
   * Notify all registered handlers about an error
   */
  private _notifyHandlers(error: Error): void {
    for (const handler of this._globalHandlers) {
      try {
        handler(error);
      } catch (handlerError) {
        // This internal error should always be logged with full severity
        console.error("[CRITICAL][ErrorSystem] Error in custom error handler:", handlerError);
      }
    }
  }
  
  /**
   * Set up global error handling based on the environment
   */
  private _setupGlobalErrorHandling(): void {
    if (typeof window !== "undefined") {
      // Browser environment
      window.addEventListener("error", this._windowErrorHandler);
      window.addEventListener("unhandledrejection", this._promiseRejectionHandler);
    } else if (typeof process !== "undefined") {
      // Node.js environment
      process.on("uncaughtException", this._nodeUncaughtExceptionHandler);
      process.on("unhandledRejection", this._nodeUnhandledRejectionHandler);
    }
  }
  
  /**
   * Browser window error handler
   */
  private _windowErrorHandler = (event: ErrorEvent): void => {
    const error = event.error || new Error(event.message);
    this.reportError(error, {
      message: "Uncaught exception",
      context: {
        source: event.filename,
        line: event.lineno,
        column: event.colno
      }
    });
  };
  
  /**
   * Browser unhandled promise rejection handler
   */
  private _promiseRejectionHandler = (event: PromiseRejectionEvent): void => {
    const reason = event.reason;
    const error = reason instanceof Error 
      ? reason 
      : new Error(`Unhandled promise rejection: ${reason}`);
    
    this.reportError(error, {
      message: "Unhandled promise rejection"
    });
  };
  
  /**
   * Node.js uncaught exception handler
   */
  private _nodeUncaughtExceptionHandler = (error: Error): void => {
    this.reportError(error, {
      message: "Uncaught exception"
    });
  };
  
  /**
   * Node.js unhandled rejection handler
   */
  private _nodeUnhandledRejectionHandler = (reason: any, promise: Promise<any>): void => {
    const error = reason instanceof Error 
      ? reason 
      : new Error(`Unhandled promise rejection: ${reason}`);
    
    this.reportError(error, {
      message: "Unhandled promise rejection"
    });
  };
}

/**
 * Export a default instance for easy importing
 */
export const errorSystem = ErrorSystem.instance;

/**
 * Helper function to report an error to the global error system
 * @param error The error to report
 * @param options Additional error handling options
 * @returns The processed error
 */
export function reportError(error: unknown, options: ErrorHandlingOptions = {}): Error {
  return errorSystem.reportError(error, options);
}

/**
 * Helper function to wrap an async function with global error reporting
 * @param fn The async function to wrap
 * @param options Error handling options
 * @returns A wrapped function that reports errors
 */
export function withGlobalErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ErrorHandlingOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return await fn(...args);
    } catch (error) {
      errorSystem.reportError(error, {
        ...options,
        context: {
          ...(options.context || {}),
          functionName: fn.name,
          arguments: args
        }
      });
      throw error; // Re-throw to allow caller to handle
    }
  };
} 
