
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSettlement, createSettlementFromBalances } from './mrtzSettlements';
import { getPlayerBalance, getOutstandingBalances } from './mrtzLedger';
import * as firestore from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    collection: vi.fn(() => ({ id: 'mock-collection' })),
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

// Mock modules
vi.mock('@/lib/firebase', () => ({
    db: {}
}));

describe('MRTZ Settlements', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createSettlement', () => {
        it('should create a settlement and return its ID (checking parameter order)', async () => {
            const mockAddDoc = vi.mocked(firestore.addDoc);
            mockAddDoc.mockResolvedValueOnce({ id: 'test-settle-id' } as any);

            const parties = [
                { playerId: 'playerA', role: 'payer' as const, amount: 50 },
                { playerId: 'playerB', role: 'receiver' as const, amount: 50 }
            ];

            // Verify correct parameter order: createdBy is 4th argument (before optional settlementMethod)
            const result = await createSettlement(
                parties,
                ['tx1'],
                'money',
                'playerA', // createdBy
                { moneyAmount: 50, currency: 'USD' } // settlementMethod
            );

            expect(mockAddDoc).toHaveBeenCalled();
            expect(result).toBe('test-settle-id');
        });
    });

    describe('createSettlementFromBalances', () => {
        it('should calculate total and create settlement with correct params', async () => {
            const mockAddDoc = vi.mocked(firestore.addDoc);
            mockAddDoc.mockResolvedValueOnce({ id: 'test-settle-id' } as any);

            // Mock fetching transactions
            const mockGetDocs = vi.mocked(firestore.getDocs);
            mockGetDocs.mockResolvedValueOnce({
                docs: [
                    { data: () => ({ toPlayerId: 'playerB', fromPlayerId: 'playerA', amount: 25 }) },
                    { data: () => ({ toPlayerId: 'playerB', fromPlayerId: 'playerA', amount: 25 }) }
                ]
            } as any);

            const result = await createSettlementFromBalances(
                'playerA',
                'playerB',
                ['tx1', 'tx2'],
                'money',
                'playerA', // createdBy needs to be before settlementMethod
                { moneyAmount: 50 } // settlementMethod
            );

            expect(mockAddDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    totalMRTZ: 100,
                    createdBy: 'playerA',
                    settlementMethod: { moneyAmount: 50 }
                })
            );
            expect(result).toBe('test-settle-id');
        });
    });
});
