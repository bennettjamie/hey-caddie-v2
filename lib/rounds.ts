/**
 * Round management functions for Firestore
 */

import { db } from './firebase';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { Round } from '@/types/firestore';
import { GameRound, Player, FinalRoundData } from '@/types/game'; // Assuming this is where they are
import { queueOperation, isOnline } from './syncQueue';
import { logger } from './logger';
import { STORAGE_KEYS, ROUND_STATUS, CACHE_LIMITS, QUERY_LIMITS } from './constants';

const ROUNDS_COLLECTION = 'rounds';

/**
 * Save a completed round to Firestore
 */
export async function saveRound(roundData: Omit<Round, 'id'>): Promise<string> {
    // Always save locally first
    const tempRound: Round = {
        id: `temp_${Date.now()}`,
        ...roundData
    };
    saveLocalRound(tempRound);

    // If offline, queue for sync
    if (!isOnline()) {
        queueOperation('saveRound', roundData);
        return tempRound.id;
    }

    try {
        const docRef = await addDoc(collection(db, ROUNDS_COLLECTION), {
            ...roundData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        logger.round('Round saved successfully', {
            roundId: docRef.id,
            courseId: roundData.courseId,
            playerCount: roundData.players.length,
            operation: 'save-round'
        });
        return docRef.id;
    } catch (error) {
        logger.error('Error saving round', error, {
            courseId: roundData.courseId,
            playerCount: roundData.players.length,
            operation: 'save-round'
        });
        // Queue for retry if network error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch') || errorMessage.includes('offline')) {
            queueOperation('saveRound', roundData);
        }
        throw error;
    }
}

/**
 * Get a round by ID
 */
export async function getRound(roundId: string): Promise<Round | null> {
    try {
        const docRef = doc(db, ROUNDS_COLLECTION, roundId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as Round;
        }
        return null;
    } catch (error) {
        logger.error('Error getting round', error, {
            roundId,
            operation: 'get-round'
        });
        throw error;
    }
}

/**
 * Get all rounds for a user
 */
export async function getUserRounds(userId: string, limitCount: number = QUERY_LIMITS.USER_ROUNDS_DEFAULT): Promise<Round[]> {
    try {
        const q = query(
            collection(db, ROUNDS_COLLECTION),
            where('players', 'array-contains', userId),
            orderBy('date', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Round[];
    } catch (error) {
        logger.error('Error getting user rounds', error, {
            userId,
            limitCount,
            operation: 'get-user-rounds'
        });
        return [];
    }
}

/**
 * Get all completed rounds (for history)
 */
export async function getCompletedRounds(limitCount: number = QUERY_LIMITS.COMPLETED_ROUNDS_DEFAULT): Promise<Round[]> {
    try {
        const q = query(
            collection(db, ROUNDS_COLLECTION),
            where('status', '==', ROUND_STATUS.COMPLETED),
            orderBy('date', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Round[];
    } catch (error) {
        logger.error('Error getting completed rounds', error, {
            limitCount,
            operation: 'get-completed-rounds'
        });
        return [];
    }
}

/**
 * Get rounds for a specific course
 */
export async function getCourseRounds(courseId: string, limitCount: number = QUERY_LIMITS.COURSE_ROUNDS_DEFAULT): Promise<Round[]> {
    try {
        const q = query(
            collection(db, ROUNDS_COLLECTION),
            where('courseId', '==', courseId),
            where('status', '==', ROUND_STATUS.COMPLETED),
            orderBy('date', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Round[];
    } catch (error) {
        logger.error('Error getting course rounds', error, {
            courseId,
            limitCount,
            operation: 'get-course-rounds'
        });
        return [];
    }
}

/**
 * Update a round
 */
export async function updateRound(roundId: string, updates: Partial<Round>): Promise<void> {
    try {
        const docRef = doc(db, ROUNDS_COLLECTION, roundId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });
        logger.round('Round updated successfully', {
            roundId,
            updateFields: Object.keys(updates),
            operation: 'update-round'
        });
    } catch (error) {
        logger.error('Error updating round', error, {
            roundId,
            updateFields: Object.keys(updates),
            operation: 'update-round'
        });
        throw error;
    }
}

/**
 * Convert round data from game format to Firestore format
 */
export function convertGameRoundToFirestore(
    gameRound: GameRound | FinalRoundData,
    courseId: string,
    layoutId: string,
    status: typeof ROUND_STATUS.COMPLETED | typeof ROUND_STATUS.PARTIAL = ROUND_STATUS.COMPLETED
): Omit<Round, 'id'> {
    // Extract player IDs from game round
    const playerIds = gameRound.players?.map((p: Player) => p.id || (p as any).uid) || [];

    return {
        courseId,
        layoutId,
        date: gameRound.startTime || new Date().toISOString(),
        players: playerIds,
        scores: gameRound.scores || {},
        bets: (gameRound as any).bets || {
            skins: {},
            nassau: null,
            fundatory: []
        },
        status: status
    };
}

/**
 * Get local rounds from localStorage (offline fallback)
 */
export function getLocalRounds(): Round[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.ROUND_HISTORY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Save round to local storage (offline fallback)
 */
export function saveLocalRound(round: Round): void {
    if (typeof window === 'undefined') return;
    try {
        const rounds = getLocalRounds();
        rounds.unshift(round); // Add to beginning
        // Keep only last rounds locally per cache limit
        const limited = rounds.slice(0, CACHE_LIMITS.MAX_ROUND_HISTORY);
        localStorage.setItem(STORAGE_KEYS.ROUND_HISTORY, JSON.stringify(limited));
    } catch (error) {
        logger.error('Error saving round locally', error, {
            roundId: round.id,
            operation: 'save-local-round'
        });
    }
}

/**
 * Create a new ACTIVE round in Firestore
 */
export async function createActiveRound(roundData: Omit<Round, 'id'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, ROUNDS_COLLECTION), {
            ...roundData,
            status: ROUND_STATUS.ACTIVE,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        logger.round('Active round created', {
            roundId: docRef.id,
            courseId: roundData.courseId,
            playerCount: roundData.players.length,
            operation: 'create-active-round'
        });
        return docRef.id;
    } catch (error) {
        logger.error('Error creating active round', error, {
            courseId: roundData.courseId,
            playerCount: roundData.players.length,
            operation: 'create-active-round'
        });
        throw error;
    }
}

/**
 * Subscribe to an active round for real-time updates
 */
export function subscribeToRound(roundId: string, onUpdate: (round: Round) => void): Unsubscribe {
    const docRef = doc(db, ROUNDS_COLLECTION, roundId);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            onUpdate({
                id: docSnap.id,
                ...docSnap.data()
            } as Round);
        }
    }, (error) => {
        logger.error('Error subscribing to round', error, {
            roundId,
            operation: 'subscribe-to-round'
        });
    });
}

/**
 * Update specific fields of an active round (e.g. scores)
 */
export async function updateActiveRound(roundId: string, updates: Partial<Round>): Promise<void> {
    try {
        const docRef = doc(db, ROUNDS_COLLECTION, roundId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });
        logger.round('Active round updated', {
            roundId,
            updateFields: Object.keys(updates),
            operation: 'update-active-round'
        });
    } catch (error) {
        logger.error('Error updating active round', error, {
            roundId,
            updateFields: Object.keys(updates),
            operation: 'update-active-round'
        });
        throw error;
    }
}

