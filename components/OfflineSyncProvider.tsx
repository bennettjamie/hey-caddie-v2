'use client';

import { useEffect } from 'react';
import { initializeAutoSync } from '@/lib/offlineSync';
import OfflineStatus from './OfflineStatus';

export default function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        initializeAutoSync();
    }, []);

    return (
        <>
            {children}
            <OfflineStatus />
        </>
    );
}

