/**
 * Sync Queue System for Offline Operations
 * Queues operations when offline and syncs when connection is restored
 */

export type SyncOperationType = 'saveRound' | 'createPlayer' | 'updatePlayer' | 'updateRound';

export interface SyncOperation {
    id: string;
    type: SyncOperationType;
    data: any;
    timestamp: number;
    retries: number;
}

const SYNC_QUEUE_KEY = 'syncQueue';
const MAX_RETRIES = 3;

/**
 * Check if device is online
 */
export function isOnline(): boolean {
    if (typeof window === 'undefined') return false;
    return navigator.onLine;
}

/**
 * Get sync queue from localStorage
 */
export function getSyncQueue(): SyncOperation[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(SYNC_QUEUE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Save sync queue to localStorage
 */
function saveSyncQueue(queue: SyncOperation[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
        console.error('Error saving sync queue:', error);
    }
}

/**
 * Add operation to sync queue
 */
export function queueOperation(
    type: SyncOperationType,
    data: any
): string {
    const operation: SyncOperation = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        retries: 0
    };

    const queue = getSyncQueue();
    queue.push(operation);
    saveSyncQueue(queue);

    return operation.id;
}

/**
 * Remove operation from sync queue
 */
export function removeOperation(operationId: string): void {
    const queue = getSyncQueue();
    const filtered = queue.filter(op => op.id !== operationId);
    saveSyncQueue(filtered);
}

/**
 * Get pending operations count
 */
export function getPendingOperationsCount(): number {
    return getSyncQueue().length;
}

/**
 * Clear all operations from queue
 */
export function clearSyncQueue(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SYNC_QUEUE_KEY);
}
