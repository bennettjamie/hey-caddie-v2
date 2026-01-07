# Constants Migration Guide

This guide explains how to migrate from magic numbers and strings to the centralized constants file.

## Overview

The `lib/constants.ts` file contains all application constants organized into logical sections:
- Round configuration
- Storage keys
- Round status values
- Betting types
- Sync configuration
- UI timeouts & animations
- Firebase timeouts
- Cache & history limits
- Query limits
- Score terms
- Voice recognition config
- Achievement types
- MRTZ status
- Validation constants
- Error messages
- Course layouts

## Migration Examples

### Example 1: Round Status

**Before:**
```typescript
if (parsed.status === 'active' || parsed.status === 'ended' || !parsed.status) {
    // ... handle round
}
```

**After:**
```typescript
import { ROUND_STATUS } from '@/lib/constants';

if (parsed.status === ROUND_STATUS.ACTIVE || parsed.status === ROUND_STATUS.ENDED || !parsed.status) {
    // ... handle round
}
```

### Example 2: LocalStorage Keys

**Before:**
```typescript
const savedRound = localStorage.getItem('currentRound');
localStorage.setItem('fundatoryBets', JSON.stringify(bets));
```

**After:**
```typescript
import { STORAGE_KEYS } from '@/lib/constants';

const savedRound = localStorage.getItem(STORAGE_KEYS.CURRENT_ROUND);
localStorage.setItem(STORAGE_KEYS.FUNDATORY_BETS, JSON.stringify(bets));
```

### Example 3: Timeouts and Delays

**Before:**
```typescript
setTimeout(() => setIsStartingVoice(false), 2000);
setTimeout(() => reject(new Error('Firebase query timed out')), 30000);
```

**After:**
```typescript
import { UI_TIMEOUTS, FIREBASE_TIMEOUTS } from '@/lib/constants';

setTimeout(() => setIsStartingVoice(false), UI_TIMEOUTS.VOICE_START_INDICATOR_MS);
setTimeout(() => reject(new Error('Firebase query timed out')), FIREBASE_TIMEOUTS.QUERY_TIMEOUT_MS);
```

### Example 4: Cache Limits

**Before:**
```typescript
const limited = rounds.slice(0, 50);
const recent = courses.slice(0, 5);
```

**After:**
```typescript
import { CACHE_LIMITS } from '@/lib/constants';

const limited = rounds.slice(0, CACHE_LIMITS.MAX_CACHED_ROUNDS);
const recent = courses.slice(0, CACHE_LIMITS.MAX_RECENT_COURSES_DISPLAY);
```

### Example 5: Sync Configuration

**Before:**
```typescript
const MAX_RETRIES = 3;
await new Promise(resolve => setTimeout(resolve, 500));
```

**After:**
```typescript
import { SYNC_CONFIG } from '@/lib/constants';

const MAX_RETRIES = SYNC_CONFIG.MAX_RETRIES;
await new Promise(resolve => setTimeout(resolve, SYNC_CONFIG.RETRY_DELAY_MS));
```

### Example 6: Score Terms (VoiceContext)

**Before:**
```typescript
const scoreTerms: { [key: string]: number } = {
    'ace': -2,
    'birdie': -1,
    'par': 0,
    // ... more terms
};
```

**After:**
```typescript
import { SCORE_TERMS } from '@/lib/constants';

// Just use SCORE_TERMS directly
const score = SCORE_TERMS[normalizedTerm];
```

### Example 7: Type Guards

Use the helper functions for type validation:

```typescript
import { isValidRoundStatus, isValidBetType } from '@/lib/constants';

if (isValidRoundStatus(status)) {
    // TypeScript now knows status is RoundStatus type
    setRoundStatus(status);
}

if (isValidBetType(betType)) {
    // TypeScript now knows betType is BetType
    processBet(betType);
}
```

## Migration Priority

### High Priority (Most Frequently Used)
1. **Storage Keys** - Used in many files
   - Files: `context/GameContext.tsx`, `app/page.tsx`, `components/PlayerSelector.tsx`, etc.

2. **Round Status** - Critical for round state management
   - Files: `context/GameContext.tsx`, `lib/rounds.ts`

3. **Timeouts** - Used throughout the app
   - Files: `context/GameContext.tsx`, `lib/offlineSync.ts`, `lib/courses.ts`

### Medium Priority
4. **Cache Limits** - Used in multiple components
   - Files: `context/GameContext.tsx`, `app/page.tsx`, `components/PlayerSelector.tsx`

5. **Sync Configuration** - Used in offline sync
   - Files: `lib/offlineSync.ts`, `lib/syncQueue.ts`

6. **Query Limits** - Used in database queries
   - Files: `components/MRTZLedgerView.tsx`, `lib/statistics.ts`

### Low Priority (Less Urgent)
7. **Bet Types** - Localized to betting features
8. **Achievement Types** - Localized to achievements
9. **Error Messages** - Can be migrated over time

## Files to Migrate

### Priority 1 - Core Files
- [x] `lib/constants.ts` - Created ✅
- [ ] `context/GameContext.tsx` - **Most important** (uses most constants)
- [ ] `lib/offlineSync.ts`
- [ ] `lib/syncQueue.ts`
- [ ] `context/VoiceContext.tsx`

### Priority 2 - UI Components
- [ ] `app/page.tsx`
- [ ] `components/PlayerSelector.tsx`
- [ ] `components/InstallPrompt.tsx`
- [ ] `components/ui/PlayerCard.tsx`

### Priority 3 - Utilities
- [ ] `lib/courses.ts`
- [ ] `lib/players.ts`
- [ ] `lib/rounds.ts`
- [ ] `lib/mrtz.ts`

## Benefits of Migration

1. **Single Source of Truth** - All configuration in one place
2. **Type Safety** - TypeScript ensures correct usage
3. **Easier Maintenance** - Change once, apply everywhere
4. **Better Documentation** - Constants are self-documenting
5. **Refactoring Safety** - Find all usages with IDE
6. **Reduced Errors** - No typos in string literals
7. **Testability** - Easy to mock constants in tests

## Best Practices

1. **Import Only What You Need**
   ```typescript
   import { STORAGE_KEYS, ROUND_STATUS } from '@/lib/constants';
   ```

2. **Use Object Destructuring for Readability**
   ```typescript
   const { CURRENT_ROUND, CACHED_ROUNDS } = STORAGE_KEYS;
   ```

3. **Don't Re-export Constants**
   - Import directly from `@/lib/constants`
   - Avoid creating intermediate constant files

4. **Update Tests**
   - Replace magic values in tests with constants
   - Makes test intent clearer

5. **Document Deviations**
   - If you must use a magic value, add a comment explaining why

## Gradual Migration Strategy

You don't need to migrate everything at once. Recommended approach:

### Phase 1 (Week 1)
- Migrate `context/GameContext.tsx` (highest impact)
- Migrate `lib/offlineSync.ts`
- Update tests for these files

### Phase 2 (Week 2)
- Migrate UI components
- Migrate storage-related code

### Phase 3 (Week 3)
- Migrate utility libraries
- Clean up remaining magic numbers

### Phase 4 (Week 4)
- Code review to find missed constants
- Add any new constants discovered during migration

## Verification Checklist

After migrating a file:
- [ ] All magic numbers replaced with constants
- [ ] All string literals replaced with constants
- [ ] Imports added at top of file
- [ ] Code still compiles without errors
- [ ] Tests still pass
- [ ] ESLint warnings resolved
- [ ] Constants used consistently throughout file

## Common Pitfalls

1. **Don't Hardcode When Importing**
   ```typescript
   // ❌ Bad
   const timeout = 30000;

   // ✅ Good
   import { FIREBASE_TIMEOUTS } from '@/lib/constants';
   const timeout = FIREBASE_TIMEOUTS.QUERY_TIMEOUT_MS;
   ```

2. **Use Type Guards for Runtime Validation**
   ```typescript
   // ❌ Bad
   if (status === 'active' || status === 'ended') {

   // ✅ Good
   import { isValidRoundStatus, ROUND_STATUS } from '@/lib/constants';
   if (isValidRoundStatus(status)) {
   ```

3. **Keep Constants File Clean**
   - Don't add business logic to constants file
   - Only add true constants (immutable values)
   - Group related constants together

## Need Help?

If you're unsure whether something should be a constant:
1. Is it used in multiple places? → Yes, make it a constant
2. Is it a "magic number" that's hard to understand? → Yes, make it a constant
3. Might it change in the future? → Yes, make it a constant
4. Is it only used once in one specific place? → Maybe not necessary

---

**Next Steps**: Start with migrating `context/GameContext.tsx` as it uses the most constants and will have the biggest impact.
