# Bikepacking Trips MVP

**Status:** Planned for issue #109
**Owner:** RegionRiders
**Last updated:** 2026-04-09

## Context

RegionRiders already stores users and imported Strava activities, but it does not yet expose a first-class bikepacking trip domain. Issue #109 adds that missing layer so one user can group many imported activities into one trip, view trip-level aggregate statistics, and keep a private day-by-day journal.

This MVP is intentionally private and user-owned. It does not add social comments, collaborative ownership, or many-to-many activity membership.

## Scope

### In scope

- user-owned trips
- one activity assigned to at most one trip
- manual trip creation
- active trip creation
- create-from-date-range flow
- create-from-selected-activities flow
- trip CRUD
- derived trip statistics from linked activities
- private day notes stored separately from activities

### Out of scope

- public sharing
- collaborative trips
- comments from other users
- media galleries, route planning, packing lists, expenses
- manually edited aggregate totals

## Domain model

### `trips`

A trip is the parent record for one bikepacking journey.

Suggested fields:

- `id uuid primary key default random`
- `user_id uuid not null references users(id) on delete cascade`
- `title varchar(255) not null`
- `description text null`
- `status varchar(20) not null` with app-level values `draft`, `active`, `completed`, `archived`
- `start_date timestamptz null`
- `end_date timestamptz null`
- `started_at timestamptz null`
- `completed_at timestamptz null`
- `cover_activity_id uuid null`
- `metadata jsonb null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended indexes:

- `user_id`
- `(user_id, status)`
- `start_date`
- `end_date`

### `activities.trip_id`

Imported activities remain the canonical source of ride metrics. The trips feature adds a nullable `trip_id` foreign key on `activities`.

Rules:

- the linked trip must belong to the same user as the activity
- an activity may be linked to at most one trip
- deleting a trip must unassign activities instead of deleting them

### `trip_days`

Trip days store journaling content separately from activities so notes can exist even on days without a recorded ride.

Suggested fields:

- `id uuid primary key default random`
- `trip_id uuid not null references trips(id) on delete cascade`
- `day_date date not null`
- `title varchar(255) null`
- `summary varchar(500) null`
- `note text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraint:

- unique `(trip_id, day_date)`

## Ownership and lifecycle rules

### Ownership invariants

- a trip belongs to exactly one user
- a trip day belongs to exactly one trip
- an activity belongs to exactly one user and at most one trip
- all activities linked to a trip must belong to that trip owner

### Trip lifecycle

- `draft`: editable, may contain zero activities
- `active`: used for live trips and eligible for future auto-assignment logic
- `completed`: no longer active, but still manually editable
- `archived`: hidden from default active views, still readable

### Active-trip rule

A user may have at most one active trip at a time. Creating a second active trip for the same user should fail until the first one is completed or archived.

### Conflict handling

If a user tries to attach an activity that is already assigned to another trip, the write should fail with a conflict response. The system must not silently move the activity.

## Read models

### Trip list

The list view should expose:

- `id`
- `title`
- `status`
- `startDate`
- `endDate`
- `activityCount`
- `totalDistance`
- `totalMovingTime`
- `totalElevationGain`
- optional `coverActivityId`
- `updatedAt`

### Trip detail

The detail view should expose:

- base trip fields
- linked activities ordered chronologically by activity start date
- grouped trip-day notes ordered by `day_date`
- derived statistics:
  - `activityCount`
  - `totalDistance`
  - `totalMovingTime`
  - `totalElapsedTime`
  - `totalElevationGain`
  - `firstActivityStartDate`
  - `lastActivityStartDate`

Derived stats should be computed from linked activities rather than stored as a second editable source of truth.

## Creation flows

### Manual trip

Create an empty trip with title, description, and optional dates. This supports planning-first workflows.

### Active trip

Create a trip directly in `active` status for live journeys. This is the contract needed for issue #10.

### Create from date range

The server selects the current user's activities inside an inclusive range and links them to the new trip.

Expected behavior:

- reject invalid ranges where start is after end
- reject zero-match ranges by default
- reject if any candidate activity is already linked elsewhere
- initialize trip dates from the linked activity window

### Create from selected activities

The user selects already imported activities and creates a trip from that set.

Expected behavior:

- all selected activities must belong to the current user
- all selected activities must be unassigned
- trip dates initialize from the earliest and latest linked activity dates

## Operations and route contract

Route naming may vary, but the feature needs operations equivalent to:

- `POST /api/trips` — create manual, active, date-range, or selected-activity trip
- `GET /api/trips` — list the current user's trips
- `GET /api/trips/:id` — return the trip detail read model
- `PATCH /api/trips/:id` — update mutable trip metadata
- `POST /api/trips/:id/activities` — attach activities to an existing trip
- `DELETE /api/trips/:id/activities/:activityId` — detach one activity
- `PUT /api/trips/:id/days/:date` — create or update a trip-day note
- `DELETE /api/trips/:id` — delete a trip, unassign activities, and cascade trip days

Recommended backend layout:

- schema in `lib/db/schema/trips.ts`
- trip operations in `lib/db/operations/trips/*`
- route handlers under `app/api/trips/*`

## Verification checklist

Implementation for issue #109 is not complete unless it proves all of the following:

### Schema and migration

- `trips` and `trip_days` tables exist with the expected foreign keys and indexes
- `activities.trip_id` exists and defaults to `null` for existing rows
- deleting a trip unassigns activities and deletes trip-day notes

### Business rules

- only one active trip per user
- ownership checks prevent cross-user reads and writes
- activity-assignment conflicts are rejected instead of silently reassigned
- cover activity validation rejects activities that are not linked to the same trip

### Read-model behavior

- trip lists are user-scoped and include derived aggregates
- trip detail returns activities in chronological order
- trip day notes are ordered by `day_date`
- empty trips return zero aggregates and null boundary dates consistently

### Test focus

- manual trip creation
- active-trip creation and duplicate-active-trip rejection
- create-from-date-range success and conflict cases
- create-from-selected-activities success and ownership/conflict cases
- trip-day note create/update behavior
- trip deletion cleanup behavior
- aggregate stat correctness

## Issue mapping

- **#109** — trips schema, CRUD, aggregates, migration, and tests
- **#10** — active trip support and single-active-trip invariant
- **#14** — create trip from date range
- **#82** — create trip from selected activities
