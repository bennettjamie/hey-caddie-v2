
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLedgerEntry, getPlayerBalance } from './mrtzLedger';
import { MRTZLedgerEntry } from '@/types/mrtz';
import * as firestore from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    addDoc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    Timestamp: {
        now: () => ({ toDate: () => new Date() })
    },
    writeBatch: vi.fn(() => ({
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
    }))
}));

// Mock the export from local firebase module
vi.mock('@/lib/firebase', () => ({
    db: {}
}));

describe('MRTZ Ledger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createLedgerEntry', () => {
        it('should create a ledger entry and return its ID', async () => {
            const mockAddDoc = vi.mocked(firestore.addDoc);
            mockAddDoc.mockResolvedValueOnce({ id: 'test-ledger-id' } as any);

            // Mock getDoc for updating balances (assuming updateBalancesFromTransaction calls it)
            const mockGetDoc = vi.mocked(firestore.getDoc);
            mockGetDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({ balance: 100 })
            } as any);

            const entry: Omit<MRTZLedgerEntry, 'id'> = {
                transactionId: 'tx-123',
                createdAt: expect.any(Object),  // Mocked timestamp
                amount: 50,
                fromPlayerId: 'playerA',
                toPlayerId: 'playerB',
                type: 'bet_settlement',
                status: 'completed',
                description: 'Test transaction',
                participants: ['playerA', 'playerB'],
                updatedAt: expect.any(Object)
            } as any;

            const result = await createLedgerEntry(entry as any);

            expect(mockAddDoc).toHaveBeenCalled();
            expect(result).toBe('test-ledger-id');
        });
    });

    describe('getPlayerBalance', () => {
        it('should return player balance if it exists', async () => {
            const mockGetDoc = vi.mocked(firestore.getDoc);
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ balance: 150 })
            } as any);

            const balance = await getPlayerBalance('playerA');
            expect(balance).not.toBeNull();
            expect(balance!.balance).toBe(150);
            expect(balance!.playerId).toBe('playerA');
        });

        it('should return 0 if player balance does not exist', async () => {
            const mockGetDoc = vi.mocked(firestore.getDoc);
            mockGetDoc.mockResolvedValueOnce({
                exists: () => false,
                data: () => undefined
            } as any);

            const balance = await getPlayerBalance('playerB');
            expect(balance).not.toBeNull();
            expect(balance!.balance).toBe(0);
            expect(balance!.playerId).toBe('playerB');
        });
    });
});
