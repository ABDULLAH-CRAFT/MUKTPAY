import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

const snake = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

/**
 * Entity property `passwordHash` → column `password_hash`.
 * Keeps the database conventional for SQL tools, analysts and future services,
 * while the TypeScript stays camelCase. Every entity gets this for free.
 */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string {
    return customName ?? snake([...embeddedPrefixes, propertyName].join('_'));
  }
  relationName(propertyName: string): string {
    return snake(propertyName);
  }
  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snake(`${relationName}_${referencedColumnName}`);
  }
}
