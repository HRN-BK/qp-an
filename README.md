This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

### 🧠 Spaced Repetition System (SRS)
- Advanced SRS algorithm with 6 mastery levels
- Intelligent progress tracking and difficulty adjustment
- Session-based memory management
- Mastered word reactivation after 90 days

### 📊 Study Analytics
- Comprehensive activity tracking
- Response time analysis
- Session summaries and progress visualization
- Mastery level distribution statistics

### 🎮 Interactive Learning
- Multiple game modes (listening, translation, synonym, fill-blank)
- Audio pronunciation support
- Real-time feedback and validation
- Adaptive difficulty based on performance

### 🧪 Quality Assurance
- 31+ unit tests for SRS logic
- Integration tests with Cypress
- Edge case validation
- Comprehensive test coverage

## Getting Started

First, install dependencies:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing

### Unit Tests
Run the comprehensive unit test suite for SRS logic and edge cases:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test tests/srs.test.ts

# Generate coverage report
npm run test:coverage
```

### Integration Tests
Run end-to-end tests with Cypress to simulate game flow:

```bash
# Install Cypress (first time only)
npx cypress install

# Open Cypress GUI for interactive testing
npx cypress open

# Run E2E tests headlessly
npx cypress run

# Run specific test file
npx cypress run --spec "cypress/e2e/gameFlow.cy.ts"
```

### Test Coverage
The test suite covers:
- ✅ SRS algorithm edge cases (wrong/correct answers)
- ✅ Mastery level progression and regression
- ✅ Session memory management
- ✅ Game flow integration (Cypress)
- ✅ API endpoint responses
- ✅ Database schema validation

## Database Management

### Production Migration Steps

1. **Backup your production database** before any migration:
   ```bash
   # Create backup
   pg_dump your_production_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test on staging environment first**:
   - Apply migrations to staging database
   - Run verification script
   - Test application functionality
   - Run back-fill script for existing data

3. **Apply to production**:
   ```bash
   # Run verification first
   psql -d your_production_db -f scripts/verify-migration.sql
   
   # Apply back-fill script for mastery_level
   psql -d your_production_db -f scripts/backfill-mastery-level.sql
   ```

### Migration Scripts

- `scripts/verify-migration.sql` - Verifies all required columns exist
- `scripts/backfill-mastery-level.sql` - Intelligently assigns mastery levels to existing data
- `migrations/` - Contains all database schema changes

### Database Schema Validation
After migration, verify the schema includes:

**vocabularies table:**
- `cefr_level` (integer)
- `tags` (text[])
- `synonyms` (text[])
- `antonyms` (text[])
- `collocations` (text[])

**user_vocabularies table:**
- `mastery_level` (integer, default 0)
- `last_mastered` (timestamp)
- `ease_factor` (decimal, default 2.5)
- `next_review` (timestamp)

**reviews table:**
- `response_time` (integer)
- `difficulty_rating` (integer)

## Deployment

### Pre-deployment Checklist

- [ ] All unit tests pass (`npm test`)
- [ ] Integration tests pass (`npx cypress run`)
- [ ] Database migration verified on staging
- [ ] Environment variables configured
- [ ] API endpoints responding correctly
- [ ] SRS algorithm functioning as expected

### Environment Variables

📋 **For detailed environment setup, see [Environment Variables Documentation](docs/env.md)**

#### Vercel Deployment Setup

1. **Copy the Vercel environment template:**
   ```bash
   # Use the provided template
   cat vercel.env
   ```

2. **Set up environment variables in Vercel Dashboard:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables
   - Add each variable from `vercel.env` template
   - Set Environment to "Production" for production variables
   - Use "Sensitive" option for secrets (API keys, service role keys)
   - Ensure Clerk keys use `live_` prefix for production
   - Ensure Supabase URLs point to your production project

#### Required Environment Variables:
```env
# Clerk Authentication (Production)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Supabase Database (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
OPENAI_API_KEY=sk-your_openai_key

# Database
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

⚠️ **Security Note:** Never commit actual secrets to version control. All sensitive variables should be in `.env.local` (already in `.gitignore`) for development and set in Vercel Dashboard for production.

### Deployment Steps

1. **Staging Deployment:**
   ```bash
   # Deploy to staging
   vercel --prod --env staging
   
   # Run post-deployment tests
   npm run test:e2e:staging
   ```

2. **Production Deployment:**
   ```bash
   # Deploy to production
   vercel --prod
   
   # Monitor deployment
   vercel logs --follow
   ```

3. **Post-deployment Verification:**
   - Test critical user flows
   - Verify SRS algorithm responses
   - Check database connectivity
   - Monitor error rates and performance

### Monitoring
After deployment, monitor:
- API response times
- Database query performance
- User session management
- SRS calculation accuracy
- Error rates and logs

## Project Structure

```
src/
├── lib/
│   ├── srs.ts                 # Spaced Repetition System logic
│   ├── __tests__/            # Unit tests
│   └── audio-utils.ts        # Audio functionality
├── hooks/
│   ├── useGameSession.ts     # Game state management
│   └── __tests__/           # Hook tests
├── app/
│   └── api/                 # API routes
cypress/
├── e2e/                     # End-to-end tests
├── component/               # Component tests
├── fixtures/                # Test data
└── support/                 # Test utilities
migrations/                  # Database migrations
scripts/                     # Deployment scripts
```

## Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **UI**: Radix UI, Tailwind CSS
- **Testing**: Jest, Cypress, Testing Library
- **AI**: OpenAI integration for content generation

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
