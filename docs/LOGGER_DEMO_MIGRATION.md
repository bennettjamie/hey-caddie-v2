# Logger Migration Demo: GameContext.tsx

This document shows a side-by-side comparison of the old console-based logging vs. the new logger-based approach in `context/GameContext.tsx`.

## Summary of Changes

**Before Migration:**
- 20+ `console.error()` statements
- 3 `console.warn()` statements
- No structured context
- No distinction between development and production
- Magic strings for localStorage keys
- No performance timing

**After Migration:**
- Structured logging with context objects
- Domain-specific loggers (`logger.round()`, `logger.storage()`, etc.)
- Environment-aware (debug/info only in development)
- Using constants instead of magic strings
- Performance timing for expensive operations
- Better error tracking

## Example 1: Error Handling with Context

### Before:
```typescript
} catch (error) {
    console.error('Error saving partial round:', error);
    // Still clear even if save fails
}
```

### After:
```typescript
import { logger } from '@/lib/logger';

} catch (error) {
    logger.error('Error saving partial round', error, {
        roundAge: ageDescription,
        hasScores: Object.keys(parsed.scores).length > 0,
        courseId: parsed.course?.id,
        operation: 'stale-round-cleanup',
    });
    // Still clear even if save fails
}
```

**Benefits:**
- ✅ Structured context for debugging
- ✅ Error sent to tracking service (if configured)
- ✅ Always shown (even in production)
- ✅ Includes stack trace

---

## Example 2: Storage Operations

### Before:
```typescript
const savedRound = localStorage.getItem('currentRound');
if (savedRound) {
    try {
        const parsed = JSON.parse(savedRound);
        // ... process round
    } catch (e) {
        console.error('Error loading saved round:', e);
        localStorage.removeItem('currentRound');
        setCurrentRound(null);
    }
}
```

### After:
```typescript
import { logger } from '@/lib/logger';
import { STORAGE_KEYS } from '@/lib/constants';

logger.storage('Loading saved round from localStorage', { key: STORAGE_KEYS.CURRENT_ROUND });

const savedRound = localStorage.getItem(STORAGE_KEYS.CURRENT_ROUND);
if (savedRound) {
    try {
        const parsed = JSON.parse(savedRound);
        logger.storage('Round loaded successfully', {
            roundId: parsed.startTime,
            status: parsed.status,
            playerCount: parsed.players?.length,
        });
        // ... process round
    } catch (e) {
        logger.error('Error loading saved round', e, {
            key: STORAGE_KEYS.CURRENT_ROUND,
            dataLength: savedRound.length,
        });

        logger.storage('Clearing corrupted round data');
        localStorage.removeItem(STORAGE_KEYS.CURRENT_ROUND);
        setCurrentRound(null);
    }
}
```

**Benefits:**
- ✅ Domain-specific logger (`logger.storage()`)
- ✅ Using constants for localStorage keys
- ✅ Detailed context about the data
- ✅ Clear operation tracking

---

## Example 3: Warnings

### Before:
```typescript
if (!Array.isArray(order)) {
    console.warn('setTeeOrder called with non-array:', order);
    return;
}
```

### After:
```typescript
import { logger } from '@/lib/logger';

if (!Array.isArray(order)) {
    logger.warn('setTeeOrder called with invalid type', {
        receivedType: typeof order,
        receivedValue: order,
        expectedType: 'array',
        currentRoundId: currentRound?.startTime,
    });
    return;
}
```

**Benefits:**
- ✅ Structured context
- ✅ Always shown (warnings appear in production)
- ✅ Sent to error tracking service

---

## Example 4: Round Operations

### Before:
```typescript
const startRound = (selectedCourse: Course, selectedPlayers: Player[]) => {
    const teeOrder = selectedPlayers
        .map(p => p.id || (p as any).uid)
        .filter(Boolean);

    if (teeOrder.length === 0) {
        console.error('No valid player IDs found when starting round');
        return;
    }

    const newRound: GameRound = {
        course: selectedCourse,
        players: selectedPlayers,
        scores: {},
        startTime: new Date().toISOString(),
        status: 'active',
        activeHole: 1,
        teeOrder,
        currentTeeIndex: 0,
    };

    setCurrentRound(newRound);
};
```

### After:
```typescript
import { logger } from '@/lib/logger';
import { ROUND_STATUS } from '@/lib/constants';

const startRound = (selectedCourse: Course, selectedPlayers: Player[]) => {
    logger.round('Starting new round', {
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        playerCount: selectedPlayers.length,
        playerNames: selectedPlayers.map(p => p.name),
    });

    const teeOrder = selectedPlayers
        .map(p => p.id || (p as any).uid)
        .filter(Boolean);

    if (teeOrder.length === 0) {
        logger.error('No valid player IDs found when starting round', new Error('Invalid player data'), {
            selectedPlayers: selectedPlayers.map(p => ({ name: p.name, id: p.id, uid: (p as any).uid })),
            courseId: selectedCourse.id,
        });
        return;
    }

    const newRound: GameRound = {
        course: selectedCourse,
        players: selectedPlayers,
        scores: {},
        startTime: new Date().toISOString(),
        status: ROUND_STATUS.ACTIVE,
        activeHole: 1,
        teeOrder,
        currentTeeIndex: 0,
    };

    setCurrentRound(newRound);

    logger.round('Round started successfully', {
        roundId: newRound.startTime,
        activeHole: 1,
        teeOrderCount: teeOrder.length,
    });
};
```

**Benefits:**
- ✅ Domain-specific logger (`logger.round()`)
- ✅ Using constants (`ROUND_STATUS.ACTIVE`)
- ✅ Detailed logging at start and end of operation
- ✅ Better error context

---

## Example 5: Async Operations with Try/Catch

### Before:
```typescript
try {
    await saveRound(partialRound);
    // Removed console.log`Saved stale round as partial to database (${ageDescription})`);
} catch (error) {
    console.error('Error saving partial round:', error);
    // Still clear even if save fails
}
```

### After:
```typescript
import { logger } from '@/lib/logger';

logger.round('Saving stale round as partial', {
    age: ageDescription,
    scoreCount: Object.keys(parsed.scores).length,
});

try {
    await saveRound(partialRound);
    logger.round('Stale round saved as partial', {
        age: ageDescription,
        roundId: partialRound.id,
    });
} catch (error) {
    logger.error('Failed to save partial round', error, {
        roundAge: ageDescription,
        hasScores: Object.keys(parsed.scores).length > 0,
        courseId: parsed.course?.id,
        operation: 'stale-round-cleanup',
    });
    // Still clear even if save fails
}
```

**Benefits:**
- ✅ Logs both start and completion
- ✅ Detailed error context
- ✅ Clear operation tracking

---

## Example 6: Grouped Complex Operations

### Before:
```typescript
const endRound = async (): Promise<FinalRoundData> => {
    if (!currentRound) {
        throw new Error('No active round');
    }

    try {
        // Calculate betting results
        const skinsResults = await resolveSkinsResults(/* ... */);
        const nassauResults = await resolveNassauResults(/* ... */);

        // Update MRTZ
        for (const playerId of playerIds) {
            try {
                await updatePlayerMRTZ(/* ... */);
            } catch (err) {
                console.error(`Error updating MRTZ for player ${playerId}:`, err);
            }
        }

        // Save round
        try {
            const roundId = await saveRound(firestoreRound);
            // Removed console.log'Round saved to Firebase:', roundId);
        } catch (error) {
            console.error('Failed to save to Firebase, saving locally:', error);
            await saveLocalRound(firestoreRound);
        }

        return finalData;
    } catch (error) {
        console.error('Error saving round:', error);
        throw error;
    }
};
```

### After:
```typescript
import { logger } from '@/lib/logger';

const endRound = async (): Promise<FinalRoundData> => {
    if (!currentRound) {
        logger.error('Cannot end round: no active round', new Error('No active round'));
        throw new Error('No active round');
    }

    logger.time('end-round');
    logger.group('End Round Process');

    logger.round('Starting round end process', {
        roundId: currentRound.startTime,
        activeHole: currentRound.activeHole,
        playerCount: currentRound.players.length,
    });

    try {
        // Calculate betting results
        logger.betting('Resolving skins results');
        const skinsResults = await resolveSkinsResults(/* ... */);
        logger.betting('Skins resolved', { winnerCount: skinsResults.length });

        logger.betting('Resolving Nassau results');
        const nassauResults = await resolveNassauResults(/* ... */);
        logger.betting('Nassau resolved', { results: nassauResults });

        // Update MRTZ
        logger.mrtz('Updating player balances', { playerCount: playerIds.length });
        for (const playerId of playerIds) {
            try {
                await updatePlayerMRTZ(/* ... */);
                logger.mrtz('Player balance updated', { playerId });
            } catch (err) {
                logger.error('Failed to update player MRTZ', err, {
                    playerId,
                    roundId: currentRound.startTime,
                    operation: 'end-round',
                });
            }
        }

        // Save round
        logger.round('Saving round to Firebase');
        try {
            const roundId = await saveRound(firestoreRound);
            logger.round('Round saved to Firebase', { roundId });
        } catch (error) {
            logger.warn('Firebase save failed, using local storage', {
                error: error.message,
                roundId: firestoreRound.id,
            });
            await saveLocalRound(firestoreRound);
        }

        logger.groupEnd();
        logger.timeEnd('end-round');

        logger.round('Round ended successfully', {
            roundId: currentRound.startTime,
            totalPlayers: currentRound.players.length,
            totalHoles: currentRound.activeHole,
        });

        return finalData;
    } catch (error) {
        logger.groupEnd();
        logger.timeEnd('end-round');

        logger.error('Failed to end round', error, {
            roundId: currentRound.startTime,
            activeHole: currentRound.activeHole,
            playerCount: currentRound.players.length,
        });
        throw error;
    }
};
```

**Benefits:**
- ✅ Grouped logging shows operation flow
- ✅ Performance timing tracks total duration
- ✅ Domain-specific loggers for each operation type
- ✅ Detailed error context at each stage
- ✅ Clear success/failure logging

---

## Example 7: Player Already Exists Check

### Before:
```typescript
const addPlayerToRound = (player: Player) => {
    if (!currentRound) return;

    const existingPlayer = currentRound.players.find(p => p.id === player.id);
    if (existingPlayer) {
        console.warn('Player already in round');
        return;
    }

    // Add player logic...
};
```

### After:
```typescript
import { logger } from '@/lib/logger';

const addPlayerToRound = (player: Player) => {
    if (!currentRound) {
        logger.warn('Cannot add player: no active round', {
            playerId: player.id,
            playerName: player.name,
        });
        return;
    }

    const existingPlayer = currentRound.players.find(p => p.id === player.id);
    if (existingPlayer) {
        logger.warn('Player already in round', {
            playerId: player.id,
            playerName: player.name,
            roundId: currentRound.startTime,
            currentPlayerCount: currentRound.players.length,
        });
        return;
    }

    logger.round('Adding player to round', {
        playerId: player.id,
        playerName: player.name,
        roundId: currentRound.startTime,
        newPlayerCount: currentRound.players.length + 1,
    });

    // Add player logic...

    logger.round('Player added successfully', {
        playerId: player.id,
        totalPlayers: currentRound.players.length,
    });
};
```

**Benefits:**
- ✅ Context for all warning cases
- ✅ Operation tracking (start and end)
- ✅ Clear state information

---

## Console Output Comparison

### Before (Production):
```
Error saving partial round: [Error object]
Error restoring fundatory bets: [Error object]
setTeeOrder called with non-array: [value]
Error saving round: [Error object]
```

### After (Development):
```
[11:30:45.123] [HeyCaddie] [DEBUG] Storage: Loading saved round from localStorage {key: "currentRound"}
[11:30:45.145] [HeyCaddie] [INFO] Round: Starting new round {courseId: "123", courseName: "Zilker", playerCount: 4}
[11:30:45.167] [HeyCaddie] [INFO] Round: Round started successfully {roundId: "2026-01-06T...", activeHole: 1}
[11:30:45.189] [HeyCaddie] [WARN] Player already in round {playerId: "player1", roundId: "..."}
```

### After (Production):
```
[11:30:45.189] [HeyCaddie] [WARN] Player already in round {playerId: "player1", roundId: "..."}
[11:30:45.234] [HeyCaddie] [ERROR] Failed to end round
Stack: Error: ...
Context: {roundId: "...", activeHole: 5, playerCount: 4}
```

---

## Migration Statistics for GameContext.tsx

**Changes Made:**
- ✅ 20 `console.error()` → `logger.error()` with context
- ✅ 3 `console.warn()` → `logger.warn()` with context
- ✅ Added 15+ `logger.debug()` / `logger.info()` for operation tracking
- ✅ Added performance timing for `endRound()`
- ✅ Added log grouping for complex operations
- ✅ Replaced magic strings with constants
- ✅ Added structured context to all log statements

**Lines of Code:**
- Before: ~850 lines
- After: ~900 lines (50 more for better logging)

**Debugging Improvement:**
- Before: Error messages with minimal context
- After: Structured logs with operation flow, timing, and detailed context

---

## Next Steps

1. **Test the migrated code** - Ensure all functionality works
2. **Verify logging output** - Check console in development mode
3. **Configure error tracking** - Set up Sentry integration
4. **Migrate remaining files** - Use this as a template
5. **Remove old console statements** - Clean up codebase

This migration demonstrates that the logger provides:
- ✅ Better debugging with structured context
- ✅ Environment-aware logging (dev vs. prod)
- ✅ Performance tracking
- ✅ Error tracking integration
- ✅ Clearer code with constants
- ✅ Domain-specific loggers for better organization
