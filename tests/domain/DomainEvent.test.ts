import {
  DomainEvent,
  DomainEventBus,
  createDomainEvent,
  publishEvent,
  publishesEvent
} from '../../src/domain/DomainEvent';

describe('Domain Event System', () => {
  let eventBus: DomainEventBus;
  
  beforeEach(() => {
    // Get the singleton instance
    eventBus = DomainEventBus.instance;
    // Reset the event bus between tests
    eventBus.clearSubscriptions();
    eventBus.clearHistory();
    // Configure with test settings
    eventBus.configure({
      enableEventLogging: false,
      maxEventHistory: 10
    });
  });
  
  describe('Event Creation', () => {
    it('should create a domain event with the correct structure', () => {
      const now = Date.now();
      const event = createDomainEvent('TEST_EVENT', { id: 123 });
      
      expect(event.type).toBe('TEST_EVENT');
      expect(event.payload).toEqual({ id: 123 });
      expect(event.timestamp).toBeGreaterThanOrEqual(now);
      expect(event.metadata).toBeDefined();
    });
    
    it('should include metadata when specified', () => {
      const metadata = { source: 'test', userId: 'user123' };
      const event = createDomainEvent('TEST_EVENT', { data: 'value' }, { metadata });
      
      expect(event.metadata).toEqual(metadata);
    });
    
    it('should include stack trace when enabled', () => {
      const event = createDomainEvent('TEST_EVENT', {}, { includeStackTrace: true });
      
      expect(event.metadata).toBeDefined();
      expect(event.metadata?.stackTrace).toBeDefined();
      expect(typeof event.metadata?.stackTrace).toBe('string');
    });
  });
  
  describe('Event Subscription', () => {
    it('should call handler when event is published', async () => {
      const handler = jest.fn();
      eventBus.subscribe('TEST_EVENT', handler);
      
      const event = createDomainEvent('TEST_EVENT', { data: 'value' });
      await eventBus.publish(event);
      
      expect(handler).toHaveBeenCalledWith(event);
    });
    
    it('should allow subscribing to multiple event types', async () => {
      const handler = jest.fn();
      eventBus.subscribeToMany(['EVENT_A', 'EVENT_B'], handler);
      
      const eventA = createDomainEvent('EVENT_A', { data: 'A' });
      const eventB = createDomainEvent('EVENT_B', { data: 'B' });
      const eventC = createDomainEvent('EVENT_C', { data: 'C' });
      
      await eventBus.publish(eventA);
      await eventBus.publish(eventB);
      await eventBus.publish(eventC);
      
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(eventA);
      expect(handler).toHaveBeenCalledWith(eventB);
    });
    
    it('should handle unsubscribe correctly', async () => {
      const handler = jest.fn();
      const unsubscribe = eventBus.subscribe('TEST_EVENT', handler);
      
      // First publish - handler should be called
      await eventBus.publish(createDomainEvent('TEST_EVENT', {}));
      expect(handler).toHaveBeenCalledTimes(1);
      
      // Unsubscribe
      unsubscribe();
      
      // Second publish - handler should not be called again
      await eventBus.publish(createDomainEvent('TEST_EVENT', {}));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Event Publication', () => {
    it('should publish events to all subscribers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventBus.subscribe('MULTI_HANDLER', handler1);
      eventBus.subscribe('MULTI_HANDLER', handler2);
      
      const event = createDomainEvent('MULTI_HANDLER', {});
      await eventBus.publish(event);
      
      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });
    
    it('should handle async event handlers', async () => {
      let asyncValue = false;
      
      const asyncHandler = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        asyncValue = true;
      };
      
      eventBus.subscribe('ASYNC_EVENT', asyncHandler);
      await eventBus.publish(createDomainEvent('ASYNC_EVENT', {}));
      
      expect(asyncValue).toBe(true);
    });
    
    it('should not fail if an event has no subscribers', async () => {
      // This should not throw
      await expect(
        eventBus.publish(createDomainEvent('NO_SUBSCRIBERS', {}))
      ).resolves.not.toThrow();
    });
    
    it('should maintain event history', async () => {
      await eventBus.publish(createDomainEvent('HISTORY_EVENT_1', { id: 1 }));
      await eventBus.publish(createDomainEvent('HISTORY_EVENT_2', { id: 2 }));
      
      const events = eventBus.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('HISTORY_EVENT_1');
      expect(events[1].type).toBe('HISTORY_EVENT_2');
    });
    
    it('should respect max history size', async () => {
      // Configure to keep only 2 events
      eventBus.configure({ maxEventHistory: 2 });
      
      await eventBus.publish(createDomainEvent('EVENT_1', { id: 1 }));
      await eventBus.publish(createDomainEvent('EVENT_2', { id: 2 }));
      await eventBus.publish(createDomainEvent('EVENT_3', { id: 3 }));
      
      const events = eventBus.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('EVENT_2');
      expect(events[1].type).toBe('EVENT_3');
    });
  });
  
  describe('Helper Functions', () => {
    it('should publish events with the helper function', async () => {
      const handler = jest.fn();
      eventBus.subscribe('HELPER_EVENT', handler);
      
      await publishEvent('HELPER_EVENT', { data: 'helper' });
      
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].type).toBe('HELPER_EVENT');
      expect(handler.mock.calls[0][0].payload).toEqual({ data: 'helper' });
    });
    
    it('should publish events after method calls', async () => {
      // Mock handler to verify event publication
      const handler = jest.fn();
      eventBus.subscribe('METHOD_EVENT', handler);
      
      // Test class with methods that publish events
      class TestService {
        doSomething(input: string): string {
          const result = `processed:${input}`;
          // Manually publish event
          publishEvent('METHOD_EVENT', { result, args: [input] });
          return result;
        }
        
        async doSomethingAsync(input: string): Promise<string> {
          const result = `async:${input}`;
          await publishEvent('ASYNC_METHOD_EVENT', { result, args: [input] });
          return result;
        }
        
        doWithCustomPayload(input: string): string {
          const result = `custom:${input}`;
          const customPayload = {
            result,
            originalInput: input,
            timestamp: Date.now()
          };
          publishEvent('CUSTOM_PAYLOAD_EVENT', customPayload);
          return result;
        }
      }
      
      const service = new TestService();
      
      // Test synchronous method
      const syncResult = service.doSomething('test');
      expect(syncResult).toBe('processed:test');
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].type).toBe('METHOD_EVENT');
      expect(handler.mock.calls[0][0].payload.result).toBe('processed:test');
    });
  });
}); 
