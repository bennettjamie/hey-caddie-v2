# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ThemeContext for dark/light mode theme persistence
- AchievementToast component for displaying player achievements
- ConfirmationModal component for user confirmation dialogs
- Public courses library system (`lib/publicCourses.ts`)
- Statistics tracking system (`lib/stats.ts`)
- Logo image to public assets
- **Constants file** (`lib/constants.ts`) - Centralized location for all magic numbers, strings, and configuration values (452 lines, 50+ constants)
- **Logging utility** (`lib/logger.ts`) - Comprehensive logging system with multiple log levels, structured logging, and error tracking integration (452 lines)
- **Logger tests and demos** (`lib/logger.test.ts`, `context/GameContext.MIGRATED_EXAMPLE.tsx`) - Working examples and test suite
- **GitHub templates** - Issue templates (bug report, feature request), pull request template, and configuration
- **GitHub Actions CI/CD** - Automated testing, linting, type-checking, and deployment workflows
- **CHANGELOG.md** - Version history tracking following Keep a Changelog format
- **Comprehensive documentation** (48 KB) - Migration guides, examples, and best practices for constants and logger utilities
- **Session summary** - Complete overview of best practices implementation

### Changed
- Enhanced Settings modal button responsiveness and UI interactions
- Improved skins push logic in betting system
- Enhanced par editor buttons in course setup
- Updated global CSS styling in `app/globals.css`
- Modified app layout structure in `app/layout.tsx`
- Improved ActiveRound component usability
- Enhanced CourseAmendmentModal functionality
- Refined CourseImporter user experience
- Updated CourseParSetup interface
- Improved CourseSelector performance
- Enhanced InstallPrompt component
- Updated PermissionsDashboard UI
- Refined PlayerSelector component
- Improved RoundFinalSummary display
- Updated game context state management
- Enhanced voice context functionality
- Improved Firestore type definitions
- Refined game type definitions
- Enhanced course management utilities
- Updated player management system
- Improved round persistence logic
- Refined voice query processing
- Updated PWA manifest configuration
- Enhanced service worker caching strategy

### Removed
- Firebase test page (`app/test-firebase/page.tsx`)
- Legacy Firebase JavaScript file (`lib/firebase.js`)
- Test Firebase utilities (`lib/testFirebase.ts`)

### Fixed
- Build errors for Vercel deployment readiness
- Test suite errors affecting deployment
- Authentication UI restoration issues
- Firebase configuration safety checks

### Security
- Updated Next.js to version 16.1.1 to address CVE-2025-66478

## [1.0.0] - 2024-12-19

### Added
- Voice-activated scoring system with "Hey Caddie" hotword detection
- Natural language score input processing
- MRTZ currency system for bet tracking
- Comprehensive betting system (Fundatory, Skins, Nassau)
- MRTZ ledger for transaction history
- MRTZ settlement agreements
- MRTZ carry-over bet tracking
- MRTZ good deeds submission system
- Course management system with CRUD operations
- Course import from dgcoursereview.com
- Course scraping scripts for bulk import
- Player management and profiles
- Round history tracking
- Player statistics dashboard
- Offline-first architecture with Firebase sync
- Progressive Web App (PWA) support
- Service worker for offline functionality
- LocalStorage persistence with cloud backup
- Offline sync queue with retry logic
- Firebase Authentication (Email/Password, Google, Anonymous)
- Firestore database with composite indexes
- Web Speech API integration for voice recognition and synthesis
- Fuzzy search for player names using Fuse.js
- Location-based course search
- Multiple course layouts support (Red, Blue, Gold tees)
- Custom par settings per hole
- Active round tracking with real-time updates
- Voice command reference guide
- Comprehensive documentation (Firebase setup, course import, testing guides)
- Testing framework with Vitest
- Unit tests for betting calculations
- Unit tests for MRTZ ledger operations
- Unit tests for MRTZ settlements

### Technical
- Next.js 16 App Router architecture
- React 19 with TypeScript
- Firebase 12 integration
- IndexedDB persistence for offline support
- Workbox-based service worker
- Responsive mobile-first design
- TypeScript strict mode configuration
- ESLint code quality checks
- Firestore security rules
- Composite database indexes for query optimization

---

## How to Update This Changelog

When making changes, add them under the `[Unreleased]` section using these categories:

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

When releasing a new version:
1. Change `[Unreleased]` to the version number and date
2. Create a new `[Unreleased]` section above it
3. Update the version in `package.json`
4. Commit with message: `chore: release v#.#.#`

### Version Numbering Guide

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes, incompatible API changes
- **MINOR** (1.0.0 → 1.1.0): New features, backwards-compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backwards-compatible

---

**Note**: This changelog started on 2026-01-06. Prior development history is summarized in the 1.0.0 release.
