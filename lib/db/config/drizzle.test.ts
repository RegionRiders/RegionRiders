import { describe, expect, it } from '@jest/globals';
import { getPool } from './client';
import { getDb } from '@/lib/db';

describe('Drizzle ORM Database Instance', () => {
  it('returns a drizzle instance with schema', () => {
    const db = getDb();
    expect(db).toBeDefined();
    expect(typeof db.select).toBe('function');
    expect(typeof db.insert).toBe('function');
  });

  it('uses the same pool as getPool', () => {
    const db = getDb();
    const pool = getPool();
    expect(db.$client).toBe(pool);
  });
});
