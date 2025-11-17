# Database Module

This directory contains the database layer for RegionRiders, built with [Drizzle ORM](https://orm.drizzle.team/) and
PostgreSQL.

## 📁 Structure

```
lib/db/
├── config/          # Database configuration and connection settings
├── schema/          # Database table schemas and models
├── operations/      # Database query operations
├── index.ts         # Main exports
└── README.md        # This file
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and Yarn
- Environment variables configured

### 1. Environment Setup

Create a `.env.local` file in the project root with the following variables:

```bash
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=regionriders
POSTGRES_USER=regionriders_user
POSTGRES_PASSWORD=regionriders_pass

# Optional: Connection Pool Settings
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
```

### 2. Start the Database

```bash
# Start PostgreSQL container
yarn db:up

# Or use Docker Compose directly
docker-compose up -d postgres
```

The database will be available at `localhost:5432` with the credentials specified in your `.env.local`.

### 3. Run Migrations

```bash
# Generate migration files from schema changes
yarn db:generate

# Apply migrations to the database
yarn db:migrate

# Or push schema changes directly (dev only)
yarn db:push
```

### 4. Database Management

```bash
# Open Drizzle Studio (GUI for database management)
yarn db:studio

# Stop the database
yarn db:down

# Reset database (WARNING: destroys all data)
yarn db:reset

# Run the full setup script
yarn db:setup
```

## 🏗️ Architecture

### Configuration (`config/`)

- **`config.ts`**: Database environment configuration and validation
- **`client.ts`**: PostgreSQL client pool management
- **`drizzle.ts`**: Drizzle ORM instance initialization

The configuration layer handles:

- Environment variable validation
- Connection pooling
- SSL configuration (auto-enabled for production non-local hosts)
- Connection timeouts and limits

### Schema (`schema/`)

Database table definitions using Drizzle's schema builder:

- **`users.ts`**: User accounts and profiles
- **`activities.ts`**: Strava activities and ride data
- **`helpers/`**: Query field selectors and utilities

Each schema file exports:

- Table definition
- TypeScript types for insert/select operations
- Relations to other tables

Example usage:

```typescript
import {users, type User, type NewUser} from '@/lib/db/schema';

// Type-safe insert
const newUser: NewUser = {
    stravaId: 12345,
    email: 'rider@example.com',
    // ...
};

// Type-safe select
const user: User = await db.select().from(users).where(/*...*/);
```

### Operations (`operations/`)

Reusable database queries organized by entity:

- **`users/`**: User-related queries (create, find, update)
- **`activities/`**: Activity-related queries (create, list, stats)

Each operation file exports functions that encapsulate common database operations with proper error handling and type
safety.

Example usage:

```typescript
import {findUserByStravaId, createUser} from '@/lib/db/operations';

const user = await findUserByStravaId(12345);
if (!user) {
    const newUser = await createUser({stravaId: 12345, ...});
}
```

## 📊 Database Schema

### Users Table

Stores user account information from Strava OAuth:

| Column         | Type         | Description                    |
|----------------|--------------|--------------------------------|
| id             | serial       | Primary key                    |
| stravaId       | integer      | Unique Strava user ID          |
| email          | varchar(255) | User email address             |
| firstName      | varchar(100) | First name                     |
| lastName       | varchar(100) | Last name                      |
| profilePicture | text         | Profile photo URL              |
| accessToken    | text         | Encrypted Strava access token  |
| refreshToken   | text         | Encrypted Strava refresh token |
| tokenExpiresAt | timestamp    | Token expiration time          |
| createdAt      | timestamp    | Account creation time          |
| updatedAt      | timestamp    | Last update time               |

### Activities Table

Stores Strava activity data:

| Column             | Type         | Description                     |
|--------------------|--------------|---------------------------------|
| id                 | serial       | Primary key                     |
| stravaId           | bigint       | Unique Strava activity ID       |
| userId             | integer      | Foreign key to users            |
| name               | varchar(255) | Activity name                   |
| type               | varchar(50)  | Activity type (ride, run, etc.) |
| distance           | numeric      | Distance in meters              |
| movingTime         | integer      | Moving time in seconds          |
| elapsedTime        | integer      | Elapsed time in seconds         |
| totalElevationGain | numeric      | Elevation gain in meters        |
| startDate          | timestamp    | Activity start date/time        |
| timezone           | varchar(100) | Activity timezone               |
| startLat           | numeric      | Starting latitude               |
| startLng           | numeric      | Starting longitude              |
| polyline           | text         | Encoded polyline for route      |
| averageSpeed       | numeric      | Average speed m/s               |
| maxSpeed           | numeric      | Maximum speed m/s               |
| createdAt          | timestamp    | Record creation time            |
| updatedAt          | timestamp    | Last update time                |

## 🔧 Drizzle CLI Commands

### Generate Migrations

When you modify the schema files, generate a migration:

```bash
yarn db:generate
```

This creates SQL migration files in the `drizzle/` directory.

### Apply Migrations

Run migrations against the database:

```bash
yarn db:migrate
```

### Push Schema (Development)

For rapid development, push schema changes directly without migrations:

```bash
yarn db:push
```

**⚠️ Warning**: This doesn't create migration files and should only be used in development.

### Drizzle Studio

Open a web-based database browser:

```bash
yarn db:studio
```

Access at `https://local.drizzle.studio`

## 🔍 Usage Examples

### Basic Query

```typescript
import {db} from '@/lib/db';
import {users} from '@/lib/db/schema';
import {eq} from 'drizzle-orm';

// Find a user by ID
const user = await db.select().from(users).where(eq(users.id, 1));
```

### Insert Data

```typescript
import {db} from '@/lib/db';
import {users, type NewUser} from '@/lib/db/schema';

const newUser: NewUser = {
    stravaId: 12345,
    email: 'rider@example.com',
    firstName: 'John',
    lastName: 'Doe',
};

const [created] = await db.insert(users).values(newUser).returning();
```

### Update Data

```typescript
import {db} from '@/lib/db';
import {users} from '@/lib/db/schema';
import {eq} from 'drizzle-orm';

await db
    .update(users)
    .set({firstName: 'Jane'})
    .where(eq(users.id, 1));
```

### Join Queries

```typescript
import {db} from '@/lib/db';
import {users, activities} from '@/lib/db/schema';
import {eq} from 'drizzle-orm';

const userWithActivities = await db
    .select()
    .from(users)
    .leftJoin(activities, eq(users.id, activities.userId))
    .where(eq(users.id, 1));
```

### Using Operations

```typescript
import {
    findUserByStravaId,
    createActivity,
    getUserActivities,
} from '@/lib/db/operations';

// Find user
const user = await findUserByStravaId(12345);

// Create activity
const activity = await createActivity({
    stravaId: 67890n,
    userId: user.id,
    name: 'Morning Ride',
    type: 'Ride',
    distance: '25000',
    // ...
});

// Get user's activities
const activities = await getUserActivities(user.id, {
    limit: 10,
    offset: 0,
});
```

## 🧪 Testing

The database module includes comprehensive tests for all components.

### Run All Tests

```bash
# Run all tests
yarn test

# Run only unit tests (skips database tests)
yarn test:unit

# Run integration tests (includes database)
yarn test:integration

# Watch mode
yarn jest:watch
```

### Test Environment

Tests use a separate test database to avoid conflicts. The `DB_TEST_SKIP=true` environment variable skips
database-dependent tests during CI/CD.

## 🐳 Docker Setup

The project uses Docker Compose to manage the PostgreSQL database:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: regionriders-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: regionriders
      POSTGRES_USER: regionriders_user
      POSTGRES_PASSWORD: regionriders_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Docker Commands

```bash
# Start database
docker-compose up -d postgres

# View logs
docker-compose logs -f postgres

# Stop database
docker-compose down

# Remove database and volumes (destructive)
docker-compose down -v
```

## 🔒 Security

### Connection Security

- **SSL**: Automatically enabled for production non-local hosts
- **Credentials**: Stored in environment variables, never committed to git
- **Tokens**: Strava tokens should be encrypted before storage (implement encryption layer)

### Best Practices

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Use environment-specific configs** - Different settings for dev/staging/prod
3. **Rotate credentials regularly** - Especially in production
4. **Limit database permissions** - Use least-privilege principle
5. **Enable SSL in production** - For non-local database connections

## 🚨 Troubleshooting

### Connection Issues

**Problem**: Cannot connect to database

```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:

1. Ensure Docker is running: `docker ps`
2. Check if PostgreSQL container is up: `docker-compose ps`
3. Start the database: `yarn db:up`
4. Verify environment variables in `.env.local`

### Migration Issues

**Problem**: Migration fails or is out of sync

```bash
Error: Migration failed
```

**Solution**:

1. Check current migration status: `yarn db:studio`
2. Reset database (dev only): `yarn db:reset`
3. Regenerate migrations: `yarn db:generate`
4. Apply migrations: `yarn db:migrate`

### Port Already in Use

**Problem**: Port 5432 is already in use

```bash
Error: bind: address already in use
```

**Solution**:

1. Check what's using the port: `lsof -i :5432`
2. Stop other PostgreSQL instances
3. Or change `POSTGRES_PORT` in `.env.local`

### Permission Denied

**Problem**: Cannot execute setup script

```bash
Permission denied: ./scripts/setup-db.sh
```

**Solution**:

```bash
chmod +x ./scripts/setup-db.sh
yarn db:setup
```

## 📚 Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit (Migrations)](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose](https://docs.docker.com/compose/)

## 🤝 Contributing

When making database changes:

1. **Update schema files** in `lib/db/schema/`
2. **Generate migration**: `yarn db:generate`
3. **Test migration**: Apply to local database and verify
4. **Update operations**: Add/modify queries in `lib/db/operations/`
5. **Write tests**: Add tests for new operations
6. **Update this README**: Document new tables or significant changes

## 📝 Notes

- **Migration files** are stored in `drizzle/` and should be committed to git
- **Connection pooling** is managed automatically by the PostgreSQL client
- **Type safety** is enforced throughout the database layer
- **Schema changes** require new migrations in production environments

