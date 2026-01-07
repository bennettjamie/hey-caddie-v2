# Logger Migration Guide

This guide explains how to migrate from `console.log` statements to the centralized logger utility.

## Overview

The `lib/logger.ts` module provides a comprehensive logging system with:
- **Multiple log levels**: debug, info, warn, error
- **Environment awareness**: Debug/info disabled in production
- **Structured logging**: Context objects for detailed information
- **Performance timing**: Built-in timer utilities
- **Specialized loggers**: Domain-specific logging methods
- **Error tracking integration**: Ready for Sentry or similar services

## Quick Start

### Basic Usage

```typescript
import { logger } from '@/lib/logger';

// Instead of console.log
logger.debug('User clicked button');

// Instead of console.info
logger.info('Round started successfully');

// Instead of console.warn
logger.warn('Firebase connection unstable');

// Instead of console.error
logger.error('Failed to save round', error);
```

### With Context

Add context objects for structured logging:

```typescript
logger.info('Player added to round', {
  playerId: player.id,
  playerName: player.name,
  roundId: currentRound.id,
});

logger.error('Score update failed', error, {
  playerId: 'player123',
  holeNumber: 5,
  attemptedScore: -1,
});
```

## Migration Examples

### Example 1: Simple Debug Logging

**Before:**
```typescript
console.log('VoiceProvider mounted');
console.log('Round ended:', roundData);
```

**After:**
```typescript
import { logger } from '@/lib/logger';

logger.debug('VoiceProvider mounted');
logger.debug('Round ended', { roundData });
```

### Example 2: Error Logging

**Before:**
```typescript
} catch (error) {
    console.error('Error saving round:', error);
}
```

**After:**
```typescript
import { logger } from '@/lib/logger';

} catch (error) {
    logger.error('Error saving round', error, {
        roundId: currentRound.id,
        playerCount: players.length,
    });
}
```

### Example 3: Warning Messages

**Before:**
```typescript
console.warn('Firebase connection lost, queueing operation');
```

**After:**
```typescript
import { logger } from '@/lib/logger';

logger.warn('Firebase connection lost, queueing operation', {
    operationType: 'saveRound',
    queueSize: syncQueue.length,
});
```

### Example 4: Specialized Domain Logging

**Before:**
```typescript
console.log('Starting round at', course.name);
console.log('Calculating skins for hole', holeNumber);
console.log('Syncing to Firebase...');
console.log('Voice command recognized:', transcript);
```

**After:**
```typescript
import { logger } from '@/lib/logger';

logger.round('Starting round', { courseName: course.name });
logger.betting('Calculating skins', { holeNumber });
logger.sync('Syncing to Firebase', { operationType: 'round' });
logger.voice('Command recognized', { transcript });
```

### Example 5: Performance Timing

**Before:**
```typescript
const start = Date.now();
// ... expensive operation
console.log('Operation took', Date.now() - start, 'ms');
```

**After:**
```typescript
import { logger } from '@/lib/logger';

logger.time('expensive-operation');
// ... expensive operation
logger.timeEnd('expensive-operation'); // Logs: "Timer ended: expensive-operation {duration: 123.45ms}"
```

### Example 6: Grouped Logging

**Before:**
```typescript
console.log('=== Starting Round End Process ===');
console.log('Calculating betting results...');
console.log('Updating MRTZ balances...');
console.log('Saving to Firebase...');
console.log('=== Round End Complete ===');
```

**After:**
```typescript
import { logger } from '@/lib/logger';

logger.group('Round End Process');
logger.info('Calculating betting results');
logger.info('Updating MRTZ balances');
logger.info('Saving to Firebase');
logger.groupEnd();
```

### Example 7: Table Logging

**Before:**
```typescript
console.log('Player scores:', scores);
```

**After:**
```typescript
import { logger } from '@/lib/logger';

logger.table(scores, ['playerName', 'totalScore', 'relativeScore']);
```

## Specialized Logger Methods

Use domain-specific loggers for better organization:

```typescript
// Round operations
logger.round('Round started', { courseId, playerCount });
logger.round('Hole completed', { holeNumber, scores });
logger.round('Round ended', { finalScores });

// Betting operations
logger.betting('Fundatory bet added', { playerId, holeNumber });
logger.betting('Skins calculated', { winner, amount });
logger.betting('Nassau results', { results });

// MRTZ operations
logger.mrtz('Balance updated', { playerId, newBalance });
logger.mrtz('Ledger entry created', { entryId, amount });
logger.mrtz('Settlement recorded', { settlementId });

// Voice operations
logger.voice('Hotword detected', { transcript });
logger.voice('Command processed', { command, result });
logger.voice('Recognition failed', { error: errorMessage });

// Sync operations
logger.sync('Queue operation added', { type, dataSize });
logger.sync('Sync completed', { syncedCount, failedCount });
logger.sync('Retry scheduled', { retryCount, delay });

// Firebase operations
logger.firebase('Document saved', { collection, docId });
logger.firebase('Query executed', { collection, filters });
logger.firebase('Connection status changed', { online: true });

// Storage operations
logger.storage('Data saved to localStorage', { key, size });
logger.storage('Data loaded from cache', { key });
logger.storage('Cache cleared', { reason });

// API operations
logger.api('GET', '/api/courses/import', { courseId });
logger.api('POST', '/api/players', { playerId });
```

## Log Levels Guide

### When to Use Each Level

**Debug** - Detailed information for debugging (disabled in production)
- Function entry/exit
- Variable values
- Detailed state changes
- Performance measurements
```typescript
logger.debug('Entering updateScore function', { playerId, holeNumber });
```

**Info** - General informational messages (disabled in production)
- Successful operations
- State transitions
- User actions
```typescript
logger.info('Round started successfully', { roundId });
```

**Warn** - Warning messages (always shown)
- Recoverable errors
- Deprecated usage
- Unexpected states
- Connection issues
```typescript
logger.warn('Falling back to offline mode', { reason });
```

**Error** - Error messages (always shown)
- Exceptions
- Failed operations
- Critical issues
```typescript
logger.error('Failed to save round', error, { roundId });
```

## Migration Priority

### High Priority - User-Facing Errors (Migrate First)

Files with error handling that affects users:
1. `context/GameContext.tsx` - Round management errors
2. `lib/rounds.ts` - Round persistence errors
3. `lib/offlineSync.ts` - Sync failures
4. `lib/firebase.ts` - Firebase connection errors
5. `lib/mrtz.ts` - MRTZ calculation errors

**Migration approach:**
```typescript
// Replace console.error with detailed error logging
logger.error('Operation failed', error, {
    operation: 'saveRound',
    roundId: round.id,
    timestamp: new Date().toISOString(),
});
```

### Medium Priority - Debugging Information

Files with heavy debugging output:
1. `context/VoiceContext.tsx` - Voice recognition debugging
2. `components/ActiveRound.tsx` - UI state debugging
3. `lib/voiceQueries.ts` - Query processing debugging

**Migration approach:**
```typescript
// Replace console.log with debug logging
logger.debug('Voice command processed', {
    command: parsedCommand,
    confidence: recognitionResult.confidence,
});
```

### Low Priority - Informational Messages

Files with general logging:
1. `app/page.tsx` - Navigation and UI events
2. `components/**/*.tsx` - Component lifecycle events

## Configuration

### Development vs Production

The logger automatically adjusts based on `NODE_ENV`:

**Development** (default):
- All log levels shown (debug, info, warn, error)
- Colored console output
- Timestamps enabled
- Stack traces enabled

**Production** (default):
- Only warn and error shown
- Debug/info logs suppressed
- Errors sent to tracker (if configured)

### Custom Configuration

Override defaults in your app initialization:

```typescript
// app/layout.tsx or app/page.tsx
import { logger } from '@/lib/logger';

// Enable debug in production for troubleshooting
if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
  logger.configure({
    enabled: true,
    minLevel: 'debug',
  });
}
```

### Error Tracking Integration

Integrate with Sentry or other error tracking:

```typescript
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

logger.configure({
  errorTracker: {
    captureException: (error, context) => {
      Sentry.captureException(error, { extra: context });
    },
    captureMessage: (message, level, context) => {
      Sentry.captureMessage(message, {
        level: level as Sentry.SeverityLevel,
        extra: context,
      });
    },
  },
});
```

## Best Practices

### 1. Always Add Context

**❌ Bad:**
```typescript
logger.error('Save failed', error);
```

**✅ Good:**
```typescript
logger.error('Save failed', error, {
  operation: 'saveRound',
  roundId: round.id,
  playerCount: players.length,
  timestamp: new Date().toISOString(),
});
```

### 2. Use Appropriate Log Levels

**❌ Bad:**
```typescript
logger.debug('Critical error: Database corrupted!');
logger.error('User clicked button');
```

**✅ Good:**
```typescript
logger.error('Critical error: Database corrupted!', error);
logger.debug('User clicked button', { buttonId: 'start-round' });
```

### 3. Use Specialized Loggers

**❌ Bad:**
```typescript
logger.info('Round started');
logger.info('Skins bet added');
logger.info('Firebase saved');
```

**✅ Good:**
```typescript
logger.round('Round started', { courseId });
logger.betting('Skins bet added', { value, participants });
logger.firebase('Document saved', { collection: 'rounds' });
```

### 4. Don't Log Sensitive Data

**❌ Bad:**
```typescript
logger.info('User logged in', {
  email: user.email,
  password: credentials.password, // Never log passwords!
  token: authToken, // Never log tokens!
});
```

**✅ Good:**
```typescript
logger.info('User logged in', {
  userId: user.id,
  loginMethod: 'email',
});
```

### 5. Use Performance Timers

**❌ Bad:**
```typescript
const start = Date.now();
await expensiveOperation();
console.log('Took', Date.now() - start, 'ms');
```

**✅ Good:**
```typescript
logger.time('expensive-operation');
await expensiveOperation();
logger.timeEnd('expensive-operation');
```

## File-by-File Migration Checklist

### Phase 1: Core Logic (Week 1)
- [ ] `context/GameContext.tsx`
  - Replace ~20 console.log → logger.debug/info
  - Replace ~5 console.error → logger.error with context
  - Replace ~3 console.warn → logger.warn

- [ ] `lib/offlineSync.ts`
  - Replace console.log → logger.sync
  - Add error context to logger.error calls

- [ ] `lib/rounds.ts`
  - Replace console.log → logger.round
  - Add detailed error logging

### Phase 2: Voice & UI (Week 2)
- [ ] `context/VoiceContext.tsx`
  - Replace console.log → logger.voice
  - Add performance timers for recognition

- [ ] `components/ActiveRound.tsx`
  - Replace console.log → logger.debug
  - Group related operations

### Phase 3: Utilities (Week 3)
- [ ] `lib/courses.ts` → logger.firebase/logger.storage
- [ ] `lib/players.ts` → logger.firebase/logger.storage
- [ ] `lib/mrtz.ts` → logger.mrtz
- [ ] `lib/betting.ts` → logger.betting
- [ ] `lib/voiceQueries.ts` → logger.voice

### Phase 4: Components (Week 4)
- [ ] All remaining components
- [ ] Remove any leftover console.log statements

## Testing

After migration, verify:
1. **Development**: All logs appear with proper formatting
2. **Production**: Only warnings and errors appear
3. **Context**: Error logs include useful debugging context
4. **Performance**: No noticeable overhead from logging

## Verification Script

Run this to find remaining console statements:

```bash
# Find all console.log (should be 0 after migration)
grep -r "console\.log" --include="*.tsx" --include="*.ts" --exclude-dir="node_modules" .

# Find all console.error (should use logger.error instead)
grep -r "console\.error" --include="*.tsx" --include="*.ts" --exclude-dir="node_modules" .

# Find all console.warn (should use logger.warn instead)
grep -r "console\.warn" --include="*.tsx" --include="*.ts" --exclude-dir="node_modules" .
```

## Rollback Plan

If you need to temporarily disable the logger:

```typescript
import { disableLogging } from '@/lib/logger';

// Disable all logging (useful for tests)
disableLogging();
```

Or replace with original console (emergency use only):

```typescript
import { restoreConsole } from '@/lib/logger';

// Restore native console methods
restoreConsole();
```

## Common Pitfalls

### 1. Logging in Loops
**❌ Bad:**
```typescript
players.forEach(player => {
  logger.debug('Processing player', { player }); // Too verbose!
});
```

**✅ Good:**
```typescript
logger.debug('Processing players', { count: players.length });
players.forEach(player => {
  // Do work without logging each iteration
});
logger.debug('Players processed');
```

### 2. Over-Logging
**❌ Bad:**
```typescript
logger.debug('Function started');
logger.debug('Variable initialized', { var1 });
logger.debug('Condition checked', { result });
logger.debug('Function ending');
```

**✅ Good:**
```typescript
logger.debug('Processing request', { var1, conditionResult });
```

### 3. Under-Logging Errors
**❌ Bad:**
```typescript
} catch (error) {
  logger.error('Error'); // No context!
}
```

**✅ Good:**
```typescript
} catch (error) {
  logger.error('Failed to save round', error, {
    roundId: round.id,
    operation: 'endRound',
    playerCount: players.length,
  });
}
```

---

**Next Steps**: Start with `context/GameContext.tsx` as it has the most console statements and is the most critical file.
