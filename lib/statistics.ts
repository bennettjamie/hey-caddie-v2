/**
 * Statistics calculation utilities
 */

import { Round } from '@/types/firestore';
import { getPlayer } from './players';

export interface PlayerStatistics {
    playerId: string;
    playerName: string;
    totalRounds: number;
    averageScore: number;
    bestRound: number;
    worstRound: number;
    bestCourse?: string;
    worstCourse?: string;
    roundsByCourse: { [courseId: string]: number };
    scoreDistribution: { [score: number]: number }; // Count of each score
    recentRounds: Round[];
    improvementTrend: number; // Positive = improving, negative = declining
}

export interface OverallStatistics {
    totalRounds: number;
    totalPlayers: number;
    averageScore: number;
    mostPlayedCourse: string;
    mostPlayedCourseCount: number;
    roundsThisMonth: number;
    roundsThisYear: number;
    bestRound: { playerName: string; score: number; course: string; date: string };
    recentActivity: Round[];
}

/**
 * Calculate statistics for a specific player
 */
export async function calculatePlayerStatistics(
    playerId: string,
    rounds: Round[]
): Promise<PlayerStatistics | null> {
    if (rounds.length === 0) return null;

    const playerRounds = rounds.filter(round => 
        round.players.includes(playerId)
    );

    if (playerRounds.length === 0) return null;

    const player = await getPlayer(playerId);
    const playerName = player?.name || playerId;

    // Calculate totals
    const scores: number[] = [];
    const roundsByCourse: { [courseId: string]: number } = {};
    const scoreDistribution: { [score: number]: number } = {};

    let bestRound = Infinity;
    let worstRound = -Infinity;
    let bestCourse: string | undefined;
    let worstCourse: string | undefined;

    playerRounds.forEach(round => {
        const totalScore = calculateRoundTotal(round, playerId);
        scores.push(totalScore);

        // Track by course
        const courseId = round.courseId;
        roundsByCourse[courseId] = (roundsByCourse[courseId] || 0) + 1;

        // Track score distribution
        scoreDistribution[totalScore] = (scoreDistribution[totalScore] || 0) + 1;

        // Track best/worst
        if (totalScore < bestRound) {
            bestRound = totalScore;
            bestCourse = round.courseName || courseId;
        }
        if (totalScore > worstRound) {
            worstRound = totalScore;
            worstCourse = round.courseName || courseId;
        }
    });

    // Calculate average
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Calculate improvement trend (compare first half vs second half)
    const sortedRounds = [...playerRounds].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const firstHalf = sortedRounds.slice(0, Math.floor(sortedRounds.length / 2));
    const secondHalf = sortedRounds.slice(Math.floor(sortedRounds.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, r) => sum + calculateRoundTotal(r, playerId), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, r) => sum + calculateRoundTotal(r, playerId), 0) / secondHalf.length;
    const improvementTrend = firstHalfAvg - secondHalfAvg; // Positive = improving

    // Get recent rounds (last 5)
    const recentRounds = sortedRounds.slice(-5).reverse();

    return {
        playerId,
        playerName,
        totalRounds: playerRounds.length,
        averageScore: Math.round(averageScore * 100) / 100,
        bestRound,
        worstRound,
        bestCourse,
        worstCourse,
        roundsByCourse,
        scoreDistribution,
        recentRounds,
        improvementTrend: Math.round(improvementTrend * 100) / 100
    };
}

/**
 * Calculate overall statistics
 */
export function calculateOverallStatistics(rounds: Round[]): OverallStatistics {
    if (rounds.length === 0) {
        return {
            totalRounds: 0,
            totalPlayers: 0,
            averageScore: 0,
            mostPlayedCourse: '',
            mostPlayedCourseCount: 0,
            roundsThisMonth: 0,
            roundsThisYear: 0,
            bestRound: { playerName: '', score: 0, course: '', date: '' },
            recentActivity: []
        };
    }

    // Get unique players
    const playerSet = new Set<string>();
    rounds.forEach(round => {
        round.players.forEach(playerId => playerSet.add(playerId));
    });

    // Calculate average score across all rounds
    let totalScoreSum = 0;
    let totalScoreCount = 0;
    const courseCounts: { [courseId: string]: number } = {};
    const allBestRounds: Array<{ playerName: string; score: number; course: string; date: string }> = [];

    rounds.forEach(round => {
        // Track course counts
        const courseId = round.courseId;
        courseCounts[courseId] = (courseCounts[courseId] || 0) + 1;

        // Calculate scores for each player
        round.players.forEach(playerId => {
            const totalScore = calculateRoundTotal(round, playerId);
            totalScoreSum += totalScore;
            totalScoreCount++;

            const playerName = round.playerNames?.[playerId] || playerId;
            allBestRounds.push({
                playerName,
                score: totalScore,
                course: round.courseName || courseId,
                date: round.date
            });
        });
    });

    const averageScore = totalScoreCount > 0 ? totalScoreSum / totalScoreCount : 0;

    // Find most played course
    let mostPlayedCourse = '';
    let mostPlayedCourseCount = 0;
    Object.entries(courseCounts).forEach(([courseId, count]) => {
        if (count > mostPlayedCourseCount) {
            mostPlayedCourseCount = count;
            mostPlayedCourse = courseId;
        }
    });

    // Get course name
    const mostPlayedRound = rounds.find(r => r.courseId === mostPlayedCourse);
    const mostPlayedCourseName = mostPlayedRound?.courseName || mostPlayedCourse;

    // Count rounds this month/year
    const now = new Date();
    const thisMonth = rounds.filter(r => {
        const roundDate = new Date(r.date);
        return roundDate.getMonth() === now.getMonth() && 
               roundDate.getFullYear() === now.getFullYear();
    }).length;

    const thisYear = rounds.filter(r => {
        const roundDate = new Date(r.date);
        return roundDate.getFullYear() === now.getFullYear();
    }).length;

    // Find best round (lowest score)
    const bestRound = allBestRounds.reduce((best, current) => 
        current.score < best.score ? current : best,
        allBestRounds[0] || { playerName: '', score: 0, course: '', date: '' }
    );

    // Get recent activity (last 10 rounds)
    const recentActivity = [...rounds]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

    return {
        totalRounds: rounds.length,
        totalPlayers: playerSet.size,
        averageScore: Math.round(averageScore * 100) / 100,
        mostPlayedCourse: mostPlayedCourseName,
        mostPlayedCourseCount,
        roundsThisMonth: thisMonth,
        roundsThisYear: thisYear,
        bestRound,
        recentActivity
    };
}

/**
 * Calculate total score for a player in a round
 */
export function calculateRoundTotal(round: Round, playerId: string): number {
    let total = 0;
    Object.keys(round.scores || {}).forEach((holeNum) => {
        const holeScores = round.scores[parseInt(holeNum)];
        if (holeScores && holeScores[playerId] !== undefined) {
            total += holeScores[playerId];
        }
    });
    return total;
}

/**
 * Get score display string
 */
export function getScoreDisplay(score: number): string {
    if (score === 0) return 'E';
    if (score < 0) return `${Math.abs(score)}`;
    return `+${score}`;
}

/**
 * Get score color for display
 */
export function getScoreColor(score: number): string {
    if (score < 0) return 'var(--success)';
    if (score === 0) return 'var(--info)';
    return 'var(--danger)';
}






