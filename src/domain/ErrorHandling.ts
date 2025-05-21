import { DomainError } from "./DomainError";
import { Logger } from "../utils/Logger";
import { getConfig } from "../config"; // Import global config

/**
 * Options for error handling functions
 */
export interface ErrorHandlingOptions {
  /**
   * Custom error message to use
   */
  message?: string;
  
  /**
   * Whether to rethrow the error after handling
   */
  rethrow?: boolean;
  
  /**
   * Context information to attach to the error
   */
  context?: Record<string, any>;
  
  /**
   * Custom error code to use when creating domain errors
   */
  errorCode?: string;
  
  /**
   * Function to call for custom error handling
   */
  onError?: (error: Error) => void;
}

/**
 * Wraps an error with a domain error, maintaining the cause chain
 * @param error Original error
 * @param code Error code
 * @param message Error message
 * @param details Additional error details
 * @returns A domain error wrapping the original error
 */
export function wrapError(
  error: unknown,
  code: string,
  message: string,
  details?: Record<string, any>
): DomainError {
  const errorDetails = {
    ...(details || {}),
    cause: error instanceof Error ? error : String(error)
  };
  
  return new DomainError(code, message, errorDetails);
}

/**
 * Extracts the root cause from an error chain
 * @param error The error to unwrap
 * @returns The root cause of the error
 */
export function getRootCause(error: Error): Error {
  // TypeScript doesn't recognize the standard 'cause' property on Error objects yet
  const cause = (error as any).cause || (error as DomainError).details?.cause;
  if (cause && cause instanceof Error) {
    return getRootCause(cause);
  }
  return error;
}

/**
 * Handles an error with standardized logging and optional rethrowing
 * @param error The error to handle
 * @param options Error handling options
 * @returns The handled error, useful for chaining
 */
export function handleError(error: unknown, options: ErrorHandlingOptions = {}): Error {
  const { message, rethrow = false, context = {}, errorCode, onError } = options;
  
  // Convert unknown errors to standard Error objects
  let standardizedError: Error;
  if (error instanceof Error) {
    standardizedError = error;
  } else if (error === null || error === undefined) {
    standardizedError = new Error("Unknown error (null or undefined)");
  } else if (typeof error === "object") {
    standardizedError = new Error(`Unknown error: ${JSON.stringify(error)}`);
  } else {
    standardizedError = new Error(`${error}`);
  }
  
  // Add context as properties to the error object
  Object.entries(context).forEach(([key, value]) => {
    (standardizedError as any)[key] = value;
  });
  
  // Apply custom message if provided
  if (message) {
    if (errorCode && !(standardizedError instanceof DomainError)) {
      standardizedError = wrapError(standardizedError, errorCode, message);
    } else {
      const originalMessage = standardizedError.message;
      standardizedError.message = `${message}${originalMessage ? ` (Caused by: ${originalMessage})` : ''}`;
    }
  }
  
  // Log the error with its stack trace
  Logger.error(standardizedError.message, standardizedError);
  
  // In debug mode, log additional context if available
  const libConfig = getConfig();
  if (libConfig.debugMode && Object.keys(context).length > 0) {
    Logger.debug("Error Context:", context);
  }
  
  // Call custom error handler if provided
  if (onError) {
    try {
      onError(standardizedError);
    } catch (handlerError) {
      Logger.error("Error in custom error handler", handlerError);
    }
  }
  
  // Rethrow if requested
  if (rethrow) {
    throw standardizedError;
  }
  
  return standardizedError;
}

/**
 * Creates a safe wrapper for async functions that handles errors
 * @param fn The async function to wrap
 * @param options Error handling options
 * @returns A wrapped function that handles errors
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ErrorHandlingOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, {
        ...options,
        rethrow: true,
        context: {
          ...(options.context || {}),
          functionName: fn.name,
          arguments: args
        }
      });
      
      // This line is never reached due to rethrow=true above
      // But needed for TypeScript return type compatibility
      throw error;
    }
  };
}

/**
 * Creates a retry wrapper for async functions, with exponential backoff
 * @param fn The async function to retry
 * @param options Retry options
 * @returns A wrapped function with retry capabilities
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    maxRetries: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryableErrors?: Array<string | typeof Error>;
    onRetry?: (error: Error, attempt: number) => void;
  }
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const {
    maxRetries,
    initialDelay = 50,
    maxDelay = 5000,
    backoffFactor = 2,
    retryableErrors,
    onRetry
  } = options;
  
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        const standardizedError = error instanceof Error ? error : new Error(`${error}`);
        lastError = standardizedError;
        
        // Check if we've reached max retries
        if (attempt >= maxRetries) {
          const { MaxRetriesExceededError } = await import("./DomainError");
          throw new MaxRetriesExceededError(fn.name, maxRetries, standardizedError);
        }
        
        // Check if error is retryable
        if (retryableErrors) {
          const isRetryable = retryableErrors.some(errorType => {
            if (typeof errorType === "string") {
              return standardizedError.name === errorType || 
                     (standardizedError as DomainError).code === errorType;
            }
            return standardizedError instanceof errorType;
          });
          
          if (!isRetryable) {
            throw standardizedError;
          }
        }
        
        // Notify retry callback
        if (onRetry) {
          try {
            onRetry(standardizedError, attempt + 1);
          } catch (callbackError) {
            Logger.error("Error in retry callback", callbackError);
          }
        }
        
        // Calculate backoff delay (with jitter)
        const delay = Math.min(
          initialDelay * Math.pow(backoffFactor, attempt) * (0.75 + Math.random() * 0.5),
          maxDelay
        );
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached due to the throw in the loop above
    throw lastError!;
  };
}

/**
 * Result type for handling operations that might fail
 */
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Creates a successful result
 * @param value The success value
 * @returns A success result
 */
export function success<T>(value: T): Result<T> {
  return { success: true, value };
}

/**
 * Creates a failure result
 * @param error The error
 * @returns A failure result
 */
export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Safely executes a synchronous function, capturing any errors
 * @param fn The function to execute
 * @returns A result containing either the function's return value or the caught error
 */
export function tryExecute<T>(fn: () => T): Result<T> {
  try {
    return success(fn());
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(`${error}`));
  }
}

/**
 * Safely executes an asynchronous function, capturing any errors
 * @param fn The async function to execute
 * @returns A promise for a result containing either the function's return value or the caught error
 */
export async function tryExecuteAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return success(await fn());
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(`${error}`));
  }
}

/**
 * A more strongly typed version of try/catch for use with async/await
 * @param promise The promise to handle
 * @returns A tuple containing [error, result]
 */
export async function tryAwait<T>(promise: Promise<T>): Promise<[Error | null, T | null]> {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    return [error instanceof Error ? error : new Error(`${error}`), null];
  }
} 
