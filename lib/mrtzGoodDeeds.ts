/**
 * MRTZ Good Deeds Management
 * Handles good deeds submission and validation
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
import { MRTZGoodDeed, GoodDeedType, ValidationStatus } from '@/types/mrtz';
import { createLedgerEntry } from './mrtzLedger';

const GOOD_DEEDS_COLLECTION = 'mrtz_good_deeds';

/**
 * Submit a good deed
 */
export async function submitGoodDeed(
    playerId: string,
    deedType: GoodDeedType,
    description: string,
    mrtzValue: number,
    validators: string[], // Player IDs who can validate
    createdBy: string,
    photos?: string[],
    location?: {
        courseId?: string;
        courseName?: string;
        coordinates?: { lat: number; lng: number };
    }
): Promise<string> {
    try {
        const now = Timestamp.now();

        const goodDeed: Omit<MRTZGoodDeed, 'id'> = {
            playerId,
            deedType,
            description,
            mrtzValue,
            validators: validators.map(v => ({
                playerId: v,
                status: 'pending' as ValidationStatus
            })),
            photos,
            location,
            status: 'pending',
            mrtzAwarded: false,
            createdAt: now,
            createdBy,
            updatedAt: now
        };

        const docRef = await addDoc(collection(db, GOOD_DEEDS_COLLECTION), goodDeed);
        return docRef.id;
    } catch (error) {
        console.error('Error submitting good deed:', error);
        throw error;
    }
}

/**
 * Validate a good deed (approve or reject)
 */
export async function validateGoodDeed(
    goodDeedId: string,
    validatorPlayerId: string,
    status: 'approved' | 'rejected',
    comment?: string
): Promise<boolean> {
    try {
        const deedDoc = doc(db, GOOD_DEEDS_COLLECTION, goodDeedId);
        const deedSnap = await getDoc(deedDoc);

        if (!deedSnap.exists()) {
            throw new Error('Good deed not found');
        }

        const goodDeed = deedSnap.data() as MRTZGoodDeed;

        // Find validator
        const validatorIndex = goodDeed.validators.findIndex(v => v.playerId === validatorPlayerId);
        if (validatorIndex === -1) {
            throw new Error('You are not a validator for this good deed');
        }

        // Update validator status
        const updatedValidators = [...goodDeed.validators];
        updatedValidators[validatorIndex] = {
            ...updatedValidators[validatorIndex],
            status: status === 'approved' ? 'approved' : 'rejected',
            validatedAt: Timestamp.now(),
            comment
        };

        // Check if all validators have approved
        const allApproved = updatedValidators.every(v => v.status === 'approved');
        const anyRejected = updatedValidators.some(v => v.status === 'rejected');

        let newStatus: 'pending' | 'validated' | 'rejected' = 'pending';
        if (allApproved) {
            newStatus = 'validated';
        } else if (anyRejected) {
            newStatus = 'rejected';
        }

        await updateDoc(deedDoc, {
            validators: updatedValidators,
            status: newStatus,
            validatedAt: newStatus === 'validated' ? Timestamp.now() : goodDeed.validatedAt,
            updatedAt: Timestamp.now()
        });

        // If validated, award MRTZ
        if (newStatus === 'validated' && !goodDeed.mrtzAwarded) {
            await awardMRTZForDeed(goodDeedId);
        }

        return newStatus === 'validated';
    } catch (error) {
        console.error('Error validating good deed:', error);
        throw error;
    }
}

/**
 * Award MRTZ for a validated good deed
 */
async function awardMRTZForDeed(goodDeedId: string): Promise<void> {
    try {
        const deedDoc = doc(db, GOOD_DEEDS_COLLECTION, goodDeedId);
        const deedSnap = await getDoc(deedDoc);

        if (!deedSnap.exists()) {
            throw new Error('Good deed not found');
        }

        const goodDeed = deedSnap.data() as MRTZGoodDeed;

        if (goodDeed.mrtzAwarded) {
            return; // Already awarded
        }

        // Create ledger entry
        const transactionId = await createLedgerEntry({
            type: 'good_deed',
            date: Timestamp.now(),
            toPlayerId: goodDeed.playerId,
            participants: [goodDeed.playerId, ...goodDeed.validators.map(v => v.playerId)],
            amount: goodDeed.mrtzValue,
            description: `Good deed: ${goodDeed.description}`,
            settlementDetails: {
                goodDeedId,
                validators: goodDeed.validators.map(v => v.playerId),
                validationStatus: 'approved',
                photos: goodDeed.photos
            },
            status: 'confirmed',
            createdBy: goodDeed.playerId
        });

        // Mark as awarded
        await updateDoc(deedDoc, {
            mrtzAwarded: true,
            transactionId,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error awarding MRTZ for good deed:', error);
        throw error;
    }
}

/**
 * Get pending validations for a player
 */
export async function getPendingValidations(playerId: string): Promise<MRTZGoodDeed[]> {
    try {
        const allDeeds = await getDocs(collection(db, GOOD_DEEDS_COLLECTION));

        return allDeeds.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as MRTZGoodDeed))
            .filter(deed =>
                deed.status === 'pending' &&
                deed.validators.some(v => v.playerId === playerId && v.status === 'pending')
            )
            .sort((a, b) => {
                const aDate = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
                const bDate = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
                return bDate.getTime() - aDate.getTime();
            });
    } catch (error) {
        console.error('Error getting pending validations:', error);
        return [];
    }
}

/**
 * Get player's good deeds
 */
export async function getPlayerGoodDeeds(
    playerId: string,
    status?: 'pending' | 'validated' | 'rejected'
): Promise<MRTZGoodDeed[]> {
    try {
        let q = query(
            collection(db, GOOD_DEEDS_COLLECTION),
            where('playerId', '==', playerId),
            orderBy('createdAt', 'desc')
        );

        if (status) {
            q = query(q, where('status', '==', status));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as MRTZGoodDeed));
    } catch (error) {
        console.error('Error getting player good deeds:', error);
        return [];
    }
}

/**
 * Get good deed by ID
 */
export async function getGoodDeed(goodDeedId: string): Promise<MRTZGoodDeed | null> {
    try {
        const deedDoc = doc(db, GOOD_DEEDS_COLLECTION, goodDeedId);
        const deedSnap = await getDoc(deedDoc);

        if (!deedSnap.exists()) {
            return null;
        }

        return {
            id: deedSnap.id,
            ...deedSnap.data()
        } as MRTZGoodDeed;
    } catch (error) {
        console.error('Error getting good deed:', error);
        return null;
    }
}

/**
 * Link good deed to settlement
 */
export async function linkGoodDeedToSettlement(
    goodDeedId: string,
    settlementId: string
): Promise<void> {
    try {
        const deedDoc = doc(db, GOOD_DEEDS_COLLECTION, goodDeedId);
        await updateDoc(deedDoc, {
            settlementId,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error linking good deed to settlement:', error);
        throw error;
    }
}


