import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Guards against shipping an entity without a migration. The schema is changed ONLY through
 * migrations (synchronize is off), so a table that exists only in an entity works on your
 * development database and then breaks on a fresh production one.
 */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

describe('database schema coverage', () => {
  const files = walk(__dirname);

  const entityTables = files
    .filter((file) => file.endsWith('.entity.ts'))
    .flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/@Entity\(\s*'([^']+)'\s*\)/g)].map((match) => match[1]),
    );

  const migrationSql = files
    .filter((file) => file.startsWith(join(__dirname, 'migrations')) && file.endsWith('.ts'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

  it('finds the entities', () => {
    expect(entityTables.length).toBeGreaterThan(0);
  });

  it.each(entityTables)('has a CREATE TABLE migration for "%s"', (table) => {
    expect(migrationSql).toMatch(new RegExp(`CREATE TABLE (IF NOT EXISTS )?"${table}"`));
  });
});
