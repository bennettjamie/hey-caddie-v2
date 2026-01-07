/**
 * Logger Test & Demonstration
 * Run this to see the logger in action
 *
 * To run: npm test lib/logger.test.ts
 * Or just import and call testLogger() from anywhere
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { logger, createLogger, enableDebugLogging, disableLogging } from './logger';

describe('Logger', () => {
    beforeEach(() => {
        // Reset to defaults before each test
        logger.configure({
            enabled: true,
            minLevel: 'debug',
            timestamps: true,
        });
    });

    it('should log debug messages in development', () => {
        logger.debug('This is a debug message');
        logger.debug('Debug with context', { userId: '123', action: 'test' });
    });

    it('should log info messages', () => {
        logger.info('This is an info message');
        logger.info('Info with context', { operation: 'test', status: 'success' });
    });

    it('should log warnings', () => {
        logger.warn('This is a warning');
        logger.warn('Warning with context', { issue: 'deprecated-api', severity: 'medium' });
    });

    it('should log errors with stack traces', () => {
        const error = new Error('Test error');
        logger.error('This is an error', error);
        logger.error('Error with context', error, {
            operation: 'test-operation',
            userId: '123',
        });
    });

    it('should use specialized domain loggers', () => {
        logger.round('Round started', { courseId: '123', playerCount: 4 });
        logger.betting('Skins calculated', { winner: 'player1', amount: 5 });
        logger.mrtz('Balance updated', { playerId: 'player1', newBalance: 100 });
        logger.voice('Command recognized', { transcript: 'hey caddie' });
        logger.sync('Queue processed', { synced: 5, failed: 0 });
        logger.firebase('Document saved', { collection: 'rounds', docId: '123' });
        logger.storage('Data cached', { key: 'currentRound', size: 1024 });
        logger.api('GET', '/api/courses', { courseId: '123' });
    });

    it('should track performance with timers', () => {
        logger.time('test-operation');

        // Simulate work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
            sum += i;
        }

        logger.timeLog('test-operation', 'Checkpoint 1');

        // More work
        for (let i = 0; i < 1000; i++) {
            sum += i;
        }

        logger.timeEnd('test-operation');
        expect(sum).toBeGreaterThan(0);
    });

    it('should group related logs', () => {
        logger.group('Complex Operation');
        logger.info('Step 1: Initialize');
        logger.info('Step 2: Process');
        logger.info('Step 3: Complete');
        logger.groupEnd();
    });

    it('should log tables', () => {
        const data = [
            { name: 'Alice', score: -2, place: 1 },
            { name: 'Bob', score: 0, place: 2 },
            { name: 'Charlie', score: 3, place: 3 },
        ];

        logger.table(data, ['name', 'score', 'place']);
    });

    it('should assert conditions', () => {
        logger.assert(true, 'This should not log');
        logger.assert(false, 'This assertion failed', { expected: true, actual: false });
    });

    it('should be configurable', () => {
        // Disable debug logging
        logger.configure({
            minLevel: 'warn',
        });

        logger.debug('This should not appear'); // Won't show
        logger.info('This should not appear');   // Won't show
        logger.warn('This should appear');       // Will show
        logger.error('This should appear');      // Will show
    });

    it('should create custom logger instances', () => {
        const customLogger = createLogger({
            prefix: '[CustomApp]',
            minLevel: 'info',
            timestamps: false,
        });

        customLogger.info('Custom logger message');
    });
});

/**
 * Demonstration function - call this to see logger output
 */
export function demonstrateLogger() {
    console.log('\n=== LOGGER DEMONSTRATION ===\n');

    // Basic logging
    console.log('--- Basic Logging ---');
    logger.debug('Debug message - only in development');
    logger.info('Info message - only in development');
    logger.warn('Warning message - always shown');
    logger.error('Error message - always shown', new Error('Test error'));

    // With context
    console.log('\n--- Logging with Context ---');
    logger.info('User logged in', {
        userId: 'user123',
        email: 'user@example.com',
        loginMethod: 'google',
    });

    logger.error('Failed to save data', new Error('Network timeout'), {
        operation: 'saveRound',
        roundId: 'round123',
        retryCount: 3,
    });

    // Domain-specific loggers
    console.log('\n--- Domain-Specific Loggers ---');
    logger.round('Starting round', {
        courseId: 'zilker-park',
        courseName: 'Zilker Park',
        playerCount: 4,
    });

    logger.betting('Calculating skins', {
        holeNumber: 5,
        participants: ['player1', 'player2', 'player3', 'player4'],
    });

    logger.mrtz('Balance updated', {
        playerId: 'player1',
        previousBalance: 95.50,
        newBalance: 100.50,
        change: 5.00,
    });

    logger.voice('Command recognized', {
        transcript: 'hey caddie i got a birdie',
        confidence: 0.95,
        command: 'RECORD_SCORE',
    });

    // Performance timing
    console.log('\n--- Performance Timing ---');
    logger.time('expensive-operation');

    // Simulate work
    let result = 0;
    for (let i = 0; i < 10000000; i++) {
        result += i;
    }

    logger.timeLog('expensive-operation', 'Calculation complete');
    logger.timeEnd('expensive-operation');

    // Grouped logging
    console.log('\n--- Grouped Logging ---');
    logger.group('Round End Process');
    logger.info('Step 1: Calculating scores');
    logger.info('Step 2: Resolving bets');
    logger.info('Step 3: Updating MRTZ balances');
    logger.info('Step 4: Saving to Firebase');
    logger.groupEnd();

    // Table logging
    console.log('\n--- Table Logging ---');
    const playerScores = [
        { player: 'Alice', score: -2, relativeToPar: 'Eagle' },
        { player: 'Bob', score: 0, relativeToPar: 'Par' },
        { player: 'Charlie', score: 1, relativeToPar: 'Bogey' },
        { player: 'Dana', score: 3, relativeToPar: 'Triple Bogey' },
    ];
    logger.table(playerScores);

    console.log('\n=== DEMONSTRATION COMPLETE ===\n');
}

// Uncomment to run demonstration
// demonstrateLogger();
