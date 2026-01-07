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
import { queueOperation, isOnline } from './syncQueue';
import { logger } from './logger';
import { STORAGE_KEYS, QUERY_LIMITS } from './constants';

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
    mrtzBalance?: number; // Current MRTZ balance

    // Friend system fields
    claimToken?: string; // Active claim token if unclaimed
    isPublic?: boolean; // Searchable in player discovery
    searchableName?: string; // Lowercase for case-insensitive search

    createdAt?: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

const PLAYERS_COLLECTION = 'players';

/**
 * Create a new player
 */
export async function createPlayer(playerData: Omit<Player, 'id'>): Promise<string> {
    // If offline, queue for sync and save locally
    if (!isOnline()) {
        const tempPlayer: Player = {
            id: `temp_${Date.now()}`,
            ...playerData,
            stats: playerData.stats || {
                roundsPlayed: 0,
                averageScore: 0
            }
        };
        saveLocalPlayer(tempPlayer);
        queueOperation('createPlayer', playerData);
        return tempPlayer.id;
    }

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
        logger.firebase('Player created successfully', {
            playerId: docRef.id,
            playerName: playerData.name,
            operation: 'create-player'
        });
        return docRef.id;
    } catch (error) {
        logger.error('Error creating player', error, {
            playerName: playerData.name,
            operation: 'create-player'
        });
        // Queue for retry if network error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch') || errorMessage.includes('offline')) {
            queueOperation('createPlayer', playerData);
        }
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
        logger.error('Error getting player', error, {
            playerId,
            operation: 'get-player'
        });
        return null;
    }
}

/**
 * Get all players
 */
export async function getAllPlayers(limitCount: number = QUERY_LIMITS.ALL_PLAYERS_DEFAULT): Promise<Player[]> {
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
        logger.error('Error getting players', error, {
            limitCount,
            operation: 'get-all-players'
        });
        return [];
    }
}

/**
 * Search players by name
 */
export async function searchPlayers(searchTerm: string): Promise<Player[]> {
    try {
        const lowerSearch = searchTerm.toLowerCase();

        // Firestore doesn't support native partial matching easily without third-party services like Algolia.
        // However, we can optimize by using 'startAt' and 'endAt' for prefix matching if we had a normalized 'searchName' field.
        // For now, since we don't have that, let's limit the download to reasonably recently active players or just fetch all 
        // IF the collection is small. But user says it is slow.

        // IMPROVEMENT: Limit to 100 recent players and filter locally, OR use a prefix query if possible.
        // Let's implement a prefix query on 'name' as a best-effort optimization.
        // Note: This is case-sensitive usually.

        const q = query(
            collection(db, PLAYERS_COLLECTION),
            orderBy('name'),
            where('name', '>=', searchTerm),
            where('name', '<=', searchTerm + '\uf8ff'),
            limit(QUERY_LIMITS.PLAYER_SEARCH_RESULTS)
        );

        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Player[];

        // Fallback: If case-sensitive prefix query returns nothing, try fetching recent players
        // This handles cases where user types "jo" but name is "John".
        // (Firestore 'startAt' is case sensitive).
        if (results.length === 0 && searchTerm.length > 2) {
            // Fallback to fetching a batch of players.
            // Ideally we should have a 'searchName' lowercase field.
            const allQ = query(collection(db, PLAYERS_COLLECTION), limit(QUERY_LIMITS.PLAYER_SEARCH_FALLBACK));
            const allSnap = await getDocs(allQ);
            return allSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Player))
                .filter(p => p.name.toLowerCase().includes(lowerSearch));
        }

        return results;
    } catch (error) {
        logger.error('Error searching players', error, {
            searchTerm,
            operation: 'search-players'
        });
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
        logger.error('Error getting players by user ID', error, {
            userId,
            operation: 'get-players-by-user-id'
        });
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
        logger.firebase('Player updated successfully', {
            playerId,
            updateFields: Object.keys(updates),
            operation: 'update-player'
        });
    } catch (error) {
        logger.error('Error updating player', error, {
            playerId,
            updateFields: Object.keys(updates),
            operation: 'update-player'
        });
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
        logger.firebase('Player deleted successfully', {
            playerId,
            operation: 'delete-player'
        });
    } catch (error) {
        logger.error('Error deleting player', error, {
            playerId,
            operation: 'delete-player'
        });
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
        logger.firebase('Player stats updated', {
            playerId,
            roundScore,
            newRoundsPlayed,
            operation: 'update-player-stats'
        });
    } catch (error) {
        logger.error('Error updating player stats', error, {
            playerId,
            roundScore,
            operation: 'update-player-stats'
        });
    }
}

/**
 * Get local players from localStorage (offline fallback)
 */
export function getLocalPlayers(): Player[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PLAYERS);
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
        localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    } catch (error) {
        logger.error('Error saving player locally', error, {
            playerId: player.id,
            playerName: player.name,
            operation: 'save-local-player'
        });
    }
}

/**
 * Get or create player by name (useful for quick player creation)
 */
export async function getOrCreatePlayerByName(name: string, userId?: string, email?: string): Promise<Player> {
    try {
        // Search for existing player
        const existing = await searchPlayers(name);
        const exactMatch = existing.find(p => p.name.toLowerCase() === name.toLowerCase());

        if (exactMatch) {
            // Update email if provided and missing? Or just return?
            // For now, let's just return. If we want to capture email for existing players, we might need a separate update flow.
            return exactMatch;
        }

        // Create new player
        const playerId = await createPlayer({
            name,
            userId,
            email, // Add email
            stats: {
                roundsPlayed: 0,
                averageScore: 0
            }
        });

        logger.info('Player created via getOrCreate', {
            playerId,
            playerName: name,
            operation: 'get-or-create-player'
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
        logger.error('Error getting or creating player', error, {
            playerName: name,
            operation: 'get-or-create-player'
        });
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

/**
 * Get frequently played players (friends) - players you've played with most
 */
export async function getFrequentlyPlayedPlayers(limitCount: number = QUERY_LIMITS.FREQUENTLY_PLAYED_PLAYERS): Promise<Player[]> {
    try {
        // For now, return all players sorted by name
        // In the future, this could be sorted by frequency of play
        const players = await getAllPlayers(limitCount);
        return players.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        logger.error('Error getting frequently played players', error, {
            limitCount,
            operation: 'get-frequently-played-players'
        });
        return [];
    }
}

/**
 * Link a player to a user account (for claiming stats)
 */
export async function linkPlayerToUser(playerId: string, userId: string): Promise<void> {
    try {
        const docRef = doc(db, PLAYERS_COLLECTION, playerId);
        await updateDoc(docRef, {
            userId,
            updatedAt: Timestamp.now()
        });

        logger.firebase('Player linked to user', {
            playerId,
            userId,
            operation: 'link-player-to-user'
        });
    } catch (error) {
        logger.error('Error linking player to user', error, {
            playerId,
            userId,
            operation: 'link-player-to-user'
        });
        throw error;
    }
}

/**
 * Merge multiple players into one target player
 * Used when a user claims multiple anonymous player accounts
 */
export async function mergePlayers(targetPlayerId: string, sourcePlayerIds: string[]): Promise<void> {
    try {
        const targetPlayer = await getPlayer(targetPlayerId);
        if (!targetPlayer) {
            throw new Error(`Target player ${targetPlayerId} not found`);
        }

        // Aggregate stats from all source players
        let totalRounds = targetPlayer.stats?.roundsPlayed || 0;
        let totalScore = (targetPlayer.stats?.averageScore || 0) * totalRounds;
        let bestRound = targetPlayer.stats?.bestRound;
        let bestCourse = targetPlayer.stats?.bestCourse;

        for (const sourceId of sourcePlayerIds) {
            const sourcePlayer = await getPlayer(sourceId);
            if (sourcePlayer && sourcePlayer.stats) {
                const sourceRounds = sourcePlayer.stats.roundsPlayed || 0;
                totalRounds += sourceRounds;
                totalScore += (sourcePlayer.stats.averageScore || 0) * sourceRounds;

                if (sourcePlayer.stats.bestRound !== undefined) {
                    if (bestRound === undefined || sourcePlayer.stats.bestRound < bestRound) {
                        bestRound = sourcePlayer.stats.bestRound;
                        bestCourse = sourcePlayer.stats.bestCourse;
                    }
                }
            }
        }

        const newAverageScore = totalRounds > 0 ? totalScore / totalRounds : 0;

        // Update target player with merged stats
        await updatePlayer(targetPlayerId, {
            stats: {
                roundsPlayed: totalRounds,
                averageScore: Math.round(newAverageScore * 100) / 100,
                bestRound,
                bestCourse
            }
        });

        // Delete source players (optional - might want to keep for history)
        // For now, just unlink them instead of deleting
        for (const sourceId of sourcePlayerIds) {
            await updatePlayer(sourceId, {
                userId: undefined // Unlink from user
            });
        }

        logger.firebase('Players merged successfully', {
            targetPlayerId,
            sourcePlayerIds,
            mergedRounds: totalRounds,
            operation: 'merge-players'
        });
    } catch (error) {
        logger.error('Error merging players', error, {
            targetPlayerId,
            sourcePlayerIds,
            operation: 'merge-players'
        });
        throw error;
    }
}

