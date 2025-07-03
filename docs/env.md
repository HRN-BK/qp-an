# Environment Variables Documentation

This document lists all environment variables used in the AI Vocab application.

## Required Environment Variables

| Name | Scope | Default | Description | Dev vs Prod |
|------|-------|---------|-------------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client | - | Clerk's public API key for identity management on the client side | ✅ Different |
| `NEXT_PUBLIC_SUPABASE_URL` | Client | - | Supabase project URL accessible from client side | ✅ Different |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | - | Supabase anonymous access key for client-side operations | ✅ Different |
| `CLERK_SECRET_KEY` | Server | - | Clerk's secret API key for secure server-side operations | ✅ Different |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | - | Supabase service role key with full database access | ✅ Different |
| `OPENAI_API_KEY` | Server | - | OpenAI API key for GPT model access and vocabulary extraction | ✅ Different |

## Optional Environment Variables

| Name | Scope | Default | Description | Dev vs Prod |
|------|-------|---------|-------------|-------------|
| `NODE_ENV` | Server | `development` | Environment mode (development, production, test) | ✅ Different |
| `DATABASE_URL` | Server | - | Postgres database URL for Prisma ORM | ✅ Different |
| `DIRECT_URL` | Server | - | Direct Postgres URL for Prisma migrations (bypasses pooling) | ✅ Different |

## Testing Environment Variables

| Name | Scope | Default | Description |
|------|-------|---------|-------------|
| `TEST_OPENAI_API_KEY` | Test | - | Mock OpenAI API key for testing |
| `TEST_SUPABASE_URL` | Test | - | Mock Supabase URL for testing |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | Test | - | Mock Supabase service key for testing |
| `TEST_CLERK_PUBLISHABLE_KEY` | Test | - | Mock Clerk publishable key for testing |
| `TEST_CLERK_SECRET_KEY` | Test | - | Mock Clerk secret key for testing |

## Staging Environment Variables (for Migration Scripts)

| Name | Scope | Default | Description |
|------|-------|---------|-------------|
| `STAGING_SUPABASE_URL` | Server | - | Supabase URL for staging environment |
| `STAGING_SUPABASE_ANON_KEY` | Server | - | Supabase anonymous key for staging environment |

## Environment Variable Usage

### Client-side Variables (NEXT_PUBLIC_*)
These variables are exposed to the browser and must be prefixed with `NEXT_PUBLIC_`:
- Used in React components and client-side code
- Safe to expose publicly (authentication tokens, public API keys)
- Available in `src/lib/env.ts` validation

### Server-side Variables
These variables are only available on the server:
- Used in API routes, middleware, and server components
- Contains sensitive secrets and keys
- Validated in `src/lib/env.ts` when `isServer` is true

### Database Variables
- `DATABASE_URL`: Used by Prisma for database connections
- `DIRECT_URL`: Used by Prisma for migrations and direct connections

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit secrets to version control** - All sensitive variables should be in `.env.local` (already in `.gitignore`)
2. **Different keys per environment** - Use separate Clerk apps and Supabase projects for dev/staging/production
3. **Service role key protection** - `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and should be highly protected
4. **OpenAI API key rotation** - Rotate OpenAI keys regularly and monitor usage

## Environment Setup

### Development (.env.local)
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Services
OPENAI_API_KEY=sk-...

# Database (for Prisma)
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

# Testing (optional)
TEST_OPENAI_API_KEY=test-key
TEST_SUPABASE_URL=https://test.supabase.co
TEST_SUPABASE_SERVICE_ROLE_KEY=test-service-key
TEST_CLERK_PUBLISHABLE_KEY=test-clerk-key
TEST_CLERK_SECRET_KEY=test-clerk-secret
```

### Production
Production variables should be set in your deployment platform (Vercel, AWS, etc.) and use production Clerk/Supabase projects.

## Validation

Environment variables are validated at runtime in `src/lib/env.ts`:
- Client variables are always validated
- Server variables are only validated when `typeof window === "undefined"`
- Missing required variables will throw an error with descriptive message

## Migration Scripts

The following scripts use environment variables:
- `scripts/run-migration.js` - Uses staging/production Supabase credentials
- `scripts/run-db-migration.js` - Uses service role key for direct database access
