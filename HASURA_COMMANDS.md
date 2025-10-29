# Hasura CLI Commands Reference

## Setup & Initialization

```bash
# Initialize Hasura project (creates config files)
hasura init <project-name>

# Navigate to project directory
cd <project-name>

# Configure Hasura endpoint
hasura metadata apply --endpoint <your-hasura-endpoint> --admin-secret <your-admin-secret>
```

## Console & Development

```bash
# Launch Hasura console (UI for managing database & GraphQL)
hasura console

# Launch console with specific endpoint
hasura console --endpoint <your-hasura-endpoint> --admin-secret <your-admin-secret>
```

## Migrations (Database Schema)

```bash
# Create a new migration
hasura migrate create <migration-name> --database-name <db-name>

# Apply all pending migrations
hasura migrate apply --database-name <db-name>

# Check migration status
hasura migrate status --database-name <db-name>

# Rollback last migration
hasura migrate delete --version <version-number> --database-name <db-name>

# Squash multiple migrations into one
hasura migrate squash --name <new-migration-name> --from <version> --database-name <db-name>
```

## Metadata (GraphQL Schema, Permissions, Relationships)

```bash
# Export current metadata to files
hasura metadata export

# Apply metadata from files to server
hasura metadata apply

# Reload metadata
hasura metadata reload

# Clear metadata
hasura metadata clear

# Check metadata consistency
hasura metadata inconsistency status
```

## Seeds (Test Data)

```bash
# Create a new seed file
hasura seed create <seed-name> --database-name <db-name>

# Apply all seed files
hasura seed apply --database-name <db-name>

# Apply specific seed file
hasura seed apply --file seeds/<seed-file>.sql --database-name <db-name>
```

## Deploy & Version Control

```bash
# Deploy to cloud/production
hasura deploy --endpoint <prod-endpoint> --admin-secret <prod-admin-secret>

# Apply all migrations and metadata
hasura migrate apply --database-name <db-name> && hasura metadata apply
```

## Common Workflows

### Add Row-Level Security (RLS) Policies

1. Create a new migration:
   ```bash
   hasura migrate create add_rls_policies --database-name default
   ```

2. Edit the generated SQL file in `migrations/<timestamp>_add_rls_policies/up.sql`:
   ```sql
   -- Enable RLS on table
   ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

   -- Create policy for inserts
   CREATE POLICY events_insert_policy ON public.events
     FOR INSERT
     WITH CHECK (true);

   -- Create policy for selects (users can only see their own events)
   CREATE POLICY events_select_policy ON public.events
     FOR SELECT
     USING (user_id = current_setting('hasura.user.id')::uuid);
   ```

3. Apply the migration:
   ```bash
   hasura migrate apply --database-name default
   ```

4. Export and apply metadata:
   ```bash
   hasura metadata export
   hasura metadata apply
   ```

### Track Tables & Set Permissions

```bash
# Launch console to track tables visually
hasura console

# Or use metadata commands
hasura metadata apply
```

### Full Setup for New Environment

```bash
# 1. Apply all migrations
hasura migrate apply --all-databases

# 2. Apply metadata
hasura metadata apply

# 3. Apply seeds (optional)
hasura seed apply --database-name default

# 4. Reload metadata
hasura metadata reload
```

## Environment Variables

Create a `.env` file or export these:

```bash
HASURA_GRAPHQL_ENDPOINT=https://your-project.hasura.app
HASURA_GRAPHQL_ADMIN_SECRET=your-admin-secret
HASURA_GRAPHQL_DATABASE_URL=postgres://user:password@host:port/dbname
```

## Useful Flags

- `--endpoint <url>` - Hasura GraphQL endpoint
- `--admin-secret <secret>` - Admin secret for authentication
- `--database-name <name>` - Target database (e.g., "default")
- `--skip-update-check` - Skip version update checks
- `--log-level <level>` - Set log level (DEBUG, INFO, WARN, ERROR)

## Project Structure

```
hasura/
├── config.yaml           # Hasura config
├── metadata/             # GraphQL schema, permissions, relationships
│   ├── databases.yaml
│   ├── tables.yaml
│   └── version.yaml
├── migrations/           # Database schema changes
│   └── default/
│       └── <timestamp>_<name>/
│           ├── up.sql
│           └── down.sql
└── seeds/               # Test data
    └── default/
        └── <seed-name>.sql
```
