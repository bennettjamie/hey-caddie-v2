
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

export interface NassauResult {
    front9WinnerId: string | null;
    back9WinnerId: string | null;
    overallWinnerId: string | null;
    front9Score: { [playerId: string]: number };
    back9Score: { [playerId: string]: number };
    overallScore: { [playerId: string]: number };
}

export const calculateSkins = (
    scores: { [holeNumber: number]: { [playerId: string]: number } },
    holes: number[], // [1, 2, ... 18]
    skinValue: number = 0.25
): SkinResult[] => {
    const results: SkinResult[] = [];
    let currentPot = skinValue;

    for (const hole of holes) {
        const holeScores = scores[hole];
        if (!holeScores) {
            // No scores for this hole yet
            continue;
        }

        // Find lowest score
        let minScore = Infinity;
        let minPlayerIds: string[] = [];

        for (const [pid, score] of Object.entries(holeScores)) {
            if (score < minScore) {
                minScore = score;
                minPlayerIds = [pid];
            } else if (score === minScore) {
                minPlayerIds.push(pid);
            }
        }

        if (minPlayerIds.length === 1) {
            // Winner found
            results.push({
                holeNumber: hole,
                winnerId: minPlayerIds[0],
                value: currentPot,
                isCarryOver: false
            });
            currentPot = skinValue; // Reset pot
        } else {
            // Tie - Carry over
            results.push({
                holeNumber: hole,
                winnerId: null,
                value: currentPot,
                isCarryOver: true
            });
            currentPot += skinValue;
        }
    }

    return results;
};

export const calculateNassau = (
    scores: { [holeNumber: number]: { [playerId: string]: number } },
    players: string[]
): NassauResult => {
    const front9Scores: { [key: string]: number } = {};
    const back9Scores: { [key: string]: number } = {};
    const overallScores: { [key: string]: number } = {};

    players.forEach(p => {
        front9Scores[p] = 0;
        back9Scores[p] = 0;
        overallScores[p] = 0;
    });

    for (let i = 1; i <= 18; i++) {
        const holeScores = scores[i];
        if (!holeScores) continue;

        for (const p of players) {
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
