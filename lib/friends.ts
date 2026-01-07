/**
 * Friend management functions for Firestore
 * Handles friend relationships and social features
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
import { Friend, User } from '@/types/firestore';
import { logger } from './logger';
import { getUser, updateUser } from './users';

const FRIENDS_SUBCOLLECTION = 'friends';

/**
 * Add a friend (auto-accept, bidirectional)
 * Creates Friend entries for both users
 */
export async function addFriend(userId: string, friendId: string): Promise<void> {
    try {
        // Don't allow friending yourself
        if (userId === friendId) {
            throw new Error('Cannot add yourself as a friend');
        }

        // Check if already friends
        const alreadyFriends = await areFriends(userId, friendId);
        if (alreadyFriends) {
            logger.info('Users are already friends', {
                userId,
                friendId,
                operation: 'add-friend'
            });
            return;
        }

        // Get friend's user data
        const friendUser = await getUser(friendId);
        if (!friendUser) {
            throw new Error('Friend user not found');
        }

        const currentUser = await getUser(userId);
        if (!currentUser) {
            throw new Error('Current user not found');
        }

        const now = Timestamp.now();

        // Create friend entry for current user
        await setDoc(doc(db, 'users', userId, FRIENDS_SUBCOLLECTION, friendId), {
            id: friendId,
            userId,
            displayName: friendUser.displayName,
            photoURL: friendUser.photoURL,
            email: friendUser.email,
            playerId: undefined, // Will be linked if they play together
            status: 'active',
            addedAt: now,
            addedBy: userId,
            lastPlayedTogether: undefined,
            roundsPlayedTogether: 0,
            stats: friendUser.stats
        } as Friend);

        // Create friend entry for friend (bidirectional)
        await setDoc(doc(db, 'users', friendId, FRIENDS_SUBCOLLECTION, userId), {
            id: userId,
            userId: friendId,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            email: currentUser.email,
            playerId: undefined,
            status: 'active',
            addedAt: now,
            addedBy: userId,
            lastPlayedTogether: undefined,
            roundsPlayedTogether: 0,
            stats: currentUser.stats
        } as Friend);

        // Update friend cache arrays
        await syncFriendCache(userId);
        await syncFriendCache(friendId);

        logger.firebase('Friend added successfully', {
            userId,
            friendId,
            friendName: friendUser.displayName,
            operation: 'add-friend'
        });
    } catch (error) {
        logger.error('Error adding friend', error, {
            userId,
            friendId,
            operation: 'add-friend'
        });
        throw error;
    }
}

/**
 * Remove a friend (bidirectional)
 * Deletes Friend entries for both users
 */
export async function removeFriend(userId: string, friendId: string): Promise<void> {
    try {
        // Delete friend entry for current user
        await deleteDoc(doc(db, 'users', userId, FRIENDS_SUBCOLLECTION, friendId));

        // Delete friend entry for friend (bidirectional)
        await deleteDoc(doc(db, 'users', friendId, FRIENDS_SUBCOLLECTION, userId));

        // Update friend cache arrays
        await syncFriendCache(userId);
        await syncFriendCache(friendId);

        logger.firebase('Friend removed successfully', {
            userId,
            friendId,
            operation: 'remove-friend'
        });
    } catch (error) {
        logger.error('Error removing friend', error, {
            userId,
            friendId,
            operation: 'remove-friend'
        });
        throw error;
    }
}

/**
 * Get all friends for a user
 */
export async function getFriends(userId: string): Promise<Friend[]> {
    try {
        const q = query(
            collection(db, 'users', userId, FRIENDS_SUBCOLLECTION),
            where('status', '==', 'active'),
            orderBy('addedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const friends = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        })) as Friend[];

        logger.firebase('Friends retrieved', {
            userId,
            friendCount: friends.length,
            operation: 'get-friends'
        });

        return friends;
    } catch (error) {
        logger.error('Error getting friends', error, {
            userId,
            operation: 'get-friends'
        });
        return [];
    }
}

/**
 * Get a specific friend
 */
export async function getFriend(userId: string, friendId: string): Promise<Friend | null> {
    try {
        const docRef = doc(db, 'users', userId, FRIENDS_SUBCOLLECTION, friendId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                ...docSnap.data(),
                id: docSnap.id
            } as Friend;
        }

        return null;
    } catch (error) {
        logger.error('Error getting friend', error, {
            userId,
            friendId,
            operation: 'get-friend'
        });
        return null;
    }
}

/**
 * Check if two users are friends
 */
export async function areFriends(userId: string, friendId: string): Promise<boolean> {
    try {
        const friend = await getFriend(userId, friendId);
        return friend !== null && friend.status === 'active';
    } catch (error) {
        logger.error('Error checking friendship', error, {
            userId,
            friendId,
            operation: 'are-friends'
        });
        return false;
    }
}

/**
 * Search friends by name or email
 */
export async function searchFriends(userId: string, searchTerm: string): Promise<Friend[]> {
    try {
        const friends = await getFriends(userId);
        const searchLower = searchTerm.toLowerCase();

        const filtered = friends.filter(friend =>
            friend.displayName?.toLowerCase().includes(searchLower) ||
            friend.email?.toLowerCase().includes(searchLower)
        );

        logger.firebase('Friends search completed', {
            userId,
            searchTerm,
            resultsCount: filtered.length,
            operation: 'search-friends'
        });

        return filtered;
    } catch (error) {
        logger.error('Error searching friends', error, {
            userId,
            searchTerm,
            operation: 'search-friends'
        });
        return [];
    }
}

/**
 * Update friend activity after playing together
 */
export async function updateFriendActivity(
    userId: string,
    friendId: string,
    roundId: string
): Promise<void> {
    try {
        const friend = await getFriend(userId, friendId);
        if (!friend) {
            logger.warn('Friend not found when updating activity', {
                userId,
                friendId,
                operation: 'update-friend-activity'
            });
            return;
        }

        const now = new Date().toISOString();
        const roundsPlayedTogether = (friend.roundsPlayedTogether || 0) + 1;

        // Update current user's friend entry
        await updateDoc(doc(db, 'users', userId, FRIENDS_SUBCOLLECTION, friendId), {
            lastPlayedTogether: now,
            roundsPlayedTogether
        });

        // Update friend's entry for current user
        await updateDoc(doc(db, 'users', friendId, FRIENDS_SUBCOLLECTION, userId), {
            lastPlayedTogether: now,
            roundsPlayedTogether
        });

        logger.firebase('Friend activity updated', {
            userId,
            friendId,
            roundId,
            roundsPlayedTogether,
            operation: 'update-friend-activity'
        });
    } catch (error) {
        logger.error('Error updating friend activity', error, {
            userId,
            friendId,
            roundId,
            operation: 'update-friend-activity'
        });
        // Don't throw - this is not critical
    }
}

/**
 * Get friends sorted by recent play activity
 */
export async function getRecentlyPlayedWith(userId: string, limit: number = 20): Promise<Friend[]> {
    try {
        const friends = await getFriends(userId);

        // Sort by last played together, then by rounds played together
        const sorted = friends
            .filter(f => f.lastPlayedTogether || f.roundsPlayedTogether > 0)
            .sort((a, b) => {
                // Primary sort: most recent play date
                if (a.lastPlayedTogether && b.lastPlayedTogether) {
                    return b.lastPlayedTogether.localeCompare(a.lastPlayedTogether);
                }
                if (a.lastPlayedTogether) return -1;
                if (b.lastPlayedTogether) return 1;

                // Secondary sort: most rounds together
                return (b.roundsPlayedTogether || 0) - (a.roundsPlayedTogether || 0);
            })
            .slice(0, limit);

        logger.firebase('Recently played friends retrieved', {
            userId,
            friendCount: sorted.length,
            operation: 'get-recently-played-with'
        });

        return sorted;
    } catch (error) {
        logger.error('Error getting recently played friends', error, {
            userId,
            operation: 'get-recently-played-with'
        });
        return [];
    }
}

/**
 * Sync friend cache (update friendIds array in User document)
 * This enables offline-first queries
 */
export async function syncFriendCache(userId: string): Promise<void> {
    try {
        const friends = await getFriends(userId);
        const friendIds = friends.map(f => f.id);
        const friendCount = friendIds.length;

        await updateUser(userId, {
            friendIds,
            friendCount
        });

        logger.firebase('Friend cache synced', {
            userId,
            friendCount,
            operation: 'sync-friend-cache'
        });
    } catch (error) {
        logger.error('Error syncing friend cache', error, {
            userId,
            operation: 'sync-friend-cache'
        });
        // Don't throw - cache sync is not critical
    }
}

/**
 * Get suggested friends based on play history
 * Suggests users you've played with but aren't friends with yet
 */
export async function getSuggestedFriends(userId: string): Promise<User[]> {
    try {
        // Get current user
        const currentUser = await getUser(userId);
        if (!currentUser) {
            return [];
        }

        // Get current friend IDs
        const friendIds = currentUser.friendIds || [];

        // Get players this user has played with
        const recentPlayerIds = currentUser.recentPlayers || [];

        const suggestions: User[] = [];

        // This is simplified - in production you'd want a more efficient query
        for (const playerId of recentPlayerIds.slice(0, 20)) {
            try {
                const { getPlayer } = await import('./players');
                const player = await getPlayer(playerId);

                if (player?.userId && player.userId !== userId && !friendIds.includes(player.userId)) {
                    const suggestedUser = await getUser(player.userId);
                    if (suggestedUser && !suggestions.find(u => u.uid === suggestedUser.uid)) {
                        suggestions.push(suggestedUser);
                    }
                }
            } catch (err) {
                // Skip this player if there's an error
                continue;
            }
        }

        logger.firebase('Friend suggestions retrieved', {
            userId,
            suggestionCount: suggestions.length,
            operation: 'get-suggested-friends'
        });

        return suggestions.slice(0, 10); // Limit to 10 suggestions
    } catch (error) {
        logger.error('Error getting suggested friends', error, {
            userId,
            operation: 'get-suggested-friends'
        });
        return [];
    }
}

/**
 * Get mutual friends between two users
 */
export async function getMutualFriends(userId: string, otherUserId: string): Promise<User[]> {
    try {
        const userFriends = await getFriends(userId);
        const otherUserFriends = await getFriends(otherUserId);

        const userFriendIds = userFriends.map(f => f.id);
        const mutualFriendIds = otherUserFriends
            .filter(f => userFriendIds.includes(f.id))
            .map(f => f.id);

        const { getUsersByIds } = await import('./users');
        const mutualFriends = await getUsersByIds(mutualFriendIds);

        logger.firebase('Mutual friends retrieved', {
            userId,
            otherUserId,
            mutualCount: mutualFriends.length,
            operation: 'get-mutual-friends'
        });

        return mutualFriends;
    } catch (error) {
        logger.error('Error getting mutual friends', error, {
            userId,
            otherUserId,
            operation: 'get-mutual-friends'
        });
        return [];
    }
}
