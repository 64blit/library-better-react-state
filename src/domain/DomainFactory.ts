import { UserEntity } from "./DomainEntity";

/**
 * Factory for creating domain entities.
 */
export class DomainFactory {
  /**
   * Create a new UserEntity.
   * @param data Data for the user
   * @returns A new UserEntity instance
   */
  static createUser(data: { id: string; name: string }): UserEntity {
    return new UserEntity(data);
  }
}
