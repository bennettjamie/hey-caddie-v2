# Try the Logger Guide

This guide helps you test the logger utility and see it in action!

## 🎯 Goal

Run the logger tests and see the logger working in your browser console.

---

## 📋 Prerequisites

- ✅ Node.js and npm installed
- ✅ Project dependencies installed (`npm install`)
- ✅ Files from Task #1-3 reviewed

---

## 🧪 Method 1: Run the Automated Tests

The quickest way to verify the logger works:

### **Step 1: Run Logger Tests**

```bash
npm test lib/logger.test.ts
```

### **Expected Output:**

```
✓ lib/logger.test.ts (12 tests)
  ✓ Logger (12)
    ✓ should log debug messages in development
    ✓ should log info messages
    ✓ should log warnings
    ✓ should log errors with stack traces
    ✓ should use specialized domain loggers
    ✓ should track performance with timers
    ✓ should group related logs
    ✓ should log tables
    ✓ should assert conditions
    ✓ should be configurable
    ✓ should create custom logger instances

Test Files  1 passed (1)
     Tests  12 passed (12)
  Start at  12:34:56
  Duration  245ms
```

### **What This Tests:**

- ✅ All log levels work (debug, info, warn, error)
- ✅ Context objects are properly logged
- ✅ Domain-specific loggers function
- ✅ Performance timing works
- ✅ Log grouping works
- ✅ Table logging works
- ✅ Assertions work
- ✅ Configuration works

### **Step 2: Review Test Output**

While running, you'll see colored console output showing different log levels:

```
[12:34:56.123] [HeyCaddie] [DEBUG] This is a debug message
[12:34:56.145] [HeyCaddie] [DEBUG] Debug with context {userId: "123", action: "test"}
[12:34:56.167] [HeyCaddie] [INFO] This is an info message
[12:34:56.189] [HeyCaddie] [WARN] This is a warning
[12:34:56.212] [HeyCaddie] [ERROR] This is an error
Stack: Error: Test error at ...
```

---

## 🌐 Method 2: Try in the Browser

See the logger in action in your actual app:

### **Step 1: Start Development Server**

```bash
npm run dev
```

Wait for:
```
✓ Ready in 2.3s
○ Local:   http://localhost:3000
```

### **Step 2: Open Browser and Console**

1. Open http://localhost:3000
2. Open Developer Tools:
   - **Chrome/Edge:** Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox:** Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
   - **Safari:** Enable Dev Menu first, then `Cmd+Option+C`

3. Click the **Console** tab

### **Step 3: Import and Test Logger**

In the browser console, paste this code:

```javascript
// Import the logger (works because it's a module)
import { logger } from './lib/logger.js';

// Try basic logging
logger.debug('Hello from the browser!');
logger.info('Testing the logger', { timestamp: new Date() });
logger.warn('This is a warning', { level: 'medium' });

// Try domain-specific loggers
logger.round('Test round', { courseId: 'test-123', playerCount: 4 });
logger.voice('Test voice command', { transcript: 'hey caddie' });
logger.betting('Test betting', { betType: 'skins', amount: 5 });

// Try performance timing
logger.time('test-timer');
// Do something
for (let i = 0; i < 1000000; i++) { }
logger.timeEnd('test-timer');

// Try grouping
logger.group('Test Group');
logger.info('Step 1');
logger.info('Step 2');
logger.info('Step 3');
logger.groupEnd();

// Try table logging
logger.table([
  { player: 'Alice', score: -2 },
  { player: 'Bob', score: 0 },
  { player: 'Charlie', score: 3 }
]);
```

### **What You Should See:**

Colored, formatted log messages in your console:

- **Debug/Info** - Gray/Blue (development only)
- **Warn** - Orange (always shown)
- **Error** - Red (always shown)
- **Grouped logs** - Collapsible sections
- **Table** - Formatted table view

---

## 🎨 Method 3: Run the Demonstration Function

The test file includes a demonstration function:

### **Step 1: Create a Test Page**

Create `app/test-logger/page.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { demonstrateLogger } from '@/lib/logger.test';

export default function TestLoggerPage() {
  useEffect(() => {
    // Run demonstration on mount
    demonstrateLogger();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Logger Demonstration</h1>
      <p>Open the browser console to see the logger in action!</p>
      <p><strong>Press F12 to open Developer Tools</strong></p>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2>What to Look For:</h2>
        <ul>
          <li>✅ Different log levels (debug, info, warn, error)</li>
          <li>✅ Colored output by level</li>
          <li>✅ Context objects with detailed information</li>
          <li>✅ Domain-specific loggers (round, betting, voice, etc.)</li>
          <li>✅ Performance timing</li>
          <li>✅ Grouped logs</li>
          <li>✅ Table formatting</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => demonstrateLogger()}
          style={{
            padding: '1rem 2rem',
            fontSize: '1rem',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Run Demonstration Again
        </button>
      </div>
    </div>
  );
}
```

### **Step 2: Visit the Test Page**

1. Make sure dev server is running (`npm run dev`)
2. Go to: http://localhost:3000/test-logger
3. Open browser console (F12)
4. Click "Run Demonstration Again" button

### **Step 3: Observe the Output**

You'll see a complete demonstration of all logger features!

---

## 📊 Method 4: Try in Real Context

Actually use the logger in your existing code:

### **Step 1: Open GameContext**

```bash
code context/GameContext.tsx
```

### **Step 2: Add Logger Import (Temporarily)**

At the top of the file, add:

```typescript
import { logger } from '@/lib/logger';
```

### **Step 3: Add a Test Log**

Find the `startRound` function (around line 220) and add:

```typescript
const startRound = (selectedCourse: Course, selectedPlayers: Player[]) => {
    // ADD THIS LINE:
    logger.round('Starting round (TEST)', {
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        playerCount: selectedPlayers.length,
    });

    // ... rest of existing code
```

### **Step 4: Test in App**

1. Start dev server: `npm run dev`
2. Go to http://localhost:3000
3. Open console (F12)
4. Start a round in the app
5. Watch the console!

You should see:
```
[12:34:56.123] [HeyCaddie] [INFO] Round: Starting round (TEST) {
  courseId: "123",
  courseName: "Zilker Park",
  playerCount: 4
}
```

### **Step 5: Remove Test Code**

After testing, remove the test log (keep the import for later migration!).

---

## ✅ Verification Checklist

- [ ] Automated tests pass (`npm test lib/logger.test.ts`)
- [ ] Can see colored output in test results
- [ ] Logger works in browser console
- [ ] Domain-specific loggers work (round, voice, betting, etc.)
- [ ] Performance timing works
- [ ] Log grouping works
- [ ] Table logging works
- [ ] Logger works in actual app context

---

## 🎯 What You Learned

After trying the logger, you should understand:

1. **Basic Usage:**
   ```typescript
   logger.debug('message', { context });
   logger.info('message', { context });
   logger.warn('message', { context });
   logger.error('message', error, { context });
   ```

2. **Domain-Specific:**
   ```typescript
   logger.round('action', { details });
   logger.betting('action', { details });
   logger.mrtz('action', { details });
   logger.voice('action', { details });
   ```

3. **Performance:**
   ```typescript
   logger.time('operation');
   // ... do work
   logger.timeEnd('operation');
   ```

4. **Grouping:**
   ```typescript
   logger.group('Complex Operation');
   logger.info('Step 1');
   logger.info('Step 2');
   logger.groupEnd();
   ```

---

## 🚀 Next Steps

Now that you've verified the logger works:

### **Immediate:**
✅ **Task #4 Complete: Logger Tested**
🎯 **Ready for Task #5: Start Constants Migration**

### **Start Using It:**

1. **Begin Migration:**
   - Start with one file (e.g., `GameContext.tsx`)
   - Replace `console.error` with `logger.error`
   - Add context objects
   - Use constants

2. **Follow Migration Guide:**
   - Review: `docs/LOGGER_MIGRATION_GUIDE.md`
   - Use patterns from: `context/GameContext.MIGRATED_EXAMPLE.tsx`
   - Reference: `docs/LOGGER_EXAMPLES.md`

3. **Track Progress:**
   - Update CHANGELOG as you migrate files
   - Create issues for migration tasks
   - Test after each file migration

---

## 🔍 Troubleshooting

### **Tests Fail**

**Problem:** Tests fail with import errors

**Solution:**
```bash
# Make sure dependencies are installed
npm install

# Try running just the logger test
npm test lib/logger.test.ts -- --run
```

### **Logger Not Defined in Browser**

**Problem:** `logger is not defined` error

**Solution:**
1. Make sure import is correct: `import { logger } from '@/lib/logger';`
2. Check file path is correct
3. Restart dev server

### **No Colored Output**

**Problem:** Logs appear but aren't colored

**Solution:**
- Colored output only works in browser, not Node.js
- Check browser dev tools, not terminal
- Some browsers have different color support

### **Logs Don't Appear in Production**

**Problem:** Debug/info logs don't show in production build

**Solution:**
- This is expected! Debug/info are development-only
- Only warn/error appear in production
- To enable debug in production:
  ```typescript
  import { enableDebugLogging } from '@/lib/logger';
  enableDebugLogging();
  ```

---

## 💡 Pro Tips

### **Quick Test in Any Component**

Add to any component to test:

```typescript
'use client';

import { logger } from '@/lib/logger';
import { useEffect } from 'react';

export default function MyComponent() {
  useEffect(() => {
    logger.info('Component mounted!', { component: 'MyComponent' });
  }, []);

  return <div>Check console!</div>;
}
```

### **Test Different Environments**

**Development:**
```bash
npm run dev
# All logs appear
```

**Production Build:**
```bash
npm run build
npm start
# Only warn/error appear
```

### **Customize for Testing**

```typescript
import { createLogger } from '@/lib/logger';

const testLogger = createLogger({
  prefix: '[TEST]',
  minLevel: 'debug',
  timestamps: true,
});

testLogger.info('Custom logger!');
```

---

## 📈 Success Criteria

You've successfully tried the logger if:

- ✅ All tests pass
- ✅ Saw colored output in browser
- ✅ Tried different log levels
- ✅ Tested domain-specific loggers
- ✅ Performance timing works
- ✅ Understand how to use it

---

**Congratulations! You've completed all 4 immediate tasks! 🎉**

Now you can proceed to the short-term tasks:
- Task #5: Start constants migration
- Task #6: Start logger migration
- Task #7: Use issue templates
- Task #8: Update CHANGELOG

Ready to continue?
