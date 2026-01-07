# Logger Usage Examples

Real-world examples of using the HeyCaddie logger in different scenarios.

## Basic Examples

### Simple Logging

```typescript
import { logger } from '@/lib/logger';

// Debug information (development only)
logger.debug('Component mounted');
logger.debug('State updated', { newValue: state });

// General information (development only)
logger.info('User logged in successfully');
logger.info('Round started', { courseId: '123', playerCount: 4 });

// Warnings (always shown)
logger.warn('Network connection unstable');
logger.warn('Using fallback value', { fallback: defaultValue });

// Errors (always shown)
logger.error('Failed to save data', error);
logger.error('API request failed', error, { endpoint: '/api/rounds' });
```

## Real HeyCaddie Examples

### Example 1: Round Management (GameContext.tsx)

```typescript
import { logger } from '@/lib/logger';
import { STORAGE_KEYS, ROUND_STATUS } from '@/lib/constants';

// Starting a round
const startRound = (course: Course, players: Player[]) => {
  logger.round('Starting new round', {
    courseId: course.id,
    courseName: course.name,
    playerCount: players.length,
    playerNames: players.map(p => p.name),
  });

  try {
    const newRound: GameRound = {
      course,
      players,
      scores: {},
      startTime: new Date().toISOString(),
      status: ROUND_STATUS.ACTIVE,
      activeHole: 1,
      teeOrder: players.map(p => p.id),
      currentTeeIndex: 0,
    };

    setCurrentRound(newRound);
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROUND, JSON.stringify(newRound));

    logger.round('Round started successfully', {
      roundId: newRound.startTime,
      firstHole: 1,
    });
  } catch (error) {
    logger.error('Failed to start round', error, {
      courseId: course.id,
      playerCount: players.length,
    });
    throw error;
  }
};

// Ending a round
const endRound = async () => {
  logger.time('end-round');
  logger.group('End Round Process');

  try {
    logger.round('Calculating final scores');
    const finalScores = calculateFinalScores();

    logger.round('Resolving betting results');
    const bettingResults = await resolveBets();

    logger.round('Updating MRTZ balances');
    await updateMRTZBalances(bettingResults);

    logger.round('Saving round to Firebase');
    await saveRound(currentRound);

    logger.groupEnd();
    logger.timeEnd('end-round');

    logger.round('Round ended successfully', {
      roundId: currentRound.startTime,
      finalScores,
      totalMRTZ: bettingResults.totalMRTZ,
    });

    return finalScores;
  } catch (error) {
    logger.groupEnd();
    logger.timeEnd('end-round');
    logger.error('Failed to end round', error, {
      roundId: currentRound?.startTime,
      activeHole: currentRound?.activeHole,
    });
    throw error;
  }
};
```

### Example 2: Voice Recognition (VoiceContext.tsx)

```typescript
import { logger } from '@/lib/logger';

// Hotword detection
const onHotwordResult = (event: any) => {
  const transcript = event.results[0][0].transcript.toLowerCase();

  logger.voice('Speech detected', {
    transcript,
    confidence: event.results[0][0].confidence,
  });

  if (transcript.includes('hey caddie')) {
    logger.voice('Hotword detected', { transcript });
    startListening();
  } else {
    logger.debug('Hotword not detected', { transcript });
  }
};

// Command processing
const processVoiceCommand = async (command: string) => {
  logger.time('voice-command-processing');
  logger.voice('Processing command', { command });

  try {
    const result = await processQuery(command, gameStateRef.current);

    logger.voice('Command processed successfully', {
      command,
      type: result.type,
      confidence: result.confidence,
    });

    logger.timeEnd('voice-command-processing');
    return result;
  } catch (error) {
    logger.timeEnd('voice-command-processing');
    logger.error('Voice command processing failed', error, {
      command,
      gameState: gameStateRef.current ? 'active' : 'no-round',
    });
    throw error;
  }
};

// Recognition errors
const onRecognitionError = (event: any) => {
  const errorType = event.error;

  if (errorType === 'no-speech') {
    logger.voice('No speech detected');
  } else if (errorType === 'network') {
    logger.warn('Voice recognition network error', { error: errorType });
  } else {
    logger.error('Voice recognition error', new Error(errorType), {
      errorType,
      message: event.message,
    });
  }
};
```

### Example 3: Offline Sync (offlineSync.ts)

```typescript
import { logger } from '@/lib/logger';
import { SYNC_CONFIG } from '@/lib/constants';

// Processing sync queue
const processSyncQueue = async () => {
  const queue = getSyncQueue();

  logger.sync('Processing sync queue', {
    queueSize: queue.length,
    online: navigator.onLine,
  });

  if (!navigator.onLine) {
    logger.sync('Offline, skipping sync');
    return;
  }

  logger.groupCollapsed(`Syncing ${queue.length} operations`);

  let syncedCount = 0;
  let failedCount = 0;

  for (const operation of queue) {
    try {
      logger.sync('Syncing operation', {
        type: operation.type,
        timestamp: operation.timestamp,
      });

      await executeOperation(operation);
      await removeOperation(operation.id);

      syncedCount++;
      logger.sync('Operation synced', { operationId: operation.id });
    } catch (error) {
      failedCount++;
      logger.warn('Sync operation failed', {
        operationId: operation.id,
        type: operation.type,
        error: error.message,
      });

      if (operation.retryCount >= SYNC_CONFIG.MAX_RETRIES) {
        logger.error('Max retries exceeded, removing operation', error, {
          operationId: operation.id,
          retryCount: operation.retryCount,
        });
        await removeOperation(operation.id);
      }
    }
  }

  logger.groupEnd();

  logger.sync('Sync completed', {
    total: queue.length,
    synced: syncedCount,
    failed: failedCount,
  });
};
```

### Example 4: Firebase Operations (courses.ts)

```typescript
import { logger } from '@/lib/logger';
import { FIREBASE_TIMEOUTS, STORAGE_KEYS } from '@/lib/constants';

// Fetching courses
export const getCourses = async (): Promise<Course[]> => {
  logger.time('fetch-courses');
  logger.firebase('Fetching courses from Firestore');

  try {
    const coursesRef = collection(db, 'courses');
    const querySnapshot = await Promise.race([
      getDocs(coursesRef),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Firebase query timed out')),
          FIREBASE_TIMEOUTS.QUERY_TIMEOUT_MS
        )
      ),
    ]);

    const courses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Course[];

    logger.firebase('Courses fetched successfully', {
      count: courses.length,
    });

    // Cache locally
    logger.storage('Caching courses to localStorage', {
      key: STORAGE_KEYS.COURSES,
      count: courses.length,
    });
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));

    logger.timeEnd('fetch-courses');
    return courses;
  } catch (error) {
    logger.timeEnd('fetch-courses');

    if (error.message.includes('timeout')) {
      logger.error('Firebase timeout', error, {
        operation: 'getCourses',
        timeout: FIREBASE_TIMEOUTS.QUERY_TIMEOUT_MS,
      });
    } else {
      logger.error('Failed to fetch courses', error);
    }

    // Fallback to cached data
    logger.storage('Loading courses from cache');
    const cached = localStorage.getItem(STORAGE_KEYS.COURSES);
    if (cached) {
      const courses = JSON.parse(cached);
      logger.info('Using cached courses', { count: courses.length });
      return courses;
    }

    throw error;
  }
};
```

### Example 5: Betting Calculations (betting.ts)

```typescript
import { logger } from '@/lib/logger';

// Calculate skins
export const calculateSkins = (
  scores: ScoreData,
  participants: string[],
  valuePerSkin: number
): SkinResult[] => {
  logger.time('calculate-skins');
  logger.betting('Calculating skins', {
    participantCount: participants.length,
    valuePerSkin,
    holeCount: Object.keys(scores).length,
  });

  const results: SkinResult[] = [];
  let carryOver = 0;

  for (const [hole, holeScores] of Object.entries(scores)) {
    const participantScores = participants
      .map(id => ({
        playerId: id,
        score: holeScores[id],
      }))
      .filter(s => s.score !== undefined);

    const lowestScore = Math.min(...participantScores.map(s => s.score));
    const winners = participantScores.filter(s => s.score === lowestScore);

    if (winners.length === 1) {
      const skinValue = valuePerSkin + carryOver;
      results.push({
        hole: parseInt(hole),
        winner: winners[0].playerId,
        value: skinValue,
      });

      logger.betting('Skin won', {
        hole,
        winner: winners[0].playerId,
        value: skinValue,
        carryOver,
      });

      carryOver = 0;
    } else {
      carryOver += valuePerSkin;
      logger.betting('Skin pushed (tie)', {
        hole,
        tieCount: winners.length,
        carryOver,
      });
    }
  }

  logger.betting('Skins calculation complete', {
    totalSkins: results.length,
    totalValue: results.reduce((sum, r) => sum + r.value, 0),
    remainingCarryOver: carryOver,
  });

  logger.timeEnd('calculate-skins');
  return results;
};
```

### Example 6: MRTZ Operations (mrtz.ts)

```typescript
import { logger } from '@/lib/logger';

// Update player MRTZ balance
export const updatePlayerMRTZ = async (
  playerId: string,
  amount: number,
  reason: string
): Promise<void> => {
  logger.mrtz('Updating player balance', {
    playerId,
    amount,
    reason,
  });

  try {
    const currentBalance = await getPlayerMRTZBalance(playerId);
    const newBalance = (currentBalance?.totalBalance ?? 0) + amount;

    logger.mrtz('Balance calculated', {
      playerId,
      currentBalance: currentBalance?.totalBalance ?? 0,
      amount,
      newBalance,
    });

    // Update in Firestore
    await setDoc(
      doc(db, 'mrtzBalances', playerId),
      {
        totalBalance: newBalance,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );

    // Update local cache
    const cached = localStorage.getItem(STORAGE_KEYS.MRTZ_BALANCES);
    const balances = cached ? JSON.parse(cached) : {};
    balances[playerId] = newBalance;
    localStorage.setItem(STORAGE_KEYS.MRTZ_BALANCES, JSON.stringify(balances));

    logger.mrtz('Balance updated successfully', {
      playerId,
      newBalance,
    });
  } catch (error) {
    logger.error('Failed to update MRTZ balance', error, {
      playerId,
      amount,
      reason,
    });
    throw error;
  }
};
```

### Example 7: Component Lifecycle

```typescript
import { logger } from '@/lib/logger';
import { useEffect } from 'react';

export function MyComponent() {
  useEffect(() => {
    logger.debug('Component mounted', { componentName: 'MyComponent' });

    return () => {
      logger.debug('Component unmounting', { componentName: 'MyComponent' });
    };
  }, []);

  const handleClick = () => {
    logger.debug('Button clicked', {
      componentName: 'MyComponent',
      buttonId: 'submit',
    });

    try {
      // Do something
      logger.info('Action completed successfully');
    } catch (error) {
      logger.error('Action failed', error, {
        componentName: 'MyComponent',
        action: 'handleClick',
      });
    }
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

## Advanced Patterns

### Pattern 1: Assertion Logging

```typescript
import { logger } from '@/lib/logger';

const updateScore = (playerId: string, score: number) => {
  logger.assert(
    players.some(p => p.id === playerId),
    'Player must exist in round',
    { playerId, availablePlayers: players.map(p => p.id) }
  );

  logger.assert(
    score >= -3 && score <= 10,
    'Score out of valid range',
    { playerId, score }
  );

  // Continue with update...
};
```

### Pattern 2: Table Logging for Data Analysis

```typescript
import { logger } from '@/lib/logger';

const analyzeFinalScores = (scores: PlayerScore[]) => {
  logger.group('Final Score Analysis');

  logger.table(scores, ['playerName', 'totalScore', 'relativeScore']);

  logger.info('Score statistics', {
    average: scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length,
    lowest: Math.min(...scores.map(s => s.totalScore)),
    highest: Math.max(...scores.map(s => s.totalScore)),
  });

  logger.groupEnd();
};
```

### Pattern 3: Conditional Logging

```typescript
import { logger } from '@/lib/logger';

const complexOperation = (data: any) => {
  const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

  if (isDebugEnabled) {
    logger.debug('Starting complex operation', { dataSize: data.length });
    logger.time('complex-operation');
  }

  // Do work...

  if (isDebugEnabled) {
    logger.timeEnd('complex-operation');
    logger.debug('Operation completed');
  }
};
```

## Testing with Logger

### Disable logging in tests

```typescript
// vitest.setup.ts
import { disableLogging } from '@/lib/logger';

beforeAll(() => {
  disableLogging();
});
```

### Or create a test logger

```typescript
import { createLogger } from '@/lib/logger';

const testLogger = createLogger({
  enabled: true,
  minLevel: 'error', // Only show errors in tests
  timestamps: false,
});
```

## Integration with Error Tracking

### Sentry Integration

```typescript
// app/layout.tsx
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

logger.configure({
  errorTracker: {
    captureException: (error, context) => {
      Sentry.captureException(error, {
        extra: context,
        tags: {
          component: context?.componentName,
          operation: context?.operation,
        },
      });
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

---

## Quick Reference

```typescript
// Basic logging
logger.debug(message, context?)
logger.info(message, context?)
logger.warn(message, context?)
logger.error(message, error?, context?)

// Domain-specific
logger.round(action, details?)
logger.betting(action, details?)
logger.mrtz(action, details?)
logger.voice(action, details?)
logger.sync(action, details?)
logger.firebase(action, details?)
logger.storage(action, details?)
logger.api(method, endpoint, details?)

// Performance
logger.time(label)
logger.timeLog(label, message?)
logger.timeEnd(label)

// Grouping
logger.group(label)
logger.groupCollapsed(label)
logger.groupEnd()

// Advanced
logger.table(data, columns?)
logger.assert(condition, message, context?)
```
