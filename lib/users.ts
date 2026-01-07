/**
 * User management functions for Firestore
 * Handles user profiles and authentication-linked accounts
 */

import { db } from './firebase';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    Timestamp
} from 'firebase/firestore';
import { User } from '@/types/firestore';
import { Player } from './players';
import { logger } from './logger';
import { QUERY_LIMITS } from './constants';

const USERS_COLLECTION = 'users';

/**
 * Create a new user profile
 */
export async function createUser(userData: Omit<User, 'uid'>): Promise<string> {
    try {
        const userId = userData.email; // Temporary - should be Firebase UID
        await setDoc(doc(db, USERS_COLLECTION, userId), {
            ...userData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        logger.firebase('User created successfully', {
            userId,
            displayName: userData.displayName,
            operation: 'create-user'
        });

        return userId;
    } catch (error) {
        logger.error('Error creating user', error, {
            displayName: userData.displayName,
            operation: 'create-user'
        });
        throw error;
    }
}

/**
 * Create user with specific UID (for Firebase Auth integration)
 */
export async function createUserWithUID(uid: string, userData: Omit<User, 'uid'>): Promise<void> {
    try {
        await setDoc(doc(db, USERS_COLLECTION, uid), {
            ...userData,
            uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        logger.firebase('User created with UID', {
            userId: uid,
            displayName: userData.displayName,
            operation: 'create-user-with-uid'
        });
    } catch (error) {
        logger.error('Error creating user with UID', error, {
            userId: uid,
            operation: 'create-user-with-uid'
        });
        throw error;
    }
}

/**
 * Get a user by ID
 */
export async function getUser(userId: string): Promise<User | null> {
    try {
        const docRef = doc(db, USERS_COLLECTION, userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as User;
            logger.firebase('User retrieved', {
                userId,
                operation: 'get-user'
            });
            return {
                ...data,
                uid: userId
            };
        }

        return null;
    } catch (error) {
        logger.error('Error getting user', error, {
            userId,
            operation: 'get-user'
        });
        throw error;
    }
}

/**
 * Update user data
 */
export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
        const docRef = doc(db, USERS_COLLECTION, userId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });

        logger.firebase('User updated', {
            userId,
            updatedFields: Object.keys(updates),
            operation: 'update-user'
        });
    } catch (error) {
        logger.error('Error updating user', error, {
            userId,
            operation: 'update-user'
        });
        throw error;
    }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
    try {
        const q = query(
            collection(db, USERS_COLLECTION),
            where('email', '==', email),
            firestoreLimit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        const data = doc.data() as User;

        logger.firebase('User found by email', {
            userId: doc.id,
            operation: 'get-user-by-email'
        });

        return {
            ...data,
            uid: doc.id
        };
    } catch (error) {
        logger.error('Error getting user by email', error, {
            email,
            operation: 'get-user-by-email'
        });
        throw error;
    }
}

/**
 * Search users by display name or email
 */
export async function searchUsers(searchTerm: string): Promise<User[]> {
    try {
        // Firebase doesn't support case-insensitive searches or partial matches natively
        // We'll fetch all users and filter client-side (not ideal for large datasets)
        const q = query(
            collection(db, USERS_COLLECTION),
            firestoreLimit(QUERY_LIMITS.ALL_PLAYERS_DEFAULT)
        );

        const snapshot = await getDocs(q);
        const searchLower = searchTerm.toLowerCase();

        const users = snapshot.docs
            .map(doc => ({
                ...doc.data(),
                uid: doc.id
            } as User))
            .filter(user =>
                user.displayName?.toLowerCase().includes(searchLower) ||
                user.email?.toLowerCase().includes(searchLower)
            );

        logger.firebase('Users search completed', {
            searchTerm,
            resultsCount: users.length,
            operation: 'search-users'
        });

        return users;
    } catch (error) {
        logger.error('Error searching users', error, {
            searchTerm,
            operation: 'search-users'
        });
        throw error;
    }
}

/**
 * Get multiple users by IDs
 */
export async function getUsersByIds(userIds: string[]): Promise<User[]> {
    try {
        const users: User[] = [];

        // Fetch in batches to avoid Firestore limitations
        for (const userId of userIds) {
            const user = await getUser(userId);
            if (user) {
                users.push(user);
            }
        }

        logger.firebase('Users fetched by IDs', {
            requestedCount: userIds.length,
            fetchedCount: users.length,
            operation: 'get-users-by-ids'
        });

        return users;
    } catch (error) {
        logger.error('Error getting users by IDs', error, {
            operation: 'get-users-by-ids'
        });
        throw error;
    }
}

/**
 * Sync user stats from their linked Player records
 */
export async function syncUserStatsFromPlayers(userId: string): Promise<void> {
    try {
        // Get all players linked to this user
        const playersQuery = query(
            collection(db, 'players'),
            where('userId', '==', userId)
        );

        const playersSnapshot = await getDocs(playersQuery);

        if (playersSnapshot.empty) {
            logger.info('No players found for user', { userId, operation: 'sync-user-stats' });
            return;
        }

        // Aggregate stats from all linked players
        let totalRounds = 0;
        let totalScore = 0;
        let bestRound: number | undefined;
        let bestCourse: string | undefined;

        playersSnapshot.docs.forEach(doc => {
            const player = doc.data() as Player;
            if (player.stats) {
                totalRounds += player.stats.roundsPlayed || 0;
                totalScore += (player.stats.averageScore || 0) * (player.stats.roundsPlayed || 0);

                if (player.stats.bestRound !== undefined) {
                    if (bestRound === undefined || player.stats.bestRound < bestRound) {
                        bestRound = player.stats.bestRound;
                        bestCourse = player.stats.bestCourse;
                    }
                }
            }
        });

        const averageScore = totalRounds > 0 ? totalScore / totalRounds : 0;

        // Update user stats
        await updateUser(userId, {
            stats: {
                roundsPlayed: totalRounds,
                averageScore,
                bestRound,
                bestCourse
            }
        });

        logger.firebase('User stats synced from players', {
            userId,
            roundsPlayed: totalRounds,
            averageScore,
            operation: 'sync-user-stats'
        });
    } catch (error) {
        logger.error('Error syncing user stats', error, {
            userId,
            operation: 'sync-user-stats'
        });
        throw error;
    }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, USERS_COLLECTION, userId));

        logger.firebase('User deleted', {
            userId,
            operation: 'delete-user'
        });
    } catch (error) {
        logger.error('Error deleting user', error, {
            userId,
            operation: 'delete-user'
        });
        throw error;
    }
}
