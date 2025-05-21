import { Logger } from "../utils/Logger";
import { PerformanceMonitor } from "../utils/PerformanceMonitor";
import { handleError } from "./ErrorHandling";
import { getConfig } from "../config"; // Import global config

/**
 * Base interface for all domain events
 */
export interface DomainEvent {
  /**
   * Unique type identifier for the event
   */
  readonly type: string;
  
  /**
   * Timestamp when the event was created
   */
  readonly timestamp: number;
  
  /**
   * Event payload data
   */
  readonly payload: any;
  
  /**
   * Metadata for the event
   */
  readonly metadata?: Record<string, any>;
}

/**
 * Base type for domain event handlers
 */
export type DomainEventHandler<T extends DomainEvent = DomainEvent> = 
  (event: T) => void | Promise<void>;

/**
 * Options for creating domain events
 */
export interface CreateDomainEventOptions {
  /**
   * Optional metadata to include with the event
   */
  metadata?: Record<string, any>;
  
  /**
   * Whether to include a stack trace in the metadata
   */
  includeStackTrace?: boolean;
}

/**
 * Options for event bus configuration
 */
export interface EventBusOptions {
  /**
   * Whether to enable performance monitoring for events
   */
  enablePerformanceTracking?: boolean;
  
  /**
   * Whether to log events for debugging.
   * If undefined, defaults to the global debugMode setting.
   */
  enableEventLogging?: boolean;
  
  /**
   * Maximum events to keep in history
   */
  maxEventHistory?: number;
}

/**
 * Create a domain event with specified type and payload
 * @param type Event type identifier
 * @param payload Event data
 * @param options Additional options for event creation
 * @returns A domain event object
 */
export function createDomainEvent<T>(
  type: string,
  payload: T,
  options: CreateDomainEventOptions = {}
): DomainEvent {
  const { metadata = {}, includeStackTrace = false } = options;
  
  if (includeStackTrace) {
    const stackTrace = new Error().stack;
    metadata.stackTrace = stackTrace;
  }
  
  return {
    type,
    timestamp: Date.now(),
    payload,
    metadata
  };
}

/**
 * Manages domain events for a bounded context
 */
export class DomainEventBus {
  private static _instance: DomainEventBus;
  private _handlers: Map<string, Set<DomainEventHandler>> = new Map();
  private _eventHistory: DomainEvent[] = [];
  private _options: EventBusOptions; // Type it but initialize in constructor or configure
  
  /**
   * Get the singleton event bus instance
   */
  static get instance(): DomainEventBus {
    if (!DomainEventBus._instance) {
      DomainEventBus._instance = new DomainEventBus();
    }
    return DomainEventBus._instance;
  }
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Initialize options considering global config
    const globalConfig = getConfig();
    this._options = {
      enablePerformanceTracking: false,
      enableEventLogging: globalConfig.debugMode, // Default to global debugMode
      maxEventHistory: 100
    };
  }
  
  /**
   * Configure the event bus options
   * @param options Event bus configuration options
   */
  configure(options: Partial<EventBusOptions>): void { // Partial for configure
    const globalConfig = getConfig();
    // Prioritize explicit options, then global debugMode for enableEventLogging
    const newEnableEventLogging = options.enableEventLogging !== undefined 
      ? options.enableEventLogging 
      : globalConfig.debugMode;

    this._options = { 
      ...this._options, 
      ...options, 
      enableEventLogging: newEnableEventLogging 
    };
    Logger.debug("DomainEventBus configured", this._options); // Use Logger.debug
  }
  
  /**
   * Subscribe to events of a specific type
   * @param eventType Type of events to subscribe to
   * @param handler Handler function to call when events are published
   * @returns Unsubscribe function to remove the handler
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>
  ): () => void {
    // Initialize the handler set if it doesn't exist
    if (!this._handlers.has(eventType)) {
      this._handlers.set(eventType, new Set<DomainEventHandler>());
    }
    
    // We know this is defined because we just created it if it didn't exist
    const handlers = this._handlers.get(eventType);
    if (handlers) {
      handlers.add(handler as DomainEventHandler);
    }
    
    return () => {
      const handlers = this._handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler as DomainEventHandler);
        
        if (handlers.size === 0) {
          this._handlers.delete(eventType);
        }
      }
    };
  }
  
  /**
   * Subscribe to multiple event types with the same handler
   * @param eventTypes Array of event types to subscribe to
   * @param handler Handler function to call when events are published
   * @returns Unsubscribe function to remove all handlers
   */
  subscribeToMany(
    eventTypes: string[],
    handler: DomainEventHandler
  ): () => void {
    const unsubscribeFunctions = eventTypes.map(
      eventType => this.subscribe(eventType, handler)
    );
    
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }
  
  /**
   * Publish an event to all subscribers
   * @param event The event to publish
   * @returns Promise that resolves when all handlers have completed
   */
  async publish(event: DomainEvent): Promise<void> {
    // Use the resolved _options.enableEventLogging
    if (this._options.enableEventLogging) {
      Logger.debug(`Event published: ${event.type}`, event); // Use Logger.debug
    }
    
    // Add to history if enabled
    if (this._options.maxEventHistory !== undefined && this._options.maxEventHistory > 0) {
      this._eventHistory.push(event);
      
      // Trim history if needed
      if (this._eventHistory.length > (this._options.maxEventHistory || 0)) {
        this._eventHistory.shift();
      }
    }
    
    const handlers = this._handlers.get(event.type);
    if (!handlers || handlers.size === 0) {
      if (this._options.enableEventLogging) {
        Logger.debug(`No handlers for event: ${event.type}`); // Use Logger.debug
      }
      return;
    }
    
    const promises: Promise<void>[] = [];
    
    for (const handler of handlers) {
      try {
        // Handle performance tracking
        if (this._options.enablePerformanceTracking) {
          const perfLabel = `event_handler_${event.type}`;
          PerformanceMonitor.start(perfLabel);
          
          try {
            const result = handler(event);
            
            if (result instanceof Promise) {
              promises.push(
                result.catch(error => {
                  handleError(error, {
                    message: `Error in async event handler for ${event.type}`,
                    context: { event }
                  });
                }).finally(() => {
                  PerformanceMonitor.end(perfLabel);
                })
              );
            } else {
              PerformanceMonitor.end(perfLabel);
            }
          } catch (error) {
            PerformanceMonitor.end(perfLabel);
            handleError(error, {
              message: `Error in event handler for ${event.type}`,
              context: { event }
            });
          }
        } else {
          // No performance tracking
          const result = handler(event);
          
          if (result instanceof Promise) {
            promises.push(
              result.catch(error => {
                handleError(error, {
                  message: `Error in async event handler for ${event.type}`,
                  context: { event }
                });
              })
            );
          }
        }
      } catch (error) {
        handleError(error, {
          message: `Error in event handler for ${event.type}`,
          context: { event }
        });
      }
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }
  
  /**
   * Get historical events matching the filter criteria
   * @param filter Optional filter to apply to events
   * @returns Array of events that match the filter
   */
  getEvents(filter?: (event: DomainEvent) => boolean): DomainEvent[] {
    if (!filter) {
      return [...this._eventHistory];
    }
    
    return this._eventHistory.filter(filter);
  }
  
  /**
   * Clear all event handlers
   */
  clearSubscriptions(): void {
    this._handlers.clear();
    Logger.debug("All event subscriptions cleared"); // Use Logger.debug
  }
  
  /**
   * Clear event history
   */
  clearHistory(): void {
    this._eventHistory = [];
    Logger.debug("Event history cleared"); // Use Logger.debug
  }
}

/**
 * Export a default instance for easy importing
 */
export const eventBus = DomainEventBus.instance;

/**
 * Helper to easily create and publish a domain event
 * @param type Event type identifier
 * @param payload Event data
 * @param options Additional options for event creation
 * @returns Promise that resolves when the event is published
 */
export async function publishEvent<T>(
  type: string,
  payload: T,
  options: CreateDomainEventOptions = {}
): Promise<void> {
  const event = createDomainEvent(type, payload, options);
  return eventBus.publish(event);
}

/**
 * Domain event decorator for methods that should publish events
 * @param eventType Type of event to publish
 * @param payloadFn Function to extract payload from method result
 * @returns Method decorator
 */
export function publishesEvent(
  eventType: string,
  payloadFn?: (result: any, ...args: any[]) => any
) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    if (typeof originalMethod !== 'function') {
      throw new Error('publishesEvent decorator can only be applied to methods');
    }
    
    descriptor.value = async function(this: any, ...args: any[]) {
      const result = originalMethod.apply(this, args);
      
      // Handle async methods
      if (result instanceof Promise) {
        const asyncResult = await result;
        
        // Create and publish the event
        const payload = payloadFn 
          ? payloadFn(asyncResult, ...args) 
          : { result: asyncResult, args };
          
        await publishEvent(eventType, payload, {
          metadata: {
            source: `${target.constructor.name}.${propertyKey}`,
            timestamp: new Date().toISOString()
          }
        });
        
        return asyncResult;
      } 
      
      // Handle synchronous methods
      const payload = payloadFn 
        ? payloadFn(result, ...args) 
        : { result, args };
        
      publishEvent(eventType, payload, {
        metadata: {
          source: `${target.constructor.name}.${propertyKey}`,
          timestamp: new Date().toISOString()
        }
      });
      
      return result;
    };
    
    return descriptor;
  };
}
