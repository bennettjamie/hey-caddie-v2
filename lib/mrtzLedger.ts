/**
 * MRTZ Ledger Management
 * Handles all transaction recording and balance tracking
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
    writeBatch,
    runTransaction
} from 'firebase/firestore';
import { MRTZLedgerEntry, MRTZBalance, OutstandingBalance, PlayerMRTZSummary } from '@/types/mrtz';

const LEDGER_COLLECTION = 'mrtz_ledger';
const BALANCES_COLLECTION = 'mrtz_balances';

/**
 * Generate unique transaction ID
 */
function generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a ledger entry
 */
export async function createLedgerEntry(
    entry: Omit<MRTZLedgerEntry, 'id' | 'transactionId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    try {
        const transactionId = generateTransactionId();
        const now = Timestamp.now();
        
        const ledgerEntry: Omit<MRTZLedgerEntry, 'id'> = {
            ...entry,
            transactionId,
            date: entry.date instanceof Date ? Timestamp.fromDate(entry.date) : entry.date,
            createdAt: now,
            updatedAt: now
        };

        // Add to ledger
        const docRef = await addDoc(collection(db, LEDGER_COLLECTION), ledgerEntry);
        
        // Update balances for all affected players
        await updateBalancesFromTransaction(ledgerEntry);
        
        return docRef.id;
    } catch (error) {
        console.error('Error creating ledger entry:', error);
        throw error;
    }
}

/**
 * Update balances based on transaction
 */
async function updateBalancesFromTransaction(entry: MRTZLedgerEntry): Promise<void> {
    const batch = writeBatch(db);
    const playersToUpdate = new Set<string>();
    
    // Add all participants
    entry.participants.forEach(p => playersToUpdate.add(p));
    if (entry.fromPlayerId) playersToUpdate.add(entry.fromPlayerId);
    if (entry.toPlayerId) playersToUpdate.add(entry.toPlayerId);
    
    // Update each player's balance
    for (const playerId of playersToUpdate) {
        const balanceRef = doc(db, BALANCES_COLLECTION, playerId);
        const balanceSnap = await getDoc(balanceRef);
        
        let currentBalance = 0;
        let pendingIn = 0;
        let pendingOut = 0;
        let transactionCount = 0;
        
        if (balanceSnap.exists()) {
            const data = balanceSnap.data();
            currentBalance = data.balance || 0;
            pendingIn = data.pendingIn || 0;
            pendingOut = data.pendingOut || 0;
            transactionCount = data.transactionCount || 0;
        }
        
        // Calculate changes based on transaction
        if (entry.status === 'confirmed' || entry.status === 'settled') {
            if (entry.toPlayerId === playerId) {
                currentBalance += entry.amount;
            }
            if (entry.fromPlayerId === playerId && entry.amount < 0) {
                // Loss - already accounted in toPlayerId's win
                // For Nassau, losers pay winners
                if (entry.type === 'bet_loss') {
                    currentBalance += entry.amount; // Negative amount
                }
            }
        } else if (entry.status === 'pending') {
            if (entry.toPlayerId === playerId) {
                pendingIn += Math.abs(entry.amount);
            }
            if (entry.fromPlayerId === playerId) {
                pendingOut += Math.abs(entry.amount);
            }
        }
        
        transactionCount += 1;
        
        const updateData: Partial<MRTZBalance> = {
            balance: currentBalance,
            pendingIn,
            pendingOut,
            transactionCount,
            lastUpdated: Timestamp.now(),
            lastTransactionId: entry.transactionId
        };
        
        if (balanceSnap.exists()) {
            batch.update(balanceRef, updateData);
        } else {
            batch.set(balanceRef, {
                playerId,
                ...updateData
            });
        }
    }
    
    await batch.commit();
}

/**
 * Get player's ledger entries
 */
export async function getPlayerLedger(
    playerId: string,
    options?: {
        limit?: number;
        startAfter?: any;
        type?: string;
        status?: string;
    }
): Promise<MRTZLedgerEntry[]> {
    try {
        let q = query(
            collection(db, LEDGER_COLLECTION),
            where('participants', 'array-contains', playerId),
            orderBy('date', 'desc')
        );
        
        if (options?.type) {
            q = query(q, where('type', '==', options.type));
        }
        
        if (options?.status) {
            q = query(q, where('status', '==', options.status));
        }
        
        if (options?.limit) {
            q = query(q, limit(options.limit));
        }
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as MRTZLedgerEntry));
    } catch (error) {
        console.error('Error getting player ledger:', error);
        return [];
    }
}

/**
 * Get player's current balance
 */
export async function getPlayerBalance(playerId: string): Promise<MRTZBalance | null> {
    try {
        const docRef = doc(db, BALANCES_COLLECTION, playerId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return {
                playerId,
                ...docSnap.data()
            } as MRTZBalance;
        }
        
        // Return zero balance if doesn't exist
        return {
            playerId,
            balance: 0,
            pendingIn: 0,
            pendingOut: 0,
            transactionCount: 0,
            lastUpdated: Timestamp.now()
        };
    } catch (error) {
        console.error('Error getting player balance:', error);
        return null;
    }
}

/**
 * Get outstanding balances (who owes whom)
 */
export async function getOutstandingBalances(
    playerId: string
): Promise<{
    owedToMe: OutstandingBalance[];
    iOwe: OutstandingBalance[];
}> {
    try {
        // Get all pending transactions involving this player
        const q = query(
            collection(db, LEDGER_COLLECTION),
            where('participants', 'array-contains', playerId),
            where('status', 'in', ['pending', 'confirmed']),
            orderBy('date', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as MRTZLedgerEntry));
        
        // Group by other party
        const owedToMe: Map<string, OutstandingBalance> = new Map();
        const iOwe: Map<string, OutstandingBalance> = new Map();
        
        transactions.forEach(tx => {
            if (tx.toPlayerId === playerId && tx.status !== 'settled') {
                const otherPlayerId = tx.fromPlayerId || tx.participants.find(p => p !== playerId) || 'unknown';
                if (!owedToMe.has(otherPlayerId)) {
                    owedToMe.set(otherPlayerId, {
                        fromPlayerId: otherPlayerId,
                        fromPlayerName: '', // Will need to fetch
                        toPlayerId: playerId,
                        toPlayerName: '',
                        totalAmount: 0,
                        transactionIds: [],
                        oldestTransactionDate: new Date(),
                        newestTransactionDate: new Date(),
                        canSettle: false
                    });
                }
                const balance = owedToMe.get(otherPlayerId)!;
                balance.totalAmount += Math.abs(tx.amount);
                balance.transactionIds.push(tx.transactionId);
            }
            
            if (tx.fromPlayerId === playerId && tx.status !== 'settled') {
                const otherPlayerId = tx.toPlayerId || tx.participants.find(p => p !== playerId) || 'unknown';
                if (!iOwe.has(otherPlayerId)) {
                    iOwe.set(otherPlayerId, {
                        fromPlayerId: playerId,
                        fromPlayerName: '',
                        toPlayerId: otherPlayerId,
                        toPlayerName: '',
                        totalAmount: 0,
                        transactionIds: [],
                        oldestTransactionDate: new Date(),
                        newestTransactionDate: new Date(),
                        canSettle: false
                    });
                }
                const balance = iOwe.get(otherPlayerId)!;
                balance.totalAmount += Math.abs(tx.amount);
                balance.transactionIds.push(tx.transactionId);
            }
        });
        
        // TODO: Fetch player names for better display
        // For now, return with empty names
        
        return {
            owedToMe: Array.from(owedToMe.values()),
            iOwe: Array.from(iOwe.values())
        };
    } catch (error) {
        console.error('Error getting outstanding balances:', error);
        return { owedToMe: [], iOwe: [] };
    }
}

/**
 * Get player MRTZ summary
 */
export async function getPlayerMRTZSummary(playerId: string): Promise<PlayerMRTZSummary | null> {
    try {
        const balance = await getPlayerBalance(playerId);
        if (!balance) return null;
        
        // Get all transactions for lifetime stats
        const allTransactions = await getPlayerLedger(playerId);
        
        let totalWon = 0;
        let totalLost = 0;
        let totalSettled = 0;
        
        allTransactions.forEach(tx => {
            if (tx.status === 'settled') {
                totalSettled += Math.abs(tx.amount);
            }
            if (tx.toPlayerId === playerId && tx.type === 'bet_win') {
                totalWon += tx.amount;
            }
            if (tx.fromPlayerId === playerId && tx.type === 'bet_loss') {
                totalLost += Math.abs(tx.amount);
            }
        });
        
        return {
            playerId,
            playerName: '', // Will need to fetch
            currentBalance: balance.balance,
            pendingIn: balance.pendingIn,
            pendingOut: balance.pendingOut,
            netBalance: balance.balance + balance.pendingIn - balance.pendingOut,
            totalWon,
            totalLost,
            totalSettled,
            transactionCount: balance.transactionCount
        };
    } catch (error) {
        console.error('Error getting player summary:', error);
        return null;
    }
}

/**
 * Mark transaction as settled
 */
export async function markTransactionSettled(
    transactionId: string,
    settlementId: string,
    settledBy: string
): Promise<void> {
    try {
        // Find transaction
        const q = query(
            collection(db, LEDGER_COLLECTION),
            where('transactionId', '==', transactionId),
            limit(1)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            throw new Error('Transaction not found');
        }
        
        const txDoc = snapshot.docs[0];
        await updateDoc(txDoc.ref, {
            status: 'settled',
            settlementId,
            settledAt: Timestamp.now(),
            settledBy,
            updatedAt: Timestamp.now()
        });
        
        // Update balances
        const txData = txDoc.data() as MRTZLedgerEntry;
        await updateBalancesFromTransaction({
            ...txData,
            status: 'settled',
            settlementId,
            settledAt: Timestamp.now(),
            settledBy
        });
    } catch (error) {
        console.error('Error marking transaction as settled:', error);
        throw error;
    }
}

/**
 * Create ledger entries for a round's betting results
 * For group bets (skins, nassau), creates individual transactions showing all participants
 */
export async function createRoundLedgerEntries(
    roundId: string,
    roundMRTZ: { [playerId: string]: number },
    activeBets: {
        skins?: { value: number; started: boolean };
        nassau?: { value: number; started: boolean };
    },
    fundatoryBets: any[],
    players: Array<{ id: string; name: string }>,
    createdBy: string
): Promise<string[]> {
    const transactionIds: string[] = [];
    const playerIds = players.map(p => p.id);
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    
    try {
        // For group bets, we need to show who paid whom
        // Skins: Winners receive from all players
        // Nassau: Winners receive from all players, losers pay winners
        
        // Create entries for each player's net MRTZ
        for (const [playerId, amount] of Object.entries(roundMRTZ)) {
            if (amount === 0) continue;
            
            const isWin = amount > 0;
            const playerName = playerMap.get(playerId) || playerId;
            
            // Build description
            let description = '';
            if (activeBets.skins?.started) {
                description = `Skins bet: ${isWin ? 'Won' : 'Lost'} ${Math.abs(amount).toFixed(2)} MRTZ`;
            } else if (activeBets.nassau?.started) {
                description = `Nassau bet: ${isWin ? 'Won' : 'Lost'} ${Math.abs(amount).toFixed(2)} MRTZ`;
            } else if (fundatoryBets.length > 0) {
                description = `Fundatory bet: ${isWin ? 'Won' : 'Lost'} ${Math.abs(amount).toFixed(2)} MRTZ`;
            } else {
                description = `Round betting: ${isWin ? 'Won' : 'Lost'} ${Math.abs(amount).toFixed(2)} MRTZ`;
            }
            
            const entry: Omit<MRTZLedgerEntry, 'id' | 'transactionId' | 'createdAt' | 'updatedAt'> = {
                type: isWin ? 'bet_win' : 'bet_loss',
                roundId,
                date: Timestamp.now(),
                fromPlayerId: isWin ? undefined : playerId,
                toPlayerId: isWin ? playerId : undefined,
                participants: playerIds,
                amount: Math.abs(amount),
                description,
                betType: activeBets.skins?.started ? 'skins' : activeBets.nassau?.started ? 'nassau' : 'fundatory',
                status: 'confirmed',
                createdBy
            };
            
            const txId = await createLedgerEntry(entry);
            transactionIds.push(txId);
        }
        
        return transactionIds;
    } catch (error) {
        console.error('Error creating round ledger entries:', error);
        throw error;
    }
}

/**
 * Get transactions by round
 */
export async function getRoundTransactions(roundId: string): Promise<MRTZLedgerEntry[]> {
    try {
        const q = query(
            collection(db, LEDGER_COLLECTION),
            where('roundId', '==', roundId),
            orderBy('date', 'desc')
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as MRTZLedgerEntry));
    } catch (error) {
        console.error('Error getting round transactions:', error);
        return [];
    }
}

