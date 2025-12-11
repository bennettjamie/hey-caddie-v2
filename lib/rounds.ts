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
    Timestamp 
} from 'firebase/firestore';
import { Round } from '@/types/firestore';

const ROUNDS_COLLECTION = 'rounds';

/**
 * Save a completed round to Firestore
 */
export async function saveRound(roundData: Omit<Round, 'id'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, ROUNDS_COLLECTION), {
            ...roundData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error saving round:', error);
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
        console.error('Error getting round:', error);
        throw error;
    }
}

/**
 * Get all rounds for a user
 */
export async function getUserRounds(userId: string, limitCount: number = 50): Promise<Round[]> {
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
        console.error('Error getting user rounds:', error);
        return [];
    }
}

/**
 * Get all completed rounds (for history)
 */
export async function getCompletedRounds(limitCount: number = 100): Promise<Round[]> {
    try {
        const q = query(
            collection(db, ROUNDS_COLLECTION),
            where('status', '==', 'completed'),
            orderBy('date', 'desc'),
            limit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Round[];
    } catch (error) {
        console.error('Error getting completed rounds:', error);
        return [];
    }
}

/**
 * Get rounds for a specific course
 */
export async function getCourseRounds(courseId: string, limitCount: number = 50): Promise<Round[]> {
    try {
        const q = query(
            collection(db, ROUNDS_COLLECTION),
            where('courseId', '==', courseId),
            where('status', '==', 'completed'),
            orderBy('date', 'desc'),
            limit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Round[];
    } catch (error) {
        console.error('Error getting course rounds:', error);
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
    } catch (error) {
        console.error('Error updating round:', error);
        throw error;
    }
}

/**
 * Convert round data from game format to Firestore format
 */
export function convertGameRoundToFirestore(
    gameRound: any,
    courseId: string,
    layoutId: string
): Omit<Round, 'id'> {
    // Extract player IDs from game round
    const playerIds = gameRound.players?.map((p: any) => p.id || p.uid) || [];
    
    return {
        courseId,
        layoutId,
        date: gameRound.startTime || new Date().toISOString(),
        players: playerIds,
        scores: gameRound.scores || {},
        bets: gameRound.bets || {
            skins: {},
            nassau: null,
            fundatory: []
        },
        status: 'completed'
    };
}

/**
 * Get local rounds from localStorage (offline fallback)
 */
export function getLocalRounds(): Round[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem('roundHistory');
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
        // Keep only last 50 rounds locally
        const limited = rounds.slice(0, 50);
        localStorage.setItem('roundHistory', JSON.stringify(limited));
    } catch (error) {
        console.error('Error saving round locally:', error);
    }
}

