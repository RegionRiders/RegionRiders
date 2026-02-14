-- Drop redundant indexes that are already created by UNIQUE constraints
-- PostgreSQL automatically creates indexes for UNIQUE columns

DROP INDEX IF EXISTS "users_email_idx";
DROP INDEX IF EXISTS "users_strava_id_idx";

-- Explanation:
-- UNIQUE constraints on email and strava_id columns automatically create
-- btree indexes in PostgreSQL. Creating explicit indexes duplicates
-- these, wasting storage and slowing down INSERT/UPDATE operations.
-- References:
-- https://www.postgresql.org/docs/current/sql-createtable.html#SQL-CREATETABLE-UNIQUE-CONSTRAINTS
