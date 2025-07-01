# Testing Documentation

This document outlines the comprehensive testing strategy for the AI Vocabulary application.

## Overview

Our testing approach includes:
- **Unit Tests**: Testing individual functions and components in isolation
- **Integration Tests**: Testing complete user workflows and interactions
- **Edge Case Testing**: Ensuring robustness under unusual conditions
- **Performance Testing**: Validating system performance under load

## Test Structure

### Unit Tests

#### SRS (Spaced Repetition System) Tests
Location: `src/lib/__tests__/srs.test.ts`

**Coverage Areas:**
- Mastery level progression (6 levels: New → Learning → Young → Mature → Proficient → Mastered)
- Consecutive answer tracking
- Session memory management
- Review scheduling algorithms
- Edge case handling

**Key Test Cases:**
```typescript
describe('SRS - calculateSpacedRepetition', () => {
  // Mastery progression tests
  it('should increase mastery level after 3 consecutive correct answers')
  it('should preserve mastery level on single wrong answer')
  it('should lower mastery level after 2 consecutive incorrect answers')
  
  // Edge cases
  it('should handle null/undefined dates gracefully')
  it('should handle invalid ease factor')
  it('should handle extreme consecutive counts')
})
```

#### Audio Utilities Tests
Location: `src/lib/__tests__/audio-utils.test.ts`

**Coverage Areas:**
- Audio playback functionality
- Web Speech API integration
- User interaction detection
- Audio caching mechanisms

#### Game Session Hook Tests
Location: `src/hooks/__tests__/useGameSession.test.ts`

**Coverage Areas:**
- Game state management
- Answer submission logic
- Score calculation
- Mode switching

### Integration Tests

#### Cypress E2E Tests
Location: `cypress/e2e/gameFlow.cy.ts`

**Test Scenarios:**
```typescript
describe('Game Flow', () => {
  it('displays the first vocabulary word')
  it('correctly processes a correct answer')
  it('correctly processes an incorrect answer')
  it('advances to the next word after answering')
})
```

**Mock Setup:**
- Authentication mocking
- API response mocking
- Consistent test data with fixtures

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Watch mode for development
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### Integration Tests

```bash
# Open Cypress Test Runner (GUI)
pnpm cypress:open

# Run E2E tests headlessly
pnpm test:e2e

# Run component tests
pnpm test:component
```

## Test Configuration

### Jest Configuration
File: `jest.config.js`

```javascript
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/node_modules/**',
  ],
}
```

### Cypress Configuration
File: `cypress.config.ts`

```typescript
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshot: false,
    viewportWidth: 1280,
    viewportHeight: 720,
  }
})
```

## Mock Data and Fixtures

### Test Vocabularies
File: `cypress/fixtures/vocabularies.json`

Contains realistic vocabulary data for consistent testing across all scenarios.

### Authentication Mocking
```typescript
cy.mockAuth() // Sets up test user session
cy.mockVocabAPI() // Mocks vocabulary API responses
```

## Test Best Practices

### Unit Test Guidelines

1. **Isolation**: Each test should be independent
2. **Descriptive Names**: Test names should clearly describe the behavior
3. **Setup/Teardown**: Use `beforeEach`/`afterEach` for consistent state
4. **Edge Cases**: Test boundary conditions and error scenarios

### Integration Test Guidelines

1. **User-Centric**: Test from the user's perspective
2. **Realistic Data**: Use production-like test data
3. **Error Scenarios**: Test both success and failure paths
4. **Performance**: Validate response times and loading states

## Test Data Management

### Session Memory Testing
The SRS system uses session memory for tracking consecutive incorrect answers. Tests ensure:
- Proper isolation between users
- Correct tracking per vocabulary item
- Memory cleanup between test runs

### Database State
- Tests use mocked API responses to avoid database dependencies
- Migration scripts include verification queries
- Staging environment testing validates real database scenarios

## Coverage Goals

### Current Coverage
- **SRS Logic**: 100% function coverage, 95%+ line coverage
- **Game Session**: 90%+ function coverage
- **Audio Utils**: 85%+ function coverage

### Coverage Reports
Generated coverage reports include:
- Line coverage
- Function coverage
- Branch coverage
- Statement coverage

## Continuous Integration

### Automated Testing
- All tests run on every commit
- Coverage reports generated automatically
- Failed tests block deployments

### Pre-deployment Validation
1. Unit tests must pass
2. Integration tests must pass
3. Coverage thresholds must be met
4. Migration verification successful

## Debugging Tests

### Common Issues

1. **Session Memory Conflicts**
   - Solution: Use `clearAllSessionMemory()` in test setup

2. **Async Operation Timing**
   - Solution: Proper use of `await` and `cy.wait()`

3. **Mock Data Inconsistency**
   - Solution: Use centralized fixture files

### Debug Commands

```bash
# Run specific test file
pnpm test src/lib/__tests__/srs.test.ts

# Run tests with verbose output
pnpm test --verbose

# Debug Cypress tests
pnpm cypress:open --headed --no-exit
```

## Performance Testing

### Load Testing Scenarios
- Multiple concurrent user sessions
- High-frequency answer submissions
- Large vocabulary datasets
- Session memory stress testing

### Performance Metrics
- Response time < 100ms for SRS calculations
- Memory usage < 50MB for session data
- Database query execution < 50ms

## Future Testing Enhancements

### Planned Additions
1. Visual regression testing
2. Accessibility testing automation
3. Mobile device testing
4. Load testing automation
5. API contract testing

### Test Infrastructure Improvements
1. Parallel test execution
2. Test result analytics
3. Automated test data generation
4. Cross-browser testing matrix
