
import { GameRound, NassauResult } from '@/types/game';
import { calculateSkins, calculateNassau } from './betting';

export type RoundResolution = {
    action: 'exclude' | 'push' | 'playoff' | 'payout';
    playoffWinners?: { [hole: number]: string };
    settleToday?: boolean;
};

export type SkinsResultMap = {
    [holeNumber: number]: {
        winnerId?: string;
        value: number;
        carryOver: boolean;
        push?: boolean;
        tiedPlayers?: string[];
    }
};

/**
 * Resolves Skins bets based on round scores and resolution settings
 */
export function resolveSkinsResults(
    currentRound: GameRound,
    activeBets: any,
    resolution: RoundResolution | null
): SkinsResultMap {
    const skinsResults: SkinsResultMap = {};
    const holes = Array.from({ length: 18 }, (_, i) => i + 1);

    if (activeBets.skins?.started) {
        const skins = calculateSkins(
            currentRound.scores,
            holes,
            activeBets.skins.value,
            activeBets.skins.participants
        );

        // Handle resolution for skins
        if (resolution?.action === 'exclude') {
            // Exclude carryovers - only include resolved skins
            skins.forEach(s => {
                if (!s.isCarryOver) {
                    skinsResults[s.holeNumber] = {
                        winnerId: s.winnerId || undefined,
                        value: s.value,
                        carryOver: false
                    };
                }
            });
        } else if (resolution?.action === 'playoff' && resolution.playoffWinners) {
            // Use playoff winners
            skins.forEach(s => {
                if (s.isCarryOver && resolution.playoffWinners![s.holeNumber]) {
                    skinsResults[s.holeNumber] = {
                        winnerId: resolution.playoffWinners![s.holeNumber],
                        value: s.value,
                        carryOver: false
                    };
                } else if (!s.isCarryOver) {
                    skinsResults[s.holeNumber] = {
                        winnerId: s.winnerId || undefined,
                        value: s.value,
                        carryOver: false
                    };
                }
            });
        } else if (resolution?.action === 'push') {
            // Push: divide MRTZ equally among tied players
            skins.forEach(s => {
                if (s.isCarryOver) {
                    // Find tied players (all players who tied on this hole)
                    const holeScores = currentRound.scores[s.holeNumber];
                    if (holeScores) {
                        const minScore = Math.min(...Object.values(holeScores) as number[]);
                        const tiedPlayers = Object.keys(holeScores).filter(
                            pid => holeScores[pid] === minScore
                        );
                        // Mark as push for special handling in MRTZ calc
                        skinsResults[s.holeNumber] = {
                            winnerId: undefined,
                            value: s.value,
                            carryOver: false,
                            push: true,
                            tiedPlayers: tiedPlayers
                        };
                    }
                } else {
                    skinsResults[s.holeNumber] = {
                        winnerId: s.winnerId || undefined,
                        value: s.value,
                        carryOver: false
                    };
                }
            });
        } else if (resolution?.action === 'payout') {
            // For payout, include all but mark carryovers as resolved if settled today
            skins.forEach(s => {
                skinsResults[s.holeNumber] = {
                    winnerId: s.winnerId || undefined,
                    value: s.value,
                    carryOver: s.isCarryOver && !resolution.settleToday
                };
            });
        } else {
            // Default: include all as is
            skins.forEach(s => {
                skinsResults[s.holeNumber] = {
                    winnerId: s.winnerId || undefined,
                    value: s.value,
                    carryOver: s.isCarryOver
                };
            });
        }
    }
    return skinsResults;
}

/**
 * Resolves Nassau bets based on round scores and resolution settings
 */
export function resolveNassauResults(
    currentRound: GameRound,
    activeBets: any,
    playerIds: string[],
    resolution: RoundResolution | null
): NassauResult | null {
    let nassauResults: NassauResult | null = null;

    if (activeBets.nassau?.started) {
        nassauResults = calculateNassau(currentRound.scores, playerIds, activeBets.nassau.participants);
        const nassauValue = activeBets.nassau?.value || 0;

        // Handle resolution for nassau ties
        if (resolution?.action === 'exclude') {
            // Exclude unresolved segments
            if (nassauResults.front9WinnerId === null) nassauResults.front9WinnerId = null;
            if (nassauResults.back9WinnerId === null) nassauResults.back9WinnerId = null;
            if (nassauResults.overallWinnerId === null) nassauResults.overallWinnerId = null;

        } else if (resolution?.action === 'push') {
            // Push: divide MRTZ equally among tied players for each segment

            // Helper to handle push logic
            const handlePush = (segmentName: 'front9' | 'back9' | 'overall', range: [number, number]) => {
                // Determine scores for the range
                const scores: { [pid: string]: number } = {};
                playerIds.forEach(p => {
                    let total = 0;
                    for (let i = range[0]; i <= range[1]; i++) {
                        total += currentRound.scores[i]?.[p] || 0;
                    }
                    scores[p] = total;
                });

                const minScore = Math.min(...Object.values(scores));
                const tiedPlayers = Object.keys(scores).filter(pid => scores[pid] === minScore);

                return {
                    tiedPlayers,
                    value: nassauValue,
                    divided: nassauValue / tiedPlayers.length
                };
            };

            if (nassauResults.front9WinnerId === null) {
                nassauResults.front9Push = handlePush('front9', [1, 9]);
            }
            if (nassauResults.back9WinnerId === null) {
                nassauResults.back9Push = handlePush('back9', [10, 18]);
            }
            if (nassauResults.overallWinnerId === null) {
                nassauResults.overallPush = handlePush('overall', [1, 18]);
            }
        }
        // Playoff logic for Nassau would go here if implemented
    }

    return nassauResults;
}
