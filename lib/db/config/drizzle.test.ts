import { describe, expect, it } from '@jest/globals';
import { getDb } from '@/lib/db';
import { getPool } from './client';

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
