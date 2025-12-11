/**
 * Player management functions for Firestore
 */

import { db } from './firebase';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc, 
    deleteDoc,
    query, 
    where, 
    orderBy, 
    limit,
    Timestamp 
} from 'firebase/firestore';

export interface Player {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    userId?: string; // Link to Firebase Auth user if available
    stats?: {
        roundsPlayed: number;
        averageScore: number;
        bestRound?: number;
        bestCourse?: string;
    };
    createdAt?: any;
    updatedAt?: any;
}

const PLAYERS_COLLECTION = 'players';

/**
 * Create a new player
 */
export async function createPlayer(playerData: Omit<Player, 'id'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, PLAYERS_COLLECTION), {
            ...playerData,
            stats: playerData.stats || {
                roundsPlayed: 0,
                averageScore: 0
            },
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating player:', error);
        throw error;
    }
}

/**
 * Get a player by ID
 */
export async function getPlayer(playerId: string): Promise<Player | null> {
    try {
        const docRef = doc(db, PLAYERS_COLLECTION, playerId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as Player;
        }
        return null;
    } catch (error) {
        console.error('Error getting player:', error);
        return null;
    }
}

/**
 * Get all players
 */
export async function getAllPlayers(limitCount: number = 100): Promise<Player[]> {
    try {
        const q = query(
            collection(db, PLAYERS_COLLECTION),
            orderBy('name', 'asc'),
            limit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Player[];
    } catch (error) {
        console.error('Error getting players:', error);
        return [];
    }
}

/**
 * Search players by name
 */
export async function searchPlayers(searchTerm: string): Promise<Player[]> {
    try {
        const allPlayers = await getAllPlayers();
        const lowerSearch = searchTerm.toLowerCase();
        return allPlayers.filter(
            (player) =>
                player.name.toLowerCase().includes(lowerSearch) ||
                player.email?.toLowerCase().includes(lowerSearch)
        );
    } catch (error) {
        console.error('Error searching players:', error);
        return [];
    }
}

/**
 * Get players by user ID (for authenticated users)
 */
export async function getPlayersByUserId(userId: string): Promise<Player[]> {
    try {
        const q = query(
            collection(db, PLAYERS_COLLECTION),
            where('userId', '==', userId),
            orderBy('name', 'asc')
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Player[];
    } catch (error) {
        console.error('Error getting players by user ID:', error);
        return [];
    }
}

/**
 * Update a player
 */
export async function updatePlayer(playerId: string, updates: Partial<Player>): Promise<void> {
    try {
        const docRef = doc(db, PLAYERS_COLLECTION, playerId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error updating player:', error);
        throw error;
    }
}

/**
 * Delete a player
 */
export async function deletePlayer(playerId: string): Promise<void> {
    try {
        const docRef = doc(db, PLAYERS_COLLECTION, playerId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting player:', error);
        throw error;
    }
}

/**
 * Update player statistics after a round
 */
export async function updatePlayerStats(playerId: string, roundScore: number): Promise<void> {
    try {
        const player = await getPlayer(playerId);
        if (!player) return;

        const currentStats = player.stats || { roundsPlayed: 0, averageScore: 0 };
        const newRoundsPlayed = currentStats.roundsPlayed + 1;
        const newAverageScore = 
            (currentStats.averageScore * currentStats.roundsPlayed + roundScore) / newRoundsPlayed;

        const updates: Partial<Player> = {
            stats: {
                roundsPlayed: newRoundsPlayed,
                averageScore: Math.round(newAverageScore * 100) / 100, // Round to 2 decimals
                bestRound: currentStats.bestRound 
                    ? Math.min(currentStats.bestRound, roundScore) 
                    : roundScore
            }
        };

        await updatePlayer(playerId, updates);
    } catch (error) {
        console.error('Error updating player stats:', error);
    }
}

/**
 * Get local players from localStorage (offline fallback)
 */
export function getLocalPlayers(): Player[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem('players');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Save player to local storage (offline fallback)
 */
export function saveLocalPlayer(player: Player): void {
    if (typeof window === 'undefined') return;
    try {
        const players = getLocalPlayers();
        const existingIndex = players.findIndex(p => p.id === player.id);
        if (existingIndex >= 0) {
            players[existingIndex] = player;
        } else {
            players.push(player);
        }
        localStorage.setItem('players', JSON.stringify(players));
    } catch (error) {
        console.error('Error saving player locally:', error);
    }
}

/**
 * Get or create player by name (useful for quick player creation)
 */
export async function getOrCreatePlayerByName(name: string, userId?: string): Promise<Player> {
    try {
        // Search for existing player
        const existing = await searchPlayers(name);
        const exactMatch = existing.find(p => p.name.toLowerCase() === name.toLowerCase());
        
        if (exactMatch) {
            return exactMatch;
        }

        // Create new player
        const playerId = await createPlayer({
            name,
            userId,
            stats: {
                roundsPlayed: 0,
                averageScore: 0
            }
        });

        return await getPlayer(playerId) || {
            id: playerId,
            name,
            userId,
            stats: {
                roundsPlayed: 0,
                averageScore: 0
            }
        };
    } catch (error) {
        console.error('Error getting or creating player:', error);
        // Return a local player as fallback
        return {
            id: `local_${Date.now()}`,
            name,
            userId,
            stats: {
                roundsPlayed: 0,
                averageScore: 0
            }
        };
    }
}

