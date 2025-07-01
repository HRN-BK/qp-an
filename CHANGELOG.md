# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2024-12-19

### Added

#### 🧠 Spaced Repetition System (SRS)
- Comprehensive SRS algorithm with 6 mastery levels (New, Learning, Young, Mature, Proficient, Mastered)
- Intelligent mastery level progression based on consecutive correct answers
- Mastery level preservation on single wrong answers
- Session-based tracking of consecutive incorrect answers
- Mastered word reactivation after 90 days
- Edge case handling for null dates, invalid ease factors, and extreme values

#### 📊 Study Tracking & Analytics
- New `study_activities` table to capture every user interaction
- Session-based learning with `session_summaries` tracking
- Response time measurement and analysis
- Vocabulary mastery statistics with distribution views
- Recent study performance analytics
- Activity type tracking (flashcard, quiz, spelling, etc.)

#### 🧪 Comprehensive Testing Suite
- **Unit Tests**: Complete test coverage for SRS logic with 31 test cases
- **Integration Tests**: Cypress E2E testing for game flow scenarios
- **Edge Case Testing**: Thorough validation of SRS algorithm edge cases
- **Mock Data**: Realistic test fixtures for consistent testing
- **Test Isolation**: Proper session memory management between tests

#### 🛠 Database Enhancements
- New mastery level tracking with automatic updates
- Study activity logging with detailed metadata
- Session summary calculations with triggers
- Performance-optimized indexes for better query speed
- Row Level Security (RLS) policies for data protection
- Database functions for automatic mastery level updates

#### 📈 Performance & Monitoring
- Session memory cleanup for optimal performance
- Automatic session statistics calculation
- Real-time mastery level updates based on performance
- Comprehensive migration verification scripts

#### 🔧 Developer Experience
- Jest configuration with Next.js integration
- Cypress setup for component and E2E testing
- Migration runner scripts for staging and production
- Database verification scripts for deployment confidence
- Comprehensive documentation updates

### Enhanced

#### 🎯 Game Flow Logic
- Improved answer validation with case-insensitive matching
- Better session state management
- Enhanced user interaction tracking
- More robust error handling

#### 🗄 Database Schema
- Extended `vocabularies` table with mastery tracking
- Added comprehensive indexes for performance
- Implemented database triggers for automation
- Enhanced data integrity with proper constraints

### Fixed

#### 🐛 Bug Fixes
- Resolved session memory isolation issues in tests
- Fixed Jest configuration warnings
- Corrected module name mapping for testing
- Improved test setup and teardown processes

### Security

#### 🔒 Data Protection
- Implemented Row Level Security on all new tables
- User-specific data access policies
- Secure session memory management
- Protected API endpoints with proper validation

### Migration Notes

#### 📋 Database Changes
- Run migration `004_add_study_tracking_schema.sql` to add new tables
- Execute back-fill script `005_vocabulary_mastery_level_backfill.sql` for existing data
- Verify migration success with provided verification scripts

#### 🧪 Testing Setup
- New Jest configuration requires no additional setup
- Cypress tests can be run with `npm run cypress:open` or `npm run test:e2e`
- All existing functionality remains backward compatible

#### 🚀 Deployment
- Use `npm run migrate:staging` for staging environment
- Use `npm run migrate:production --confirm` for production deployment
- Monitor mastery level distribution after back-fill completion

### Technical Debt

#### ✨ Code Quality
- Added comprehensive TypeScript interfaces for SRS data
- Improved error handling across all SRS functions
- Enhanced code documentation and inline comments
- Better separation of concerns in test files

### Performance Metrics

#### 📊 Improvements
- Database query optimization with new indexes
- Session memory management for reduced memory usage
- Faster mastery level calculations with cached values
- Improved test execution speed with better isolation

---

## [0.1.0] - 2024-12-18

### Added
- Initial project setup with Next.js 15
- Basic vocabulary management system
- User authentication with Clerk
- Supabase database integration
- Basic game modes (listening, translation, synonym, fill_blank)
- UI components with Radix UI and Tailwind CSS
- Audio pronunciation support
- Tag-based vocabulary organization

### Features
- Vocabulary CRUD operations
- AI-powered content suggestions
- Multiple choice and fill-in-the-blank exercises
- Progress tracking
- Dark mode support
- Responsive design

### Infrastructure
- TypeScript configuration
- ESLint and code formatting
- Environment variable management
- Basic database schema
- API route handlers
