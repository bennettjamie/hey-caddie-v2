/**
 * Voice Query Processing and Response Generation
 */

export interface QueryResponse {
    text: string;
    type: 'leaderboard' | 'scores' | 'betting' | 'course' | 'general';
}

const SCORE_TERM_MAP: { [key: number]: string } = {
    '-3': 'double eagle',
    '-2': 'eagle',
    '-1': 'birdie',
    '0': 'par',
    '1': 'bogey',
    '2': 'double bogey',
    '3': 'triple bogey',
    '4': 'quadruple bogey'
};

function getScoreTerm(score: number): string {
    return SCORE_TERM_MAP[score.toString()] || `${score > 0 ? '+' : ''}${score}`;
}

export function processQuery(
    queryText: string,
    gameState: {
        currentRound: any;
        activeHole: number;
        fundatoryBets: any[];
    }
): QueryResponse | null {
    const lowerText = queryText.toLowerCase().trim();

    // Leaderboard queries
    if (
        lowerText.includes("who's winning") ||
        lowerText.includes("who is winning") ||
        lowerText.includes("who's in the lead") ||
        lowerText.includes("who is in the lead") ||
        lowerText.includes("show me the leaderboard") ||
        lowerText.includes("leaderboard")
    ) {
        return generateLeaderboardResponse(gameState);
    }

    // Score history queries
    if (
        lowerText.includes("read back scores") ||
        lowerText.includes("what were the scores") ||
        lowerText.includes("scores for the past") ||
        lowerText.includes("scores on holes") ||
        lowerText.includes("read scores")
    ) {
        const holeCount = extractNumber(lowerText, /past (\d+)/);
        const holeRange = extractHoleRange(lowerText);
        return generateScoreHistoryResponse(gameState, holeCount, holeRange);
    }

    // Personal score queries
    if (
        lowerText.includes("what's my score") ||
        lowerText.includes("what is my score") ||
        lowerText.includes("how am i doing") ||
        lowerText.includes("my score")
    ) {
        return generatePersonalScoreResponse(gameState);
    }

    // Par queries
    if (
        lowerText.includes("what's the par") ||
        lowerText.includes("what is the par") ||
        lowerText.includes("par for this hole") ||
        lowerText.includes("hole") && lowerText.includes("par")
    ) {
        const holeNum = extractNumber(lowerText, /hole (\d+)/) || gameState.activeHole;
        return generateParResponse(gameState, holeNum);
    }

    // Betting queries
    if (
        lowerText.includes("betting totals") ||
        lowerText.includes("show me the bets") ||
        lowerText.includes("what are the bets") ||
        lowerText.includes("betting")
    ) {
        return generateBettingResponse(gameState);
    }

    // Course queries
    if (
        lowerText.includes("what's the course") ||
        lowerText.includes("what is the course") ||
        lowerText.includes("course name") ||
        lowerText.includes("where are we playing")
    ) {
        return generateCourseResponse(gameState);
    }

    return null;
}

function generateLeaderboardResponse(gameState: any): QueryResponse {
    if (!gameState.currentRound || !gameState.currentRound.players) {
        return {
            text: "No active round found.",
            type: 'leaderboard'
        };
    }

    const players = gameState.currentRound.players;
    const scores = gameState.currentRound.scores || {};
    
    // Calculate total scores for each player
    const playerTotals: { [key: string]: number } = {};
    
    players.forEach((player: any) => {
        playerTotals[player.id] = 0;
        Object.keys(scores).forEach((holeNum) => {
            const holeScores = scores[holeNum];
            if (holeScores && holeScores[player.id] !== undefined) {
                playerTotals[player.id] += holeScores[player.id];
            }
        });
    });

    // Sort players by score (lower is better)
    const sortedPlayers = [...players].sort((a: any, b: any) => {
        return playerTotals[a.id] - playerTotals[b.id];
    });

    if (sortedPlayers.length === 0) {
        return {
            text: "No players in the current round.",
            type: 'leaderboard'
        };
    }

    const leader = sortedPlayers[0];
    const leaderScore = playerTotals[leader.id];
    const leaderScoreText = leaderScore === 0 
        ? "even par" 
        : leaderScore < 0 
            ? `${Math.abs(leaderScore)} under par`
            : `${leaderScore} over par`;

    if (sortedPlayers.length === 1) {
        return {
            text: `${leader.name} is winning at ${leaderScoreText}.`,
            type: 'leaderboard'
        };
    }

    let response = `${leader.name} is winning at ${leaderScoreText}.`;
    
    for (let i = 1; i < Math.min(sortedPlayers.length, 4); i++) {
        const player = sortedPlayers[i];
        const score = playerTotals[player.id];
        const scoreText = score === 0 
            ? "even par" 
            : score < 0 
                ? `${Math.abs(score)} under par`
                : `${score} over par`;
        
        const position = i === 1 ? "second" : i === 2 ? "third" : `${i + 1}th`;
        response += ` ${player.name} is ${position} at ${scoreText}.`;
    }

    return {
        text: response,
        type: 'leaderboard'
    };
}

function generateScoreHistoryResponse(
    gameState: any,
    holeCount?: number,
    holeRange?: { start: number; end: number }
): QueryResponse {
    if (!gameState.currentRound || !gameState.currentRound.players) {
        return {
            text: "No active round found.",
            type: 'scores'
        };
    }

    const players = gameState.currentRound.players;
    const scores = gameState.currentRound.scores || {};
    const activeHole = gameState.activeHole;

    let holesToRead: number[] = [];

    if (holeRange) {
        // Read specific range
        for (let i = holeRange.start; i <= holeRange.end; i++) {
            holesToRead.push(i);
        }
    } else if (holeCount) {
        // Read last N holes
        const startHole = Math.max(1, activeHole - holeCount);
        for (let i = startHole; i < activeHole; i++) {
            holesToRead.push(i);
        }
    } else {
        // Default: last 3 holes
        const startHole = Math.max(1, activeHole - 3);
        for (let i = startHole; i < activeHole; i++) {
            holesToRead.push(i);
        }
    }

    if (holesToRead.length === 0) {
        return {
            text: "No scores to read back yet.",
            type: 'scores'
        };
    }

    const responses: string[] = [];

    players.forEach((player: any) => {
        const playerScores: string[] = [];
        holesToRead.forEach((holeNum) => {
            const holeScores = scores[holeNum];
            if (holeScores && holeScores[player.id] !== undefined) {
                const score = holeScores[player.id];
                playerScores.push(getScoreTerm(score));
            }
        });

        if (playerScores.length > 0) {
            responses.push(`${player.name} got ${playerScores.join(', ')}.`);
        }
    });

    if (responses.length === 0) {
        return {
            text: "No scores found for those holes.",
            type: 'scores'
        };
    }

    return {
        text: responses.join(' '),
        type: 'scores'
    };
}

function generatePersonalScoreResponse(gameState: any): QueryResponse {
    if (!gameState.currentRound || !gameState.currentRound.players) {
        return {
            text: "No active round found.",
            type: 'general'
        };
    }

    // Assume first player is "Me" or current user
    const player = gameState.currentRound.players[0];
    if (!player) {
        return {
            text: "No player information found.",
            type: 'general'
        };
    }

    const scores = gameState.currentRound.scores || {};
    let totalScore = 0;
    let holesPlayed = 0;

    Object.keys(scores).forEach((holeNum) => {
        const holeScores = scores[holeNum];
        if (holeScores && holeScores[player.id] !== undefined) {
            totalScore += holeScores[player.id];
            holesPlayed++;
        }
    });

    if (holesPlayed === 0) {
        return {
            text: "You haven't scored any holes yet.",
            type: 'general'
        };
    }

    const scoreText = totalScore === 0 
        ? "even par" 
        : totalScore < 0 
            ? `${Math.abs(totalScore)} under par`
            : `${totalScore} over par`;

    return {
        text: `You're at ${scoreText} through ${holesPlayed} ${holesPlayed === 1 ? 'hole' : 'holes'}.`,
        type: 'general'
    };
}

function generateParResponse(gameState: any, holeNum: number): QueryResponse {
    if (!gameState.currentRound || !gameState.currentRound.course) {
        return {
            text: "No course information available.",
            type: 'course'
        };
    }

    const course = gameState.currentRound.course;
    const holes = course.holes || [];
    const hole = holes[holeNum - 1];

    if (hole && hole.par) {
        return {
            text: `Hole ${holeNum} is par ${hole.par}.`,
            type: 'course'
        };
    }

    // Default to par 3 if not specified
    return {
        text: `Hole ${holeNum} is par 3.`,
        type: 'course'
    };
}

function generateBettingResponse(gameState: any): QueryResponse {
    if (!gameState.fundatoryBets || gameState.fundatoryBets.length === 0) {
        return {
            text: "No active bets.",
            type: 'betting'
        };
    }

    const pendingBets = gameState.fundatoryBets.filter((bet: any) => bet.status === 'pending');
    
    if (pendingBets.length === 0) {
        return {
            text: "No pending bets.",
            type: 'betting'
        };
    }

    return {
        text: `You have ${pendingBets.length} pending ${pendingBets.length === 1 ? 'bet' : 'bets'}.`,
        type: 'betting'
    };
}

function generateCourseResponse(gameState: any): QueryResponse {
    if (!gameState.currentRound || !gameState.currentRound.course) {
        return {
            text: "No course information available.",
            type: 'course'
        };
    }

    const courseName = gameState.currentRound.course.name || "Unknown course";
    return {
        text: `You're playing at ${courseName}.`,
        type: 'course'
    };
}

function extractNumber(text: string, pattern: RegExp): number | undefined {
    const match = text.match(pattern);
    if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) {
            return num;
        }
    }
    return undefined;
}

function extractHoleRange(text: string): { start: number; end: number } | undefined {
    // Look for patterns like "holes 5 to 7" or "holes 5-7"
    const rangeMatch = text.match(/holes?\s+(\d+)\s*(?:to|-|through)\s*(\d+)/i);
    if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (!isNaN(start) && !isNaN(end)) {
            return { start, end };
        }
    }
    return undefined;
}

