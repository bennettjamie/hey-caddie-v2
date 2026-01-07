import { db } from './firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Round } from '@/types/firestore';

export type AchievementType = 'PERSONAL_BEST' | 'COMEBACK' | 'NONE';

interface AchievementResult {
    type: AchievementType;
    details?: string;
    previousBest?: number;
    worseRoundsCount?: number;
}

/**
 * Get history of scores for a specific hole for a player
 */
export async function getHoleHistory(
    playerId: string,
    courseId: string,
    layoutId: string,
    holeNumber: number,
    limitCount: number = 10
): Promise<number[]> {
    try {
        // Query completed rounds for this course/layout containing this player
        // Note: This query might require a composite index if the dataset grows large.
        // For now, we filter locally if needed or trust Firestore's merging.
        // We really need to filter by 'courseId', 'players' array-contains, and order by date.

        const roundsRef = collection(db, 'rounds');
        const q = query(
            roundsRef,
            where('courseId', '==', courseId),
            where('players', 'array-contains', playerId),
            where('status', '==', 'completed'),
            // orderBy('date', 'desc'), // Requires index with array-contains
            limit(50) // Fetch strict limit then filter/sort locally to avoid complex index creation right now
        );

        const snapshot = await getDocs(q);
        const scores: number[] = [];

        const rounds = snapshot.docs.map(doc => doc.data() as Round);

        // Sort by date descending (newest first)
        rounds.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        for (const round of rounds) {
            // Check layout match (optional, but good for consistent stats)
            if (layoutId && round.layoutId !== layoutId) continue;

            // Extract score for this hole
            // Structure: scores: { [hole]: { [player]: score } }
            const holeScores = round.scores[holeNumber];
            if (holeScores && typeof holeScores[playerId] === 'number') {
                scores.push(holeScores[playerId]);
            }

            if (scores.length >= limitCount) break;
        }

        return scores;

    } catch (error) {
        console.error('Error fetching hole history:', error);
        return [];
    }
}

/**
 * Check for achievements on a specific hole
 */
export async function checkHoleAchievements(
    playerId: string,
    courseId: string,
    layoutId: string,
    holeNumber: number,
    currentScore: number,
    par: number
): Promise<AchievementResult> {

    // 1. Get History (fetch last 20 to be safe)
    const history = await getHoleHistory(playerId, courseId, layoutId, holeNumber, 20);

    // If no history, it's technically a personal best, but usually we want to beat *something*.
    // Let's say first time playing isn't an "Achievement" in this context unless it's a HIO.
    if (history.length === 0) {
        if (currentScore === 1) {
            return { type: 'PERSONAL_BEST', details: 'Hole-in-One on your first try!' };
        }
        return { type: 'NONE' };
    }

    // 2. Check Personal Best
    const previousBest = Math.min(...history);
    if (currentScore < previousBest) {
        return {
            type: 'PERSONAL_BEST',
            details: `New Personal Best! (Previous: ${previousBest})`,
            previousBest
        };
    }

    // 3. Check Comeback
    // Logic: Current <= Par AND Last 3 rounds were WORSE than current
    if (currentScore <= par && history.length >= 3) {
        const last3 = history.slice(0, 3);
        const isComeback = last3.every(score => score > currentScore);

        if (isComeback) {
            const avg = last3.reduce((a, b) => a + b, 0) / 3;
            return {
                type: 'COMEBACK',
                details: `Comeback! Beat your last 3 rounds (Avg: ${avg.toFixed(1)})`,
                worseRoundsCount: 3
            };
        }
    }

    return { type: 'NONE' };
}
