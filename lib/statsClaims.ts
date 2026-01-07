/**
 * Stats claim management for inviting unregistered players
 * Handles claim token generation, storage, and processing
 */

import { db } from './firebase';
import {
    collection,
    addDoc,
    getDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    Timestamp
} from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { StatsClaim } from '@/types/firestore';
import { logger } from './logger';
import { linkPlayerToUser, mergePlayers } from './players';
import { getRound } from './rounds';

const CLAIMS_COLLECTION = 'statsClaims';
const CLAIM_EXPIRY_DAYS = 30;

/**
 * Create a stats claim token for an unregistered player
 */
export async function createStatsClaim(
    roundId: string,
    playerId: string,
    playerName: string,
    createdBy: string,
    inviterName: string,
    deliveryMethod: 'email' | 'sms' | 'link' = 'link',
    recipient?: string
): Promise<{ claimId: string; claimUrl: string }> {
    try {
        // Get round details for summary
        const round = await getRound(roundId);
        if (!round) {
            throw new Error('Round not found');
        }

        // Calculate player's score
        const playerScores = Object.values(round.scores || {}).map(hole => hole[playerId] || 0);
        const totalScore = playerScores.reduce((sum, score) => sum + score, 0);

        // Get player names
        const playerNames = Object.keys(round.scores?.[1] || {}).map(pid => {
            return round.playerNames?.[pid] || 'Unknown';
        });

        // Generate unique claim token
        const claimId = nanoid(21); // URL-safe, 21 chars for collision resistance

        // Create expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + CLAIM_EXPIRY_DAYS);

        // Create claim record
        const claimData: Omit<StatsClaim, 'id'> = {
            roundId,
            playerId,
            playerName,
            playerEmail: recipient && deliveryMethod === 'email' ? recipient : undefined,
            deliveryMethod,
            recipient: recipient || '',
            createdBy,
            inviterName,
            expiresAt: Timestamp.fromDate(expiresAt),
            roundSummary: {
                courseName: round.courseName || 'Unknown Course',
                date: round.date,
                score: totalScore,
                players: playerNames
            },
            createdAt: Timestamp.now()
        };

        // Save to Firestore
        await addDoc(collection(db, CLAIMS_COLLECTION), {
            ...claimData,
            id: claimId
        });

        const claimUrl = generateClaimUrl(claimId);

        logger.firebase('Stats claim created', {
            claimId,
            playerId,
            playerName,
            roundId,
            operation: 'create-stats-claim'
        });

        return { claimId, claimUrl };
    } catch (error) {
        logger.error('Error creating stats claim', error, {
            roundId,
            playerId,
            playerName,
            operation: 'create-stats-claim'
        });
        throw error;
    }
}

/**
 * Generate claim URL for sharing
 */
export function generateClaimUrl(claimId: string): string {
    const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : 'https://heycaddie.app'; // Fallback for server-side

    return `${baseUrl}/claim?token=${claimId}`;
}

/**
 * Get a stats claim by token
 */
export async function getStatsClaim(token: string): Promise<StatsClaim | null> {
    try {
        // Query by token (we store it as id field)
        const q = query(
            collection(db, CLAIMS_COLLECTION),
            where('id', '==', token)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            logger.warn('Stats claim not found', { token, operation: 'get-stats-claim' });
            return null;
        }

        const claimDoc = snapshot.docs[0];
        const claim = {
            ...claimDoc.data(),
            id: claimDoc.id
        } as StatsClaim;

        // Check if expired
        const now = new Date();
        const expiryDate = claim.expiresAt instanceof Timestamp
            ? claim.expiresAt.toDate()
            : new Date(claim.expiresAt);

        if (now > expiryDate) {
            logger.warn('Stats claim expired', {
                token,
                expiryDate: expiryDate.toISOString(),
                operation: 'get-stats-claim'
            });
            return null;
        }

        // Check if already claimed
        if (claim.claimedBy) {
            logger.info('Stats claim already claimed', {
                token,
                claimedBy: claim.claimedBy,
                operation: 'get-stats-claim'
            });
        }

        return claim;
    } catch (error) {
        logger.error('Error getting stats claim', error, {
            token,
            operation: 'get-stats-claim'
        });
        return null;
    }
}

/**
 * Claim stats and link to user account
 * Supports merging multiple players if user has played under different names
 */
export async function claimStats(token: string, userId: string): Promise<void> {
    try {
        const claim = await getStatsClaim(token);

        if (!claim) {
            throw new Error('Invalid or expired claim token');
        }

        if (claim.claimedBy) {
            throw new Error('Stats already claimed');
        }

        // Get all players for this user (in case they have multiple)
        const { getPlayersByUserId, getPlayer } = await import('./players');
        const existingPlayers = await getPlayersByUserId(userId);
        const claimPlayer = await getPlayer(claim.playerId);

        if (!claimPlayer) {
            throw new Error('Player not found');
        }

        if (existingPlayers.length > 0) {
            // User already has players - merge this one into their account
            const primaryPlayer = existingPlayers[0]; // Use first player as primary

            // Merge the claim player into primary
            await mergePlayers(primaryPlayer.id, [claim.playerId]);

            logger.firebase('Stats claimed and merged', {
                token,
                userId,
                primaryPlayerId: primaryPlayer.id,
                mergedPlayerId: claim.playerId,
                operation: 'claim-stats'
            });
        } else {
            // First player for this user - just link it
            await linkPlayerToUser(claim.playerId, userId);

            logger.firebase('Stats claimed and linked', {
                token,
                userId,
                playerId: claim.playerId,
                operation: 'claim-stats'
            });
        }

        // Update claim record
        const q = query(
            collection(db, CLAIMS_COLLECTION),
            where('id', '==', token)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const claimDocRef = snapshot.docs[0].ref;
            await updateDoc(claimDocRef, {
                claimedBy: userId,
                claimedAt: Timestamp.now()
            });
        }

        logger.firebase('Stats claim processed successfully', {
            token,
            userId,
            playerId: claim.playerId,
            operation: 'claim-stats'
        });
    } catch (error) {
        logger.error('Error claiming stats', error, {
            token,
            userId,
            operation: 'claim-stats'
        });
        throw error;
    }
}

/**
 * Get all claims created by a user
 */
export async function getClaimsByUser(userId: string): Promise<StatsClaim[]> {
    try {
        const q = query(
            collection(db, CLAIMS_COLLECTION),
            where('createdBy', '==', userId)
        );

        const snapshot = await getDocs(q);
        const claims = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        })) as StatsClaim[];

        logger.firebase('User claims retrieved', {
            userId,
            claimCount: claims.length,
            operation: 'get-claims-by-user'
        });

        return claims;
    } catch (error) {
        logger.error('Error getting claims by user', error, {
            userId,
            operation: 'get-claims-by-user'
        });
        return [];
    }
}

/**
 * Get all claims for a specific player
 */
export async function getClaimsForPlayer(playerId: string): Promise<StatsClaim[]> {
    try {
        const q = query(
            collection(db, CLAIMS_COLLECTION),
            where('playerId', '==', playerId)
        );

        const snapshot = await getDocs(q);
        const claims = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        })) as StatsClaim[];

        return claims;
    } catch (error) {
        logger.error('Error getting claims for player', error, {
            playerId,
            operation: 'get-claims-for-player'
        });
        return [];
    }
}

/**
 * Check if a player has any pending claims
 */
export async function hasPendingClaims(playerId: string): Promise<boolean> {
    try {
        const claims = await getClaimsForPlayer(playerId);

        // Check for unclaimed, unexpired claims
        const now = new Date();
        const pendingClaims = claims.filter(claim => {
            if (claim.claimedBy) return false;

            const expiryDate = claim.expiresAt instanceof Timestamp
                ? claim.expiresAt.toDate()
                : new Date(claim.expiresAt);

            return now <= expiryDate;
        });

        return pendingClaims.length > 0;
    } catch (error) {
        logger.error('Error checking pending claims', error, {
            playerId,
            operation: 'has-pending-claims'
        });
        return false;
    }
}
