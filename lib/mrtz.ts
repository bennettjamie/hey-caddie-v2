/**
 * MRTZ Currency Management
 * Now uses ledger system for full transaction tracking
 */

import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Round } from '@/types/firestore';
import { calculateSkins, calculateNassau, calculateFundatory, FundatoryBet } from './betting';
import { getPlayerBalance, createRoundLedgerEntries } from './mrtzLedger';

const MRTZ_COLLECTION = 'mrtz'; // Legacy collection, kept for backward compatibility

/**
 * Get player MRTZ balance
 */
export async function getPlayerMRTZ(playerId: string): Promise<number> {
    try {
        // Try Firebase first
        const docRef = doc(db, MRTZ_COLLECTION, playerId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data().balance || 0;
        }
        
        // Fallback to local storage
        return getLocalMRTZ(playerId);
    } catch (error) {
        console.error('Error getting player MRTZ:', error);
        return getLocalMRTZ(playerId);
    }
}

/**
 * Update player MRTZ balance
 * DEPRECATED: Use createLedgerEntry from mrtzLedger.ts instead
 * Kept for backward compatibility
 */
export async function updatePlayerMRTZ(playerId: string, amount: number): Promise<void> {
    try {
        // Legacy update - still works but prefer ledger system
        const currentBalance = await getPlayerMRTZ(playerId);
        const newBalance = currentBalance + amount;
        
        // Update legacy Firebase collection
        try {
            const docRef = doc(db, MRTZ_COLLECTION, playerId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                await updateDoc(docRef, {
                    balance: newBalance,
                    updatedAt: Timestamp.now()
                });
            } else {
                await setDoc(docRef, {
                    balance: newBalance,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            }
        } catch (error) {
            console.error('Error updating MRTZ in Firebase:', error);
        }
        
        // Also update local storage
        saveLocalMRTZ(playerId, newBalance);
    } catch (error) {
        console.error('Error updating player MRTZ:', error);
        const currentBalance = getLocalMRTZ(playerId);
        saveLocalMRTZ(playerId, currentBalance + amount);
    }
}

/**
 * Calculate MRTZ from round betting results
 */
export function calculateRoundMRTZ(
    round: Round,
    activeBets: {
        skins?: { value: number; started: boolean; participants?: string[] };
        nassau?: { value: number; started: boolean; participants?: string[] };
    },
    fundatoryBets: FundatoryBet[]
): { [playerId: string]: number } {
    const mrtzResults: { [playerId: string]: number } = {};
    
    // Initialize all players to 0
    round.players.forEach(playerId => {
        mrtzResults[playerId] = 0;
    });
    
    // Calculate Skins MRTZ
    if (activeBets.skins?.started && activeBets.skins.value) {
        const holes = Array.from({ length: 18 }, (_, i) => i + 1);
        const skinsResults = calculateSkins(round.scores, holes, activeBets.skins.value, activeBets.skins.participants);
        
        skinsResults.forEach(skin => {
            if (skin.winnerId) {
                mrtzResults[skin.winnerId] = (mrtzResults[skin.winnerId] || 0) + skin.value;
            }
            // Losers don't lose MRTZ in skins (it's winner-take-all)
        });
    }
    
    // Calculate Nassau MRTZ
    if (activeBets.nassau?.started && activeBets.nassau.value) {
        const nassauResults = calculateNassau(round.scores, round.players, activeBets.nassau.participants);
        const nassauValue = activeBets.nassau.value;
        // Use participants for Nassau if provided, otherwise all players
        const nassauParticipants = activeBets.nassau.participants && activeBets.nassau.participants.length > 0 
            ? activeBets.nassau.participants 
            : round.players;
        
        // Front 9
        if (nassauResults.front9WinnerId) {
            mrtzResults[nassauResults.front9WinnerId] = (mrtzResults[nassauResults.front9WinnerId] || 0) + nassauValue;
            nassauParticipants.forEach(playerId => {
                if (playerId !== nassauResults.front9WinnerId) {
                    mrtzResults[playerId] = (mrtzResults[playerId] || 0) - nassauValue;
                }
            });
        }
        
        // Back 9
        if (nassauResults.back9WinnerId) {
            mrtzResults[nassauResults.back9WinnerId] = (mrtzResults[nassauResults.back9WinnerId] || 0) + nassauValue;
            nassauParticipants.forEach(playerId => {
                if (playerId !== nassauResults.back9WinnerId) {
                    mrtzResults[playerId] = (mrtzResults[playerId] || 0) - nassauValue;
                }
            });
        }
        
        // Overall
        if (nassauResults.overallWinnerId) {
            mrtzResults[nassauResults.overallWinnerId] = (mrtzResults[nassauResults.overallWinnerId] || 0) + nassauValue;
            nassauParticipants.forEach(playerId => {
                if (playerId !== nassauResults.overallWinnerId) {
                    mrtzResults[playerId] = (mrtzResults[playerId] || 0) - nassauValue;
                }
            });
        }
    }
    
    // Calculate Fundatory MRTZ
    if (fundatoryBets.length > 0) {
        const fundatoryResults = calculateFundatory(fundatoryBets);
        Object.entries(fundatoryResults).forEach(([playerId, amount]) => {
            mrtzResults[playerId] = (mrtzResults[playerId] || 0) + amount;
        });
    }
    
    return mrtzResults;
}

/**
 * Get local MRTZ balance from localStorage
 */
export function getLocalMRTZ(playerId: string): number {
    if (typeof window === 'undefined') return 0;
    try {
        const stored = localStorage.getItem('mrtzBalances');
        if (stored) {
            const balances = JSON.parse(stored);
            return balances[playerId] || 0;
        }
        return 0;
    } catch {
        return 0;
    }
}

/**
 * Save MRTZ balance to localStorage
 */
export function saveLocalMRTZ(playerId: string, balance: number): void {
    if (typeof window === 'undefined') return;
    try {
        const stored = localStorage.getItem('mrtzBalances');
        const balances = stored ? JSON.parse(stored) : {};
        balances[playerId] = balance;
        localStorage.setItem('mrtzBalances', JSON.stringify(balances));
    } catch (error) {
        console.error('Error saving MRTZ locally:', error);
    }
}

/**
 * Get all player MRTZ balances (local)
 */
export function getAllLocalMRTZ(): { [playerId: string]: number } {
    if (typeof window === 'undefined') return {};
    try {
        const stored = localStorage.getItem('mrtzBalances');
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

