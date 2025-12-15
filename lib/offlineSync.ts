/**
 * Automatic Sync Manager
 * Handles syncing queued operations when connection is restored
 */

import { getSyncQueue, removeOperation, isOnline, SyncOperation } from './syncQueue';
import { saveRound } from './rounds';
import { createPlayer, updatePlayer } from './players';
import { updateRound } from './rounds';

type SyncStatusCallback = (status: {
    isSyncing: boolean;
    pendingCount: number;
    syncedCount: number;
    failedCount: number;
}) => void;

let syncStatusCallback: SyncStatusCallback | null = null;
let isSyncing = false;

/**
 * Set callback for sync status updates
 */
export function setSyncStatusCallback(callback: SyncStatusCallback | null): void {
    syncStatusCallback = callback;
}

/**
 * Notify sync status
 */
function notifySyncStatus(
    pendingCount: number,
    syncedCount: number,
    failedCount: number
): void {
    if (syncStatusCallback) {
        syncStatusCallback({
            isSyncing,
            pendingCount,
            syncedCount,
            failedCount
        });
    }
}

/**
 * Execute a single sync operation
 */
async function executeOperation(operation: SyncOperation): Promise<boolean> {
    try {
        switch (operation.type) {
            case 'saveRound':
                await saveRound(operation.data);
                return true;
            case 'createPlayer':
                await createPlayer(operation.data);
                return true;
            case 'updatePlayer':
                // operation.data should be { playerId: string, updates: Partial<Player> }
                if (operation.data.playerId && operation.data.updates) {
                    await updatePlayer(operation.data.playerId, operation.data.updates);
                    return true;
                }
                return false;
            case 'updateRound':
                // operation.data should be { roundId: string, updates: Partial<Round> }
                if (operation.data.roundId && operation.data.updates) {
                    await updateRound(operation.data.roundId, operation.data.updates);
                    return true;
                }
                return false;
            default:
                console.warn('Unknown operation type:', operation.type);
                return false;
        }
    } catch (error) {
        console.error(`Error executing ${operation.type}:`, error);
        // Check if it's a network error
        const isNetworkError = error instanceof Error && (
            error.message.includes('network') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('offline')
        );
        // Only retry network errors
        return !isNetworkError;
    }
}

/**
 * Process sync queue
 */
export async function processSyncQueue(): Promise<{
    synced: number;
    failed: number;
}> {
    if (!isOnline() || isSyncing) {
        return { synced: 0, failed: 0 };
    }

    isSyncing = true;
    const queue = getSyncQueue();
    let synced = 0;
    let failed = 0;

    notifySyncStatus(queue.length, synced, failed);

    for (const operation of queue) {
        if (!isOnline()) {
            // Connection lost during sync
            break;
        }

        const success = await executeOperation(operation);
        
        if (success) {
            removeOperation(operation.id);
            synced++;
        } else {
            // Increment retries
            const updatedQueue = getSyncQueue();
            const opIndex = updatedQueue.findIndex(op => op.id === operation.id);
            if (opIndex !== -1) {
                updatedQueue[opIndex].retries++;
                if (updatedQueue[opIndex].retries >= 3) {
                    // Max retries reached, remove it
                    removeOperation(operation.id);
                    failed++;
                } else {
                    // Save updated retry count
                    localStorage.setItem('syncQueue', JSON.stringify(updatedQueue));
                }
            }
        }

        notifySyncStatus(queue.length - synced - failed, synced, failed);

        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    isSyncing = false;
    const remaining = getSyncQueue().length;
    notifySyncStatus(remaining, synced, failed);

    return { synced, failed };
}

/**
 * Initialize automatic sync on connection restore
 */
export function initializeAutoSync(): void {
    if (typeof window === 'undefined') return;

    // Process queue immediately if online
    if (isOnline()) {
        setTimeout(() => processSyncQueue(), 1000);
    }

    // Listen for online event
    window.addEventListener('online', () => {
        console.log('Connection restored, syncing queued operations...');
        setTimeout(() => processSyncQueue(), 500);
    });

    // Periodic sync check (every 30 seconds)
    setInterval(() => {
        if (isOnline() && !isSyncing) {
            const queue = getSyncQueue();
            if (queue.length > 0) {
                processSyncQueue();
            }
        }
    }, 30000);
}
