import {
  DomainError,
  ValidationError,
  BusinessRuleError,
  EntityNotFoundError,
  wrapError,
  handleError,
  getRootCause,
  withErrorHandling,
  withRetry,
  Result,
  success,
  failure,
  tryExecute,
  tryExecuteAsync,
  tryAwait
} from '../../src/domain';

describe('Error Handling System', () => {
  describe('DomainError', () => {
    it('should create a domain error with code and details', () => {
      const error = new DomainError('TEST_ERROR', 'Test error message', { foo: 'bar' });
      
      expect(error.name).toBe('DomainError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.details).toEqual({ foo: 'bar' });
    });
    
    it('should create a domain error using the static factory method', () => {
      const error = DomainError.create('TEST_ERROR', 'Test error message', { foo: 'bar' });
      
      expect(error.name).toBe('DomainError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.details).toEqual({ foo: 'bar' });
    });
    
    it('should serialize error to plain object', () => {
      const error = new DomainError('TEST_ERROR', 'Test error message', { foo: 'bar' });
      const serialized = error.serialize();
      
      expect(serialized.name).toBe('DomainError');
      expect(serialized.code).toBe('TEST_ERROR');
      expect(serialized.message).toBe('Test error message');
      expect(serialized.details).toEqual({ foo: 'bar' });
      expect(serialized.stack).toBeDefined();
    });
  });
  
  describe('Specialized Error Types', () => {
    it('should create a validation error', () => {
      const validationErrors = {
        name: ['Name is required'],
        email: ['Email is invalid']
      };
      
      const error = new ValidationError('Validation failed', validationErrors);
      
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
      expect(error.getValidationErrors()).toEqual(validationErrors);
    });
    
    it('should create an entity not found error', () => {
      const error = new EntityNotFoundError('User', '123');
      
      expect(error.name).toBe('EntityNotFoundError');
      expect(error.code).toBe('ENTITY_NOT_FOUND');
      expect(error.message).toBe('User with ID 123 not found');
      expect(error.details).toEqual({ entityName: 'User', id: '123' });
    });
    
    it('should create a business rule error', () => {
      const error = new BusinessRuleError(
        'InsufficientFunds', 
        'Cannot withdraw more than available balance',
        { available: 100, requested: 200 }
      );
      
      expect(error.name).toBe('BusinessRuleError');
      expect(error.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(error.message).toBe('Cannot withdraw more than available balance');
      expect(error.details).toEqual({ 
        rule: 'InsufficientFunds', 
        available: 100, 
        requested: 200 
      });
    });
  });
  
  describe('Error Handling Utilities', () => {
    it('should wrap errors with context', () => {
      const originalError = new Error('Original error');
      const wrapped = wrapError(
        originalError, 
        'WRAPPED_ERROR', 
        'Wrapped error message',
        { context: 'test' }
      );
      
      expect(wrapped.name).toBe('DomainError');
      expect(wrapped.code).toBe('WRAPPED_ERROR');
      expect(wrapped.message).toBe('Wrapped error message');
      expect(wrapped.details).toEqual({ 
        context: 'test',
        cause: originalError
      });
    });
    
    it('should get root cause from error chain', () => {
      const rootError = new Error('Root cause');
      const middleError = new Error('Middle error');
      (middleError as any).cause = rootError;
      const topError = new Error('Top error');
      (topError as any).cause = middleError;
      
      const result = getRootCause(topError);
      expect(result).toBe(rootError);
    });
    
    it('should handle errors with options', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const error = new Error('Original error');
      const context = { functionName: 'testFunction' };
      const onError = jest.fn();
      
      const result = handleError(error, {
        message: 'Handled error',
        context,
        onError,
        rethrow: false
      });
      
      expect(result.message).toContain('Handled error');
      expect(result.message).toContain('Original error');
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
    
    it('should wrap functions with error handling', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const successFn = async () => 'success';
      const failFn = async () => { throw new Error('Test error'); };
      
      const wrappedSuccess = withErrorHandling(successFn);
      const wrappedFail = withErrorHandling(failFn);
      
      expect(await wrappedSuccess()).toBe('success');
      
      await expect(wrappedFail()).rejects.toThrow('Test error');
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
    
    it('should retry functions with backoff', async () => {
      let attempts = 0;
      const failThenSucceed = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };
      
      const retryFn = withRetry(failThenSucceed, {
        maxRetries: 3,
        initialDelay: 10
      });
      
      const result = await retryFn();
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });
    
    it('should throw MaxRetriesExceededError when max retries reached', async () => {
      const alwaysFail = async () => { 
        throw new Error('Always fails'); 
      };
      
      const retryFn = withRetry(alwaysFail, {
        maxRetries: 2,
        initialDelay: 10
      });
      
      await expect(retryFn()).rejects.toThrow(/failed after 2 attempts/);
    });
  });
  
  describe('Result Type Pattern', () => {
    it('should create success results', () => {
      const result = success('value');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('value');
      }
    });
    
    it('should create failure results', () => {
      const error = new Error('Failure');
      const result = failure(error);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
    
    it('should safely execute synchronous functions', () => {
      const successResult = tryExecute(() => 'success');
      expect(successResult.success).toBe(true);
      if (successResult.success) {
        expect(successResult.value).toBe('success');
      }
      
      const failResult = tryExecute(() => { throw new Error('Error'); });
      expect(failResult.success).toBe(false);
      if (!failResult.success) {
        expect(failResult.error).toBeInstanceOf(Error);
      }
    });
    
    it('should safely execute asynchronous functions', async () => {
      const successResult = await tryExecuteAsync(async () => 'success');
      expect(successResult.success).toBe(true);
      if (successResult.success) {
        expect(successResult.value).toBe('success');
      }
      
      const failResult = await tryExecuteAsync(async () => { throw new Error('Error'); });
      expect(failResult.success).toBe(false);
      if (!failResult.success) {
        expect(failResult.error).toBeInstanceOf(Error);
      }
    });
    
    it('should work with tryAwait pattern', async () => {
      const [successError, successResult] = await tryAwait(Promise.resolve('success'));
      expect(successError).toBeNull();
      expect(successResult).toBe('success');
      
      const [failError, failResult] = await tryAwait(Promise.reject(new Error('Error')));
      expect(failError).toBeInstanceOf(Error);
      expect(failResult).toBeNull();
    });
  });
}); 
