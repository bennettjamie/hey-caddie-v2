'use client';

import HistoryView from '@/components/HistoryView';
import Link from 'next/link';

export default function RoundHistory() {
    return (
        <main className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1>Round History</h1>
                <Link href="/" className="btn" style={{ backgroundColor: 'var(--primary)' }}>
                    New Round
                </Link>
            </div>
            <HistoryView />
        </main>
    );
}
