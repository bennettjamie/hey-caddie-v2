/**
 * MRTZ Carry-Over Bet Management
 * Handles tracking and resolution of carry-over bets
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
    Timestamp
} from 'firebase/firestore';
import { MRTZCarryOver, CarryOverStatus } from '@/types/mrtz';
import { createLedgerEntry } from './mrtzLedger';

const CARRYOVERS_COLLECTION = 'mrtz_carryovers';

/**
 * Create a carry-over entry
 */
export async function createCarryOver(
    originalRoundId: string,
    betType: 'skins' | 'nassau',
    betValue: number,
    carryOverDetails: MRTZCarryOver['carryOverDetails'],
    participants: string[],
    createdBy: string
): Promise<string> {
    try {
        const now = Timestamp.now();

        const carryOver: Omit<MRTZCarryOver, 'id'> = {
            originalRoundId,
            originalDate: now,
            betType,
            betValue,
            carryOverDetails,
            participants,
            status: 'active',
            createdAt: now,
            updatedAt: now
        };

        const docRef = await addDoc(collection(db, CARRYOVERS_COLLECTION), carryOver);
        return docRef.id;
    } catch (error) {
        console.error('Error creating carry-over:', error);
        throw error;
    }
}

/**
 * Resolve a carry-over
 */
export async function resolveCarryOver(
    carryOverId: string,
    resolvedInRoundId: string,
    resolutionType: 'playoff' | 'split' | 'void' | 'push',
    resolvedBy: string,
    resolutionDetails?: {
        winners?: { [holeNumber: number]: string };
        splitAmounts?: { [playerId: string]: number };
    }
): Promise<void> {
    try {
        const carryOverDoc = doc(db, CARRYOVERS_COLLECTION, carryOverId);
        const carryOverSnap = await getDoc(carryOverDoc);

        if (!carryOverSnap.exists()) {
            throw new Error('Carry-over not found');
        }

        const carryOver = carryOverSnap.data() as MRTZCarryOver;

        // Create ledger entries based on resolution
        if (resolutionType === 'playoff' && resolutionDetails?.winners) {
            // Create entries for each winner
            for (const [holeNumStr, winnerId] of Object.entries(resolutionDetails.winners)) {
                const holeNum = parseInt(holeNumStr);
                const accumulatedValue = carryOver.carryOverDetails.skins?.accumulatedValue || carryOver.betValue;

                await createLedgerEntry({
                    type: 'carry_over_resolved',
                    roundId: resolvedInRoundId,
                    date: Timestamp.now(),
                    toPlayerId: winnerId,
                    participants: carryOver.participants,
                    amount: accumulatedValue,
                    description: `Resolved carry-over from round ${carryOver.originalRoundId}, hole ${holeNum}`,
                    betType: carryOver.betType,
                    betDetails: {
                        holeNumber: holeNum,
                        carryOverFrom: carryOver.carryOverDetails.skins?.holes || [],
                        accumulatedValue
                    },
                    status: 'confirmed',
                    createdBy: resolvedBy
                });
            }
        } else if (resolutionType === 'split' && resolutionDetails?.splitAmounts) {
            // Split among players
            for (const [playerId, amount] of Object.entries(resolutionDetails.splitAmounts)) {
                await createLedgerEntry({
                    type: 'carry_over_resolved',
                    roundId: resolvedInRoundId,
                    date: Timestamp.now(),
                    toPlayerId: playerId,
                    participants: carryOver.participants,
                    amount,
                    description: `Split carry-over from round ${carryOver.originalRoundId}`,
                    betType: carryOver.betType,
                    status: 'confirmed',
                    createdBy: resolvedBy
                });
            }
        } else if (resolutionType === 'void') {
            // Void - no MRTZ awarded, just mark as resolved
            // Could create a void entry if needed
        }

        // Update carry-over status
        await updateDoc(carryOverDoc, {
            status: 'resolved',
            resolvedInRoundId,
            resolvedAt: Timestamp.now(),
            resolutionType,
            resolutionDetails,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error resolving carry-over:', error);
        throw error;
    }
}

/**
 * Get active carry-overs for a player
 */
export async function getActiveCarryOvers(playerId: string): Promise<MRTZCarryOver[]> {
    try {
        const allCarryOvers = await getDocs(collection(db, CARRYOVERS_COLLECTION));

        return allCarryOvers.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as MRTZCarryOver))
            .filter(co =>
                co.status === 'active' &&
                co.participants.includes(playerId)
            )
            .sort((a, b) => {
                const aDate = a.originalDate instanceof Timestamp ? a.originalDate.toDate() : new Date(a.originalDate);
                const bDate = b.originalDate instanceof Timestamp ? b.originalDate.toDate() : new Date(b.originalDate);
                return aDate.getTime() - bDate.getTime(); // Oldest first
            });
    } catch (error) {
        console.error('Error getting active carry-overs:', error);
        return [];
    }
}

/**
 * Get carry-over by ID
 */
export async function getCarryOver(carryOverId: string): Promise<MRTZCarryOver | null> {
    try {
        const carryOverDoc = doc(db, CARRYOVERS_COLLECTION, carryOverId);
        const carryOverSnap = await getDoc(carryOverDoc);

        if (!carryOverSnap.exists()) {
            return null;
        }

        return {
            id: carryOverSnap.id,
            ...carryOverSnap.data()
        } as MRTZCarryOver;
    } catch (error) {
        console.error('Error getting carry-over:', error);
        return null;
    }
}

/**
 * Get carry-overs by round
 */
export async function getCarryOversByRound(roundId: string): Promise<MRTZCarryOver[]> {
    try {
        const q = query(
            collection(db, CARRYOVERS_COLLECTION),
            where('originalRoundId', '==', roundId)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as MRTZCarryOver));
    } catch (error) {
        console.error('Error getting carry-overs by round:', error);
        return [];
    }
}



/**
 * Processes and creates carry-overs for a round's results
 */
export async function processRoundCarryOvers(
    courseId: string,
    playerIds: string[],
    createdBy: string,
    activeBets: any,
    skinsResults: any,
    nassauResults: any
): Promise<void> {
    // Handle Skins carry-overs
    if (skinsResults && Object.keys(skinsResults).length > 0) {
        const carryOverHoles: number[] = [];
        let accumulatedValue = activeBets.skins?.value || 0;

        Object.entries(skinsResults).forEach(([holeNumStr, skin]: [string, any]) => {
            if (skin.carryOver) {
                carryOverHoles.push(parseInt(holeNumStr));
                accumulatedValue += activeBets.skins?.value || 0;
            }
        });

        if (carryOverHoles.length > 0) {
            try {
                await createCarryOver(
                    courseId,
                    'skins',
                    activeBets.skins?.value || 0,
                    {
                        skins: {
                            holes: carryOverHoles,
                            accumulatedValue
                        }
                    },
                    playerIds,
                    createdBy
                );
            } catch (error) {
                console.error('Error creating skins carry-over:', error);
            }
        }
    }

    // Handle Nassau carry-overs
    if (nassauResults) {
        const tiedSegments: ('front9' | 'back9' | 'overall')[] = [];
        if (!nassauResults.front9WinnerId && nassauResults.front9Push) {
            tiedSegments.push('front9');
        }
        if (!nassauResults.back9WinnerId && nassauResults.back9Push) {
            tiedSegments.push('back9');
        }
        if (!nassauResults.overallWinnerId && nassauResults.overallPush) {
            tiedSegments.push('overall');
        }

        if (tiedSegments.length > 0) {
            // Get unique tied players
            const allTiedPlayers = [
                ...(nassauResults.front9Push?.tiedPlayers || []),
                ...(nassauResults.back9Push?.tiedPlayers || []),
                ...(nassauResults.overallPush?.tiedPlayers || [])
            ];
            const uniqueTiedPlayers = allTiedPlayers.filter((v, i, a) => a.indexOf(v) === i);

            try {
                await createCarryOver(
                    courseId,
                    'nassau',
                    activeBets.nassau?.value || 0,
                    {
                        nassau: {
                            segments: tiedSegments,
                            tiedPlayers: uniqueTiedPlayers
                        }
                    },
                    playerIds,
                    createdBy
                );
            } catch (error) {
                console.error('Error creating Nassau carry-over:', error);
            }
        }
    }
}
