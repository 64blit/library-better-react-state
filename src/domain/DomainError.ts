/**
 * Base class for domain-specific errors.
 */
export class DomainError extends Error {
  /**
   * The error code, used for identifying error types
   */
  readonly code: string;
  
  /**
   * Optional details with additional context about the error
   */
  readonly details?: any;

  /**
   * Creates a new DomainError
   * @param code Error code for identification
   * @param message Human-readable error message
   * @param details Optional context or data related to the error
   */
  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
    
    // Ensures proper inheritance in transpiled JS
    Object.setPrototypeOf(this, DomainError.prototype);
  }

  /**
   * Factory method to create a domain error
   * @param code Error code for identification
   * @param message Human-readable error message
   * @param details Optional context or data related to the error
   * @returns A new DomainError instance
   */
  static create(code: string, message: string, details?: any): DomainError {
    return new DomainError(code, message, details);
  }

  /**
   * Serialize the error to a plain object suitable for logging or transmission
   * @returns A serialized representation of the error
   */
  serialize(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends DomainError {
  /**
   * Creates a new ValidationError
   * @param message Human-readable error message
   * @param validationErrors Optional details about validation failures
   */
  constructor(message: string, validationErrors?: Record<string, string[]>) {
    super("VALIDATION_ERROR", message, validationErrors);
    this.name = "ValidationError";
    
    // Ensures proper inheritance in transpiled JS
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Factory method to create a validation error with consistent code
   * @param message Human-readable error message
   * @param validationErrors Optional details about validation failures
   * @returns A new ValidationError instance
   */
  static createWithValidationErrors(message: string, validationErrors?: Record<string, string[]>): ValidationError {
    return new ValidationError(message, validationErrors);
  }

  /**
   * Factory method to create a domain error
   * Overrides the parent method to ensure type compatibility
   */
  static create(code: string, message: string, details?: any): DomainError {
    if (code === "VALIDATION_ERROR") {
      return new ValidationError(message, details as Record<string, string[]>);
    }
    return new DomainError(code, message, details);
  }

  /**
   * Get validation errors as a structured object
   * @returns Object mapping field names to arrays of error messages
   */
  getValidationErrors(): Record<string, string[]> {
    return this.details || {};
  }
}

/**
 * Error thrown when an entity is not found.
 */
export class EntityNotFoundError extends DomainError {
  /**
   * Creates a new EntityNotFoundError
   * @param entityName Name of the entity that wasn't found
   * @param id Optional identifier that was searched for
   */
  constructor(entityName: string, id?: string | number) {
    const message = id 
      ? `${entityName} with ID ${id} not found`
      : `${entityName} not found`;
    
    super("ENTITY_NOT_FOUND", message, { entityName, id });
    this.name = "EntityNotFoundError";
    
    // Ensures proper inheritance in transpiled JS
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }

  /**
   * Factory method to create an entity not found error
   * @param entityName Name of the entity that wasn't found
   * @param id Optional identifier that was searched for
   * @returns A new EntityNotFoundError instance
   */
  static createForEntity(entityName: string, id?: string | number): EntityNotFoundError {
    return new EntityNotFoundError(entityName, id);
  }

  /**
   * Factory method to create a domain error
   * Overrides the parent method to ensure type compatibility
   */
  static create(code: string, message: string, details?: any): DomainError {
    if (code === "ENTITY_NOT_FOUND" && details && 'entityName' in details) {
      return new EntityNotFoundError(details.entityName, details.id);
    }
    return new DomainError(code, message, details);
  }
}

/**
 * Error thrown when an invariant or business rule is violated.
 */
export class BusinessRuleError extends DomainError {
  /**
   * Creates a new BusinessRuleError
   * @param rule Name or description of the business rule that was violated
   * @param message Human-readable error message
   * @param details Optional context about the rule violation
   */
  constructor(rule: string, message: string, details?: any) {
    super("BUSINESS_RULE_VIOLATION", message, { rule, ...details });
    this.name = "BusinessRuleError";
    
    // Ensures proper inheritance in transpiled JS
    Object.setPrototypeOf(this, BusinessRuleError.prototype);
  }

  /**
   * Factory method to create a business rule error
   * @param rule Name or description of the business rule that was violated
   * @param message Human-readable error message
   * @param details Optional context about the rule violation
   * @returns A new BusinessRuleError instance
   */
  static createForRule(rule: string, message: string, details?: any): BusinessRuleError {
    return new BusinessRuleError(rule, message, details);
  }

  /**
   * Factory method to create a domain error
   * Overrides the parent method to ensure type compatibility
   */
  static create(code: string, message: string, details?: any): DomainError {
    if (code === "BUSINESS_RULE_VIOLATION" && details && 'rule' in details) {
      return new BusinessRuleError(details.rule, message, details);
    }
    return new DomainError(code, message, details);
  }
}

/**
 * Error thrown when an operation exceeds its maximum allowed attempts.
 */
export class MaxRetriesExceededError extends DomainError {
  /**
   * Creates a new MaxRetriesExceededError
   * @param operation Name of the operation that failed
   * @param maxRetries Maximum number of retries that were attempted
   * @param cause Original error that caused the retries
   */
  constructor(operation: string, maxRetries: number, cause?: Error) {
    super(
      "MAX_RETRIES_EXCEEDED", 
      `Operation "${operation}" failed after ${maxRetries} attempts`,
      { operation, maxRetries, cause }
    );
    this.name = "MaxRetriesExceededError";
    
    // Ensures proper inheritance in transpiled JS
    Object.setPrototypeOf(this, MaxRetriesExceededError.prototype);
  }

  /**
   * Factory method to create a max retries exceeded error
   * @param operation Name of the operation that failed
   * @param maxRetries Maximum number of retries that were attempted
   * @param cause Original error that caused the retries
   * @returns A new MaxRetriesExceededError instance
   */
  static createForOperation(operation: string, maxRetries: number, cause?: Error): MaxRetriesExceededError {
    return new MaxRetriesExceededError(operation, maxRetries, cause);
  }

  /**
   * Factory method to create a domain error
   * Overrides the parent method to ensure type compatibility
   */
  static create(code: string, message: string, details?: any): DomainError {
    if (code === "MAX_RETRIES_EXCEEDED" && details) {
      const { operation, maxRetries, cause } = details;
      if (operation && typeof maxRetries === 'number') {
        return new MaxRetriesExceededError(operation, maxRetries, cause);
      }
    }
    return new DomainError(code, message, details);
  }
}

/**
 * Error thrown when a concurrent operation conflicts with another.
 */
export class ConcurrencyError extends DomainError {
  /**
   * Creates a new ConcurrencyError
   * @param message Human-readable error message
   * @param details Optional details about the conflict
   */
  constructor(message: string, details?: any) {
    super("CONCURRENCY_CONFLICT", message, details);
    this.name = "ConcurrencyError";
    
    // Ensures proper inheritance in transpiled JS
    Object.setPrototypeOf(this, ConcurrencyError.prototype);
  }

  /**
   * Factory method to create a concurrency error
   * @param message Human-readable error message
   * @param details Optional details about the conflict
   * @returns A new ConcurrencyError instance
   */
  static createWithDetails(message: string, details?: any): ConcurrencyError {
    return new ConcurrencyError(message, details);
  }

  /**
   * Factory method to create a domain error
   * Overrides the parent method to ensure type compatibility
   */
  static create(code: string, message: string, details?: any): DomainError {
    if (code === "CONCURRENCY_CONFLICT") {
      return new ConcurrencyError(message, details);
    }
    return new DomainError(code, message, details);
  }
}
