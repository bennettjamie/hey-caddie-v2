/**
 * MRTZ Settlement Management
 * Handles settlement agreements between players
 */

import { db } from './firebase';
import { 
    collection, 
    doc, 
    addDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { MRTZSettlement, SettlementType, SettlementStatus } from '@/types/mrtz';
import { markTransactionSettled } from './mrtzLedger';

const SETTLEMENTS_COLLECTION = 'mrtz_settlements';

/**
 * Generate unique settlement ID
 */
function generateSettlementId(): string {
    return `settle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a settlement agreement
 */
export async function createSettlement(
    parties: Array<{ playerId: string; role: 'payer' | 'receiver'; amount: number }>,
    transactionIds: string[],
    type: SettlementType,
    settlementMethod?: {
        moneyAmount?: number;
        currency?: string;
        goodDeedId?: string;
        notes?: string;
    },
    createdBy: string
): Promise<string> {
    try {
        const settlementId = generateSettlementId();
        const now = Timestamp.now();
        
        const totalMRTZ = parties.reduce((sum, p) => sum + p.amount, 0);
        
        const settlement: Omit<MRTZSettlement, 'id'> = {
            settlementId,
            type,
            parties: parties.map(p => ({
                ...p,
                agreed: false
            })),
            totalMRTZ,
            settlementMethod,
            status: 'pending',
            transactionIds,
            createdAt: now,
            createdBy,
            updatedAt: now
        };
        
        const docRef = await addDoc(collection(db, SETTLEMENTS_COLLECTION), settlement);
        return docRef.id;
    } catch (error) {
        console.error('Error creating settlement:', error);
        throw error;
    }
}

/**
 * Agree to a settlement (one party confirms)
 */
export async function agreeToSettlement(
    settlementId: string,
    playerId: string
): Promise<boolean> {
    try {
        const q = query(
            collection(db, SETTLEMENTS_COLLECTION),
            where('settlementId', '==', settlementId),
            limit(1)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            throw new Error('Settlement not found');
        }
        
        const settlementDoc = snapshot.docs[0];
        const settlement = settlementDoc.data() as MRTZSettlement;
        
        // Find the party
        const partyIndex = settlement.parties.findIndex(p => p.playerId === playerId);
        if (partyIndex === -1) {
            throw new Error('Player not part of this settlement');
        }
        
        // Update party agreement
        const updatedParties = [...settlement.parties];
        updatedParties[partyIndex] = {
            ...updatedParties[partyIndex],
            agreed: true,
            agreedAt: Timestamp.now()
        };
        
        // Check if all parties have agreed
        const allAgreed = updatedParties.every(p => p.agreed);
        
        await updateDoc(settlementDoc.ref, {
            parties: updatedParties,
            status: allAgreed ? 'agreed' : 'pending',
            agreedAt: allAgreed ? Timestamp.now() : settlement.agreedAt,
            updatedAt: Timestamp.now()
        });
        
        // If all agreed, mark transactions as settled
        if (allAgreed) {
            await completeSettlement(settlementId);
        }
        
        return allAgreed;
    } catch (error) {
        console.error('Error agreeing to settlement:', error);
        throw error;
    }
}

/**
 * Complete a settlement (all parties agreed)
 */
async function completeSettlement(settlementId: string): Promise<void> {
    try {
        const q = query(
            collection(db, SETTLEMENTS_COLLECTION),
            where('settlementId', '==', settlementId),
            limit(1)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            throw new Error('Settlement not found');
        }
        
        const settlementDoc = snapshot.docs[0];
        const settlement = settlementDoc.data() as MRTZSettlement;
        
        // Mark all related transactions as settled
        const batch = writeBatch(db);
        
        for (const txId of settlement.transactionIds) {
            // Find transaction
            const txQuery = query(
                collection(db, 'mrtz_ledger'),
                where('transactionId', '==', txId),
                limit(1)
            );
            const txSnapshot = await getDocs(txQuery);
            
            if (!txSnapshot.empty) {
                const txDoc = txSnapshot.docs[0];
                batch.update(txDoc.ref, {
                    status: 'settled',
                    settlementId,
                    settledAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            }
        }
        
        // Update settlement status
        batch.update(settlementDoc.ref, {
            status: 'completed',
            completedAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        
        await batch.commit();
    } catch (error) {
        console.error('Error completing settlement:', error);
        throw error;
    }
}

/**
 * Reject a settlement
 */
export async function rejectSettlement(
    settlementId: string,
    playerId: string,
    reason?: string
): Promise<void> {
    try {
        const q = query(
            collection(db, SETTLEMENTS_COLLECTION),
            where('settlementId', '==', settlementId),
            limit(1)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            throw new Error('Settlement not found');
        }
        
        const settlementDoc = snapshot.docs[0];
        
        await updateDoc(settlementDoc.ref, {
            status: 'rejected',
            rejectedAt: Timestamp.now(),
            rejectedBy: playerId,
            rejectionReason: reason,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error rejecting settlement:', error);
        throw error;
    }
}

/**
 * Get player's settlements
 */
export async function getPlayerSettlements(
    playerId: string,
    status?: SettlementStatus
): Promise<MRTZSettlement[]> {
    try {
        let q = query(
            collection(db, SETTLEMENTS_COLLECTION),
            where('parties', 'array-contains-any', [{ playerId }]),
            orderBy('createdAt', 'desc')
        );
        
        if (status) {
            q = query(q, where('status', '==', status));
        }
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as MRTZSettlement));
    } catch (error) {
        // Firestore doesn't support array-contains-any with objects
        // Need to query differently
        const allSettlements = await getDocs(collection(db, SETTLEMENTS_COLLECTION));
        return allSettlements.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as MRTZSettlement))
            .filter(s => 
                s.parties.some(p => p.playerId === playerId) &&
                (!status || s.status === status)
            )
            .sort((a, b) => {
                const aDate = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
                const bDate = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
                return bDate.getTime() - aDate.getTime();
            });
    }
}

/**
 * Get settlement by ID
 */
export async function getSettlement(settlementId: string): Promise<MRTZSettlement | null> {
    try {
        const q = query(
            collection(db, SETTLEMENTS_COLLECTION),
            where('settlementId', '==', settlementId),
            limit(1)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return null;
        }
        
        return {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
        } as MRTZSettlement;
    } catch (error) {
        console.error('Error getting settlement:', error);
        return null;
    }
}

/**
 * Create settlement from outstanding balances
 */
export async function createSettlementFromBalances(
    fromPlayerId: string,
    toPlayerId: string,
    transactionIds: string[],
    type: SettlementType,
    settlementMethod?: {
        moneyAmount?: number;
        currency?: string;
        goodDeedId?: string;
        notes?: string;
    },
    createdBy: string
): Promise<string> {
    // Calculate total amount from transactions
    const txQuery = query(
        collection(db, 'mrtz_ledger'),
        where('transactionId', 'in', transactionIds)
    );
    const txSnapshot = await getDocs(txQuery);
    
    let totalAmount = 0;
    txSnapshot.docs.forEach(doc => {
        const tx = doc.data();
        if (tx.toPlayerId === toPlayerId && tx.fromPlayerId === fromPlayerId) {
            totalAmount += tx.amount;
        }
    });
    
    const parties = [
        { playerId: fromPlayerId, role: 'payer' as const, amount: totalAmount },
        { playerId: toPlayerId, role: 'receiver' as const, amount: totalAmount }
    ];
    
    return createSettlement(parties, transactionIds, type, settlementMethod, createdBy);
}

