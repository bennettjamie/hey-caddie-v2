
export interface PlayerScore {
    playerId: string;
    score: number; // Relative to par
}

export interface FundatoryBet {
    id: string;
    challengerId: string;
    targetId: string;
    amount: number; // Merits
    gapDescription: string; // e.g. "Tree gap", "Mando"
    status: 'pending' | 'success' | 'fail';
    holeNumber: number;
}

export interface SkinResult {
    holeNumber: number;
    winnerId: string | null; // null if tied/carry over
    value: number;
    isCarryOver: boolean;
}

export interface NassauPush {
    tiedPlayers: string[];
    value: number;
    divided: number;
}

export interface NassauResult {
    front9WinnerId: string | null;
    back9WinnerId: string | null;
    overallWinnerId: string | null;
    front9Score: { [playerId: string]: number };
    back9Score: { [playerId: string]: number };
    overallScore: { [playerId: string]: number };
    front9Push?: NassauPush;
    back9Push?: NassauPush;
    overallPush?: NassauPush;
}

export const calculateSkins = (
    scores: { [holeNumber: number]: { [playerId: string]: number } },
    holes: number[], // [1, 2, ... 18]
    skinValue: number = 0.25,
    participants?: string[] // Optional: filter to only these players
): SkinResult[] => {
    const results: SkinResult[] = [];
    let currentPot = skinValue;

    for (const hole of holes) {
        const holeScores = scores[hole];
        if (!holeScores || Object.keys(holeScores).length === 0) {
            // No scores for this hole yet - skip but don't reset pot
            continue;
        }

        // Filter scores by participants if provided
        const filteredScores = participants
            ? Object.fromEntries(Object.entries(holeScores).filter(([pid]) => participants.includes(pid)))
            : holeScores;

        if (Object.keys(filteredScores).length === 0) {
            // No participants have scores for this hole - skip
            continue;
        }

        // Find lowest score (relative to par - lower is better)
        let minScore = Infinity;
        let minPlayerIds: string[] = [];

        for (const [pid, score] of Object.entries(filteredScores)) {
            // Skip null/undefined scores
            if (score === null || score === undefined) {
                continue;
            }
            if (score < minScore) {
                minScore = score;
                minPlayerIds = [pid];
            } else if (score === minScore) {
                minPlayerIds.push(pid);
            }
        }

        // Only process if we have at least one valid score
        if (minPlayerIds.length === 0) {
            continue;
        }

        if (minPlayerIds.length === 1) {
            // Winner found - they get all accumulated skins
            results.push({
                holeNumber: hole,
                winnerId: minPlayerIds[0],
                value: currentPot, // Winner gets the accumulated pot
                isCarryOver: false
            });
            currentPot = skinValue; // Reset pot to base value for next hole
        } else {
            // Tie (push) - Carry over to next hole
            results.push({
                holeNumber: hole,
                winnerId: null,
                value: currentPot,
                isCarryOver: true
            });
            // Add another skin value to the pot for next hole
            currentPot += skinValue;
        }
    }

    return results;
};

export const calculateNassau = (
    scores: { [holeNumber: number]: { [playerId: string]: number } },
    players: string[],
    participants?: string[] // Optional: filter to only these players
): NassauResult => {
    // Use participants if provided, otherwise use all players
    const bettingPlayers = participants && participants.length > 0 ? participants : players;

    const front9Scores: { [key: string]: number } = {};
    const back9Scores: { [key: string]: number } = {};
    const overallScores: { [key: string]: number } = {};

    bettingPlayers.forEach(p => {
        front9Scores[p] = 0;
        back9Scores[p] = 0;
        overallScores[p] = 0;
    });

    for (let i = 1; i <= 18; i++) {
        const holeScores = scores[i];
        if (!holeScores) continue;

        for (const p of bettingPlayers) {
            const s = holeScores[p] || 0;
            overallScores[p] += s;
            if (i <= 9) front9Scores[p] += s;
            else back9Scores[p] += s;
        }
    }

    const getWinner = (s: { [key: string]: number }) => {
        let min = Infinity;
        let winner: string | null = null;
        let tie = false;
        for (const [p, val] of Object.entries(s)) {
            if (val < min) {
                min = val;
                winner = p;
                tie = false;
            } else if (val === min) {
                tie = true;
            }
        }
        return tie ? null : winner;
    };

    return {
        front9WinnerId: getWinner(front9Scores),
        back9WinnerId: getWinner(back9Scores),
        overallWinnerId: getWinner(overallScores),
        front9Score: front9Scores,
        back9Score: back9Scores,
        overallScore: overallScores
    };
};

export const calculateFundatory = (bets: FundatoryBet[]): { [playerId: string]: number } => {
    const winnings: { [key: string]: number } = {};

    bets.forEach(bet => {
        if (!winnings[bet.challengerId]) winnings[bet.challengerId] = 0;
        if (!winnings[bet.targetId]) winnings[bet.targetId] = 0;

        if (bet.status === 'success') {
            winnings[bet.targetId] += bet.amount;
            winnings[bet.challengerId] -= bet.amount;
        } else if (bet.status === 'fail') {
            winnings[bet.targetId] -= bet.amount;
            winnings[bet.challengerId] += bet.amount;
        }
    });

    return winnings;
};
