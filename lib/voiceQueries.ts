/**
 * Voice Query Processing and Response Generation
 */

import { applyPersonality } from './voicePersonality';

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
    return SCORE_TERM_MAP[score] || `${score > 0 ? '+' : ''}${score}`;
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

    // Tee order queries
    if (
        lowerText.includes("who's up") ||
        lowerText.includes("who is up") ||
        lowerText.includes("who's next") ||
        lowerText.includes("who is next") ||
        lowerText.includes("whose turn") ||
        lowerText.includes("who goes") ||
        lowerText.includes("tee order") ||
        lowerText.includes("who's teeing")
    ) {
        return generateTeeOrderResponse(gameState);
    }

    // Hole number queries
    if (
        lowerText.includes("what hole") ||
        lowerText.includes("which hole") ||
        lowerText.includes("current hole") ||
        lowerText.includes("what hole are we on")
    ) {
        return generateHoleNumberResponse(gameState);
    }

    // Caddie Tips & Advice
    if (
        lowerText.includes("how should i play") ||
        lowerText.includes("what's the play") ||
        lowerText.includes("give me a tip") ||
        lowerText.includes("caddie advice") ||
        lowerText.includes("how long is this hole") ||
        lowerText.includes("distance")
    ) {
        return generateCaddieTipResponse(gameState, lowerText);
    }

    return null;
}

function generateCaddieTipResponse(gameState: any, queryText: string): QueryResponse {
    if (!gameState.currentRound || !gameState.currentRound.course) {
        return {
            text: applyPersonality("I need course data to give advice.", { type: 'course' }),
            type: 'course'
        };
    }

    const activeHole = gameState.activeHole || 1;
    const layoutKey = gameState.currentRound.course.selectedLayoutKey || 'default';
    const holeData = gameState.currentRound.course.layouts?.[layoutKey]?.holes?.[activeHole];

    if (!holeData) {
        return {
            text: applyPersonality(`I don't have data for hole ${activeHole}.`, { type: 'course' }),
            type: 'course'
        };
    }

    const par = holeData.par || 3;
    const distance = holeData.distance;
    const unit = gameState.currentRound.course.distanceUnit || 'yards';

    // Distance query
    if (queryText.includes("long") || queryText.includes("distance")) {
        if (distance) {
            return {
                text: applyPersonality(`Hole ${activeHole} is ${distance} ${unit}. Par ${par}.`, { type: 'course' }),
                type: 'course'
            };
        } else {
            return {
                text: applyPersonality(`Hole ${activeHole} is a par ${par}. Distance is unknown.`, { type: 'course' }),
                type: 'course'
            };
        }
    }

    // Strategy tip
    let tip = "";
    if (par === 3) {
        tip = `It's a par 3. Aim for the center of the green and play for par.`;
        if (distance && distance > 200) tip += " It's a long one, so verify your club selection.";
    } else if (par === 4) {
        tip = `Par 4. Keep your drive in the fairway to set up a good approach.`;
        if (distance && distance < 350) tip += " It's short, so you might not need driver.";
    } else if (par === 5) {
        tip = `Par 5. Play for a three-shot strategy unless you get a great drive. Scores are made with the wedge here.`;
    }

    return {
        text: applyPersonality(tip, { type: 'general' }),
        type: 'general'
    };
}

function generateLeaderboardResponse(gameState: any): QueryResponse {
    if (!gameState.currentRound || !gameState.currentRound.players) {
        return {
            text: applyPersonality("No active round found.", { type: 'leaderboard' }),
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
            text: applyPersonality("No players in the current round.", { type: 'leaderboard' }),
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
            text: applyPersonality(`${leader.name} is winning at ${leaderScoreText}.`, { type: 'leaderboard' }),
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
        text: applyPersonality(response, { type: 'leaderboard' }),
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
            text: applyPersonality("No active round found.", { type: 'scores' }),
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
            text: applyPersonality("No scores to read back yet.", { type: 'scores' }),
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
            text: applyPersonality("No scores found for those holes.", { type: 'scores' }),
            type: 'scores'
        };
    }

    return {
        text: applyPersonality(responses.join(' '), { type: 'scores' }),
        type: 'scores'
    };
}

function generatePersonalScoreResponse(gameState: any): QueryResponse {
    if (!gameState.currentRound || !gameState.currentRound.players) {
        return {
            text: applyPersonality("No active round found.", { type: 'general' }),
            type: 'general'
        };
    }

    // Assume first player is "Me" or current user
    const player = gameState.currentRound.players[0];
    if (!player) {
        return {
            text: applyPersonality("No player information found.", { type: 'general' }),
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
            text: applyPersonality("You haven't scored any holes yet.", { type: 'general' }),
            type: 'general'
        };
    }

    const scoreText = totalScore === 0
        ? "even par"
        : totalScore < 0
            ? `${Math.abs(totalScore)} under par`
            : `${totalScore} over par`;

    return {
        text: applyPersonality(`You're at ${scoreText} through ${holesPlayed} ${holesPlayed === 1 ? 'hole' : 'holes'}.`, { type: 'general' }),
        type: 'general'
    };
}

function generateParResponse(gameState: any, holeNum: number): QueryResponse {
    if (!gameState.currentRound || !gameState.currentRound.course) {
        return {
            text: applyPersonality("No course information available.", { type: 'course' }),
            type: 'course'
        };
    }

    const course = gameState.currentRound.course;
    const holes = course.holes || [];
    const hole = holes[holeNum - 1];

    if (hole && hole.par) {
        return {
            text: applyPersonality(`Hole ${holeNum} is par ${hole.par}.`, { type: 'course' }),
            type: 'course'
        };
    }

    // Default to par 3 if not specified
    return {
        text: applyPersonality(`Hole ${holeNum} is par 3.`, { type: 'course' }),
        type: 'course'
    };
}

function generateBettingResponse(gameState: any): QueryResponse {
    const { fundatoryBets, activeBets, currentRound, activeHole } = gameState;
    const pendingFundatory = fundatoryBets?.filter((b: any) => b.status === 'pending') || [];

    let responseText = "";

    // Report Fundatory Bets
    if (pendingFundatory.length > 0) {
        responseText += `You have ${pendingFundatory.length} pending fundatory ${pendingFundatory.length === 1 ? 'bet' : 'bets'}. `;
    }

    // Report Skins Status (Simple calculation)
    if (activeBets?.skins?.started && currentRound?.scores) {
        // Calculate skins won
        // Note: For full accuracy we'd need the complete calculateSkins logic here,
        // but for a quick voice response we can summarize carry-overs.
        // Importing the full logic might be heavy, so we'll give a high-level summary.
        responseText += "Skins game is active. ";
    }

    // Report Nassau Status
    if (activeBets?.nassau?.started) {
        responseText += "Nassau is active. ";
    }

    if (!responseText) {
        return {
            text: applyPersonality("No active bets found.", { type: 'betting' }),
            type: 'betting'
        };
    }

    return {
        text: applyPersonality(responseText.trim(), { type: 'betting' }),
        type: 'betting'
    };
}

function generateCourseResponse(gameState: any): QueryResponse {
    if (!gameState.currentRound || !gameState.currentRound.course) {
        return {
            text: applyPersonality("No course information available.", { type: 'course' }),
            type: 'course'
        };
    }

    const courseName = gameState.currentRound.course.name || "Unknown course";
    return {
        text: applyPersonality(`You're playing at ${courseName}.`, { type: 'course' }),
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

function generateTeeOrderResponse(gameState: any): QueryResponse {
    if (!gameState.currentRound || !gameState.currentRound.players) {
        return {
            text: applyPersonality("No active round found.", { type: 'general' }),
            type: 'general'
        };
    }

    const players = gameState.currentRound.players;
    const teeOrder = gameState.teeOrder || [];
    const currentTeeIndex = gameState.currentTeeIndex || 0;

    if (teeOrder.length === 0 || currentTeeIndex >= teeOrder.length) {
        return {
            text: applyPersonality("Tee order not set.", { type: 'general' }),
            type: 'general'
        };
    }

    const currentPlayerId = teeOrder[currentTeeIndex];
    const currentPlayer = players.find((p: any) => p.id === currentPlayerId);

    if (!currentPlayer) {
        return {
            text: applyPersonality("Could not find current player.", { type: 'general' }),
            type: 'general'
        };
    }

    const nextIndex = (currentTeeIndex + 1) % teeOrder.length;
    const nextPlayerId = teeOrder[nextIndex];
    const nextPlayer = players.find((p: any) => p.id === nextPlayerId);

    if (nextPlayer && nextPlayer.id !== currentPlayer.id) {
        return {
            text: applyPersonality(`${currentPlayer.name} is up. ${nextPlayer.name} is next.`, { type: 'general' }),
            type: 'general'
        };
    }

    return {
        text: applyPersonality(`${currentPlayer.name} is up.`, { type: 'general' }),
        type: 'general'
    };
}

function generateHoleNumberResponse(gameState: any): QueryResponse {
    const activeHole = gameState.activeHole || 1;
    return {
        text: applyPersonality(`You're on hole ${activeHole}.`, { type: 'course' }),
        type: 'course'
    };
}

