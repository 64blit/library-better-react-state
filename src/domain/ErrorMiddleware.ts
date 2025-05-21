import { DomainError } from "./DomainError";
import { handleError, ErrorHandlingOptions, withRetry, withErrorHandling } from "./ErrorHandling";
import { Logger } from "../utils/Logger";

// We need to add explicit type definitions for Reflect Metadata API
// This would normally be available through the reflect-metadata package
// which should be added as a dependency and imported in a real project
interface ReflectMetadata {
  defineMetadata(metadataKey: string, metadataValue: any, target: any, propertyKey: string): void;
  getOwnMetadata(metadataKey: string, target: any, propertyKey: string): any;
  getMetadata(metadataKey: string, target: any, propertyKey: string): any;
}

// Simplified implementation - in real code you would import the actual package
const ReflectMetadata: ReflectMetadata = {
  defineMetadata: (metadataKey, metadataValue, target, propertyKey) => {
    if (!target.__metadata) {
      target.__metadata = {};
    }
    if (!target.__metadata[propertyKey]) {
      target.__metadata[propertyKey] = {};
    }
    target.__metadata[propertyKey][metadataKey] = metadataValue;
  },
  getOwnMetadata: (metadataKey, target, propertyKey) => {
    if (!target.__metadata || !target.__metadata[propertyKey]) {
      return undefined;
    }
    return target.__metadata[propertyKey][metadataKey];
  },
  getMetadata: (metadataKey, target, propertyKey) => {
    return ReflectMetadata.getOwnMetadata(metadataKey, target, propertyKey);
  }
};

/**
 * Method decorator that adds error handling to a method
 * @param options Error handling options
 * @returns Method decorator
 */
export function handleErrors(options: ErrorHandlingOptions = {}) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    if (typeof originalMethod !== 'function') {
      throw new Error('handleErrors decorator can only be applied to methods');
    }
    
    descriptor.value = function(this: any, ...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);
        
        // Handle promise results
        if (result instanceof Promise) {
          return result.catch((error: unknown) => {
            return handleError(error, {
              ...options,
              rethrow: true,
              context: {
                ...(options.context || {}),
                method: propertyKey,
                class: this.constructor.name,
                arguments: args
              }
            });
          });
        }
        
        return result;
      } catch (error) {
        return handleError(error, {
          ...options,
          rethrow: true,
          context: {
            ...(options.context || {}),
            method: propertyKey,
            class: this.constructor.name,
            arguments: args
          }
        });
      }
    };
    
    return descriptor;
  };
}

/**
 * Method decorator that adds retry capability to a method
 * @param options Retry options
 * @returns Method decorator
 */
export function retry(options: {
  maxRetries: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: Array<string | typeof Error>;
}) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    if (typeof originalMethod !== 'function') {
      throw new Error('retry decorator can only be applied to methods');
    }
    
    descriptor.value = function(this: any, ...args: any[]) {
      const result = originalMethod.apply(this, args);
      
      if (!(result instanceof Promise)) {
        throw new Error('retry decorator can only be applied to async methods');
      }
      
      const retryFn = withRetry(
        async () => await result,
        {
          ...options,
          onRetry: (error, attempt) => {
            Logger.warn(
              `Retrying ${this.constructor.name}.${propertyKey} (attempt ${attempt}/${options.maxRetries})`,
              { error: error.message, stack: error.stack }
            );
          }
        }
      );
      
      return retryFn();
    };
    
    return descriptor;
  };
}

/**
 * Class decorator that adds error handling to all methods
 * @param options Error handling options
 * @returns Class decorator
 */
export function errorHandlingClass(options: ErrorHandlingOptions = {}) {
  return function<T extends new (...args: any[]) => any>(target: T): T {
    // Get all method names from the prototype
    const methodNames = Object.getOwnPropertyNames(target.prototype).filter(
      prop => 
        prop !== 'constructor' && 
        typeof target.prototype[prop] === 'function'
    );
    
    // Apply error handling to each method
    methodNames.forEach(methodName => {
      const descriptor = Object.getOwnPropertyDescriptor(
        target.prototype,
        methodName
      );
      
      if (descriptor && typeof descriptor.value === 'function') {
        const originalMethod = descriptor.value;
        
        descriptor.value = function(this: any, ...args: any[]) {
          try {
            const result = originalMethod.apply(this, args);
            
            // Handle promise results
            if (result instanceof Promise) {
              return result.catch((error: unknown) => {
                return handleError(error, {
                  ...options,
                  rethrow: true,
                  context: {
                    ...(options.context || {}),
                    method: methodName,
                    class: target.name,
                    arguments: args
                  }
                });
              });
            }
            
            return result;
          } catch (error) {
            return handleError(error, {
              ...options,
              rethrow: true,
              context: {
                ...(options.context || {}),
                method: methodName,
                class: target.name,
                arguments: args
              }
            });
          }
        };
        
        Object.defineProperty(target.prototype, methodName, descriptor);
      }
    });
    
    return target;
  };
}

/**
 * Parameter decorator that validates a parameter is not null or undefined
 * @param message Optional custom error message
 * @returns Parameter decorator
 */
export function required(message?: string) {
  return function(
    target: any,
    propertyKey: string,
    parameterIndex: number
  ): void {
    const metadataKey = `${propertyKey}_required_params`;
    const messagesKey = `${propertyKey}_param_messages`;
    
    // Get existing required parameters or initialize empty array
    const existingRequiredParams: number[] = ReflectMetadata.getOwnMetadata(
      metadataKey,
      target,
      propertyKey
    ) || [];
    
    // Add the parameter index to the list of required parameters
    const requiredParams = [...existingRequiredParams, parameterIndex];
    
    // Store the validation message if provided
    if (message) {
      const existingMessages: Record<number, string> = ReflectMetadata.getOwnMetadata(
        messagesKey,
        target,
        propertyKey
      ) || {};
      
      ReflectMetadata.defineMetadata(
        messagesKey,
        { ...existingMessages, [parameterIndex]: message },
        target,
        propertyKey
      );
    }
    
    // Save the updated list of required parameters
    ReflectMetadata.defineMetadata(
      metadataKey,
      requiredParams,
      target,
      propertyKey
    );
    
    // The original method will be replaced with validation logic
    const originalMethod = target[propertyKey];
    
    if (typeof originalMethod === 'function') {
      // Create a method decorator to validate parameters
      const validateParams = (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
      ) => {
        const method = descriptor.value;
        
        descriptor.value = function(this: any, ...args: any[]) {
          const requiredParams: number[] = ReflectMetadata.getOwnMetadata(
            metadataKey,
            target,
            propertyKey
          ) || [];
          
          const messages: Record<number, string> = ReflectMetadata.getOwnMetadata(
            messagesKey,
            target,
            propertyKey
          ) || {};
          
          requiredParams.forEach(paramIndex => {
            if (args[paramIndex] === undefined || args[paramIndex] === null) {
              const paramName = getParameterName(target, propertyKey, paramIndex);
              const defaultMessage = 
                `Parameter ${paramName || paramIndex} in ${target.constructor.name}.${propertyKey} is required`;
              
              throw new DomainError(
                "PARAMETER_REQUIRED",
                messages[paramIndex] || defaultMessage,
                { parameterIndex: paramIndex, method: propertyKey }
              );
            }
          });
          
          return method.apply(this, args);
        };
        
        return descriptor;
      };
      
      // Apply the validation decorator
      const descriptor = {
        value: originalMethod,
        writable: true,
        enumerable: false,
        configurable: true
      };
      
      // Only apply once per method (in case multiple parameters are decorated)
      if (!target[propertyKey].__validated) {
        validateParams(target, propertyKey, descriptor);
        target[propertyKey] = descriptor.value;
        target[propertyKey].__validated = true;
      }
    }
  };
}

/**
 * Helper function to get parameter name (if reflection metadata is available)
 */
function getParameterName(
  target: any,
  methodName: string,
  paramIndex: number
): string | undefined {
  try {
    const paramTypes = ReflectMetadata.getMetadata(
      'design:paramtypes',
      target,
      methodName
    );
    if (paramTypes && paramTypes[paramIndex]) {
      return paramTypes[paramIndex].name;
    }
  } catch {
    // Metadata reflection not available, silently continue
  }
  return undefined;
}

/**
 * Example usage of decorators
 */
/* 
// Class with error handling for all methods
@errorHandlingClass()
class UserService {
  // Method with retry for failed operations
  @retry({ maxRetries: 3, retryableErrors: ['NetworkError'] })
  async fetchUserData(userId: string): Promise<any> {
    // Implementation...
  }
  
  // Method with custom error handling
  @handleErrors({ 
    message: 'Failed to update user profile',
    errorCode: 'USER_UPDATE_FAILED' 
  })
  async updateUserProfile(
    @required('User ID is required') userId: string,
    @required('Profile data is required') profileData: any
  ): Promise<void> {
    // Implementation...
  }
}
*/ 
