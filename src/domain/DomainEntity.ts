import { z } from "zod";

/**
 * Base class for domain entities with validation.
 */
export abstract class DomainEntity {
  /**
   * Validate the entity using Zod schema.
   * @param schema Zod schema for validation
   * @param data Data to validate
   * @returns Validated data
   * @throws ValidationError if validation fails
   */
  protected validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new Error("Validation failed");
    }
    return result.data;
  }
}

/**
 * Example of a domain entity with validation.
 */
export class UserEntity extends DomainEntity {
  private readonly id: string;
  private readonly name: string;

  constructor(data: { id: string; name: string }) {
    super();
    const schema = z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
    });
    const validatedData = this.validate(schema, data);
    this.id = validatedData.id;
    this.name = validatedData.name;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }
}
