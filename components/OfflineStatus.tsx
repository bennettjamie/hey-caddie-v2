'use client';

import { useState, useEffect } from 'react';
import { getPendingOperationsCount, isOnline } from '@/lib/syncQueue';
import { setSyncStatusCallback, processSyncQueue } from '@/lib/offlineSync';

export default function OfflineStatus() {
    const [isOffline, setIsOffline] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncedCount, setSyncedCount] = useState(0);

    useEffect(() => {
        setIsOffline(!isOnline());
        setPendingCount(getPendingOperationsCount());

        const handleOnline = () => {
            setIsOffline(false);
            processSyncQueue();
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Set sync status callback
        setSyncStatusCallback((status) => {
            setIsSyncing(status.isSyncing);
            setPendingCount(status.pendingCount);
            setSyncedCount(status.syncedCount);
        });

        // Check pending count periodically
        const interval = setInterval(() => {
            setPendingCount(getPendingOperationsCount());
        }, 2000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
            setSyncStatusCallback(null);
        };
    }, []);

    if (!isOffline && pendingCount === 0 && !isSyncing) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '1rem',
                right: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: isOffline ? '#ef4444' : isSyncing ? '#3b82f6' : '#10b981',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 500,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}
        >
            {isOffline ? (
                <>
                    <span>📴</span>
                    <span>Offline Mode</span>
                    {pendingCount > 0 && (
                        <span style={{ marginLeft: '0.5rem', opacity: 0.9 }}>
                            ({pendingCount} pending)
                        </span>
                    )}
                </>
            ) : isSyncing ? (
                <>
                    <span>🔄</span>
                    <span>Syncing...</span>
                    {syncedCount > 0 && (
                        <span style={{ marginLeft: '0.5rem', opacity: 0.9 }}>
                            {syncedCount} synced
                        </span>
                    )}
                </>
            ) : pendingCount > 0 ? (
                <>
                    <span>⏳</span>
                    <span>{pendingCount} pending sync</span>
                </>
            ) : null}
        </div>
    );
}
