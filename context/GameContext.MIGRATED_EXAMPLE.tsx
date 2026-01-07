'use client';

/**
 * DEMONSTRATION FILE - GameContext with Logger Migration
 * This file shows the first 250 lines of GameContext.tsx migrated to use the new logger.
 * Compare with the original GameContext.tsx to see the differences.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { FundatoryBet } from '@/lib/betting';
import { resolveSkinsResults, resolveNassauResults } from '@/lib/roundResolution';
import { processRoundCarryOvers } from '@/lib/mrtzCarryOvers';
import { saveRound, convertGameRoundToFirestore, saveLocalRound } from '@/lib/rounds';
import { calculateRoundMRTZ, updatePlayerMRTZ } from '@/lib/mrtz';
import { createRoundLedgerEntries } from '@/lib/mrtzLedger';
import { GameRound, FinalRoundData, CachedRound, RoundResolution } from '@/types/game';
import { Course } from '@/types/firestore';
import { Player } from '@/lib/players';
import { PlayerMRTZSummary, OutstandingBalance, MRTZLedgerEntry } from '@/types/mrtz';
import { NassauResult } from '@/lib/betting';
import { AchievementType } from '@/lib/stats';

// ============================================================================
// NEW IMPORTS - Logger and Constants
// ============================================================================
import { logger } from '@/lib/logger';
import { STORAGE_KEYS, ROUND_STATUS, MAX_ROUND_AGE_MINUTES } from '@/lib/constants';

// ============================================================================
// Removed - Now using constant from lib/constants.ts
// ============================================================================
// const MAX_ROUND_AGE_MINUTES = 30;

interface LedgerOptions {
    limit?: number;
    startAfter?: unknown;
    type?: string;
    status?: string;
}

interface GameContextType {
    currentRound: GameRound | null;
    players: Player[];
    course: Course | null;
    activeHole: number;
    teeOrder: string[]; // Array of player IDs in tee order
    currentTeeIndex: number; // Index of current player in tee order
    startRound: (selectedCourse: Course, selectedPlayers: Player[]) => void;
    updateScore: (playerId: string, holeNumber: number, score: number) => void;
    setActiveHole: (hole: number) => void;
    nextTee: () => void; // Move to next player in tee order
    setTeeOrder: (order: string[]) => void; // Set custom tee order
    fundatoryBets: FundatoryBet[];
    addFundatoryBet: (bet: FundatoryBet) => void;
    updateFundatoryBet: (betId: string, status: 'success' | 'fail') => void;
    activeBets: {
        skins?: { value: number; started: boolean; participants?: string[] };
        nassau?: { value: number; started: boolean; participants?: string[] };
    };
    startSkins: (value: number, participants?: string[]) => void;
    startNassau: (value: number, participants?: string[]) => void;
    clearBets: () => void;
    endRound: () => Promise<FinalRoundData>;
    isLoading: boolean;
    updateCourseLayout: (layoutId: string, holePars: { [holeNumber: number]: number }, holeDistances?: { [holeNumber: number]: number }) => void;
    hasRecentRound: () => boolean;
    restoreRecentRound: () => void;
    addPlayerToRound: (player: Player) => void;
    removePlayerFromRound: (playerId: string) => void;
    getCachedRounds: () => CachedRound[];
    restoreCachedRound: (timestamp: string) => void;
    // MRTZ Ledger functions
    getPlayerMRTZBalance: (playerId: string) => Promise<PlayerMRTZSummary | null>;
    getPlayerLedger: (playerId: string, options?: LedgerOptions) => Promise<MRTZLedgerEntry[]>;
    getOutstandingBalances: (playerId: string) => Promise<{ owedToMe: OutstandingBalance[]; iOwe: OutstandingBalance[] }>;
    achievement: { type: AchievementType; details: string } | null;
    clearAchievement: () => void;
    roundAchievements: Array<{ playerId: string; type: AchievementType; details: string }>;
    liveMode: boolean;
    toggleLiveMode: () => Promise<void>;
    roundId: string | null;
    loadRound: (round: GameRound) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
    // Consolidated state: everything round-related is in currentRound
    const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
    const [fundatoryBets, setFundatoryBets] = useState<FundatoryBet[]>([]);
    const [activeBets, setActiveBets] = useState<{
        skins?: { value: number; started: boolean; participants?: string[] };
        nassau?: { value: number; started: boolean; participants?: string[] };
    }>({});
    const [isLoading, setIsLoading] = useState(true);

    // Computed values derived from currentRound
    const course = currentRound?.course || null;
    const players = currentRound?.players || [];
    const activeHole = currentRound?.activeHole ?? 1;
    const teeOrder = currentRound?.teeOrder || [];
    const currentTeeIndex = currentRound?.currentTeeIndex ?? 0;

    // ========================================================================
    // MIGRATED: Load from local storage on mount (Offline persistence)
    // ========================================================================
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsLoading(true);

            logger.debug('GameContext initializing');
            logger.storage('Loading saved round from localStorage', {
                key: STORAGE_KEYS.CURRENT_ROUND,
            });

            // Handle localStorage cleanup only (never restore from here)
            const savedRound = localStorage.getItem(STORAGE_KEYS.CURRENT_ROUND);

            if (savedRound) {
                try {
                    const parsed = JSON.parse(savedRound);

                    logger.storage('Round data parsed successfully', {
                        hasStatus: !!parsed.status,
                        status: parsed.status,
                        hasStartTime: !!parsed.startTime,
                    });

                    if (parsed.status === ROUND_STATUS.ACTIVE || parsed.status === ROUND_STATUS.ENDED || !parsed.status) {
                        // Check if round is stale and needs cleanup
                        const startTime = parsed.startTime ? new Date(parsed.startTime) : null;
                        const now = new Date();
                        const minutesSinceStart = startTime && !isNaN(startTime.getTime())
                            ? (now.getTime() - startTime.getTime()) / (1000 * 60)
                            : Infinity;

                        // Only clean up stale rounds older than MAX_ROUND_AGE_MINUTES
                        if (minutesSinceStart > MAX_ROUND_AGE_MINUTES || !startTime || isNaN(startTime.getTime())) {
                            // Round is too old or missing startTime, save as partial then clear
                            const ageDescription = minutesSinceStart === Infinity
                                ? (startTime ? 'invalid startTime' : 'missing startTime')
                                : `${minutesSinceStart.toFixed(1)} minutes old`;

                            logger.round('Stale round detected, cleaning up', {
                                age: ageDescription,
                                minutesSinceStart: minutesSinceStart === Infinity ? 'N/A' : minutesSinceStart.toFixed(1),
                                hasScores: !!(parsed.scores && Object.keys(parsed.scores).length > 0),
                                hasCourse: !!parsed.course,
                            });

                            // Save as partial round if it has scores
                            if (parsed.scores && Object.keys(parsed.scores).length > 0 && parsed.course) {
                                (async () => {
                                    logger.round('Saving stale round as partial', {
                                        age: ageDescription,
                                        scoreCount: Object.keys(parsed.scores).length,
                                        courseId: parsed.course?.id,
                                    });

                                    try {
                                        const layoutId = parsed.course?.selectedLayoutKey || 'default';
                                        const courseId = parsed.course?.id || parsed.course?.name || 'unknown';
                                        const partialRound = convertGameRoundToFirestore(
                                            {
                                                ...parsed,
                                                bets: {
                                                    skins: {},
                                                    nassau: null,
                                                    fundatory: parsed.fundatoryBets || []
                                                }
                                            },
                                            courseId,
                                            layoutId,
                                            ROUND_STATUS.PARTIAL
                                        );

                                        await saveRound(partialRound);

                                        logger.round('Stale round saved as partial', {
                                            age: ageDescription,
                                            courseId: parsed.course?.id,
                                        });
                                    } catch (error) {
                                        // MIGRATED: console.error → logger.error with context
                                        logger.error('Failed to save stale round as partial', error, {
                                            age: ageDescription,
                                            hasScores: Object.keys(parsed.scores).length,
                                            courseId: parsed.course?.id,
                                            operation: 'stale-round-cleanup',
                                        });
                                        // Still clear even if save fails
                                    }
                                })();
                            }

                            logger.storage('Clearing stale round data', {
                                age: ageDescription,
                                keys: [STORAGE_KEYS.CURRENT_ROUND, STORAGE_KEYS.FUNDATORY_BETS, STORAGE_KEYS.ACTIVE_BETS],
                            });

                            localStorage.removeItem(STORAGE_KEYS.CURRENT_ROUND);
                            localStorage.removeItem(STORAGE_KEYS.FUNDATORY_BETS);
                            localStorage.removeItem(STORAGE_KEYS.ACTIVE_BETS);
                            setCurrentRound(null);
                        } else {
                            // Recent round exists - AUTO-RESTORE
                            logger.round('Auto-restoring recent round', {
                                minutesSinceStart: minutesSinceStart.toFixed(1),
                                activeHole: parsed.activeHole,
                                playerCount: parsed.players?.length,
                            });

                            // Ensure all round properties are set
                            const restoredRound: GameRound = {
                                ...parsed,
                                status: ROUND_STATUS.ACTIVE,
                                activeHole: parsed.activeHole ?? 1,
                                teeOrder: parsed.teeOrder || (parsed.players ? parsed.players.map((p: Player) => p.id || (p as any).uid).filter(Boolean) : []),
                                currentTeeIndex: parsed.currentTeeIndex ?? 0
                            };
                            setCurrentRound(restoredRound);

                            logger.round('Round restored successfully', {
                                roundId: restoredRound.startTime,
                                activeHole: restoredRound.activeHole,
                                playerCount: restoredRound.players.length,
                            });

                            // Restore bets
                            logger.storage('Restoring betting data', {
                                key: STORAGE_KEYS.FUNDATORY_BETS,
                            });

                            const savedFundatory = localStorage.getItem(STORAGE_KEYS.FUNDATORY_BETS);
                            if (savedFundatory) {
                                try {
                                    const fundatoryData = JSON.parse(savedFundatory);
                                    setFundatoryBets(fundatoryData);
                                    logger.betting('Fundatory bets restored', {
                                        count: fundatoryData.length,
                                    });
                                } catch (e) {
                                    // MIGRATED: console.error → logger.error with context
                                    logger.error('Failed to restore fundatory bets', e, {
                                        key: STORAGE_KEYS.FUNDATORY_BETS,
                                        dataLength: savedFundatory.length,
                                        fallbackAvailable: !!parsed.fundatoryBets,
                                    });
                                    if (parsed.fundatoryBets) setFundatoryBets(parsed.fundatoryBets);
                                }
                            } else if (parsed.fundatoryBets) {
                                setFundatoryBets(parsed.fundatoryBets);
                                logger.betting('Fundatory bets restored from round data', {
                                    count: parsed.fundatoryBets.length,
                                });
                            }

                            const savedActiveBets = localStorage.getItem(STORAGE_KEYS.ACTIVE_BETS);
                            if (savedActiveBets) {
                                try {
                                    const activeBetsData = JSON.parse(savedActiveBets);
                                    setActiveBets(activeBetsData);
                                    logger.betting('Active bets restored', {
                                        hasSkins: !!activeBetsData.skins,
                                        hasNassau: !!activeBetsData.nassau,
                                    });
                                } catch (e) {
                                    // MIGRATED: console.error → logger.error with context
                                    logger.error('Failed to restore active bets', e, {
                                        key: STORAGE_KEYS.ACTIVE_BETS,
                                        dataLength: savedActiveBets.length,
                                        fallbackAvailable: !!parsed.activeBets,
                                    });
                                    if (parsed.activeBets) setActiveBets(parsed.activeBets);
                                }
                            } else if (parsed.activeBets) {
                                setActiveBets(parsed.activeBets);
                                logger.betting('Active bets restored from round data');
                            }
                        }
                    }
                } catch (e) {
                    // MIGRATED: console.error → logger.error with context
                    logger.error('Failed to load saved round', e, {
                        key: STORAGE_KEYS.CURRENT_ROUND,
                        dataLength: savedRound.length,
                        operation: 'initial-load',
                    });

                    // Clear corrupted data
                    logger.storage('Clearing corrupted round data');
                    localStorage.removeItem(STORAGE_KEYS.CURRENT_ROUND);
                    setCurrentRound(null);
                }
            } else {
                logger.debug('No saved round found in localStorage');
                setCurrentRound(null);
            }

            setIsLoading(false);
            logger.debug('GameContext initialization complete', {
                hasRound: !!currentRound,
            });
        }
    }, []);

    // ========================================================================
    // MIGRATED: Save to local storage whenever state changes
    // ========================================================================
    useEffect(() => {
        if (typeof window !== 'undefined' && currentRound && currentRound.status === ROUND_STATUS.ACTIVE) {
            logger.storage('Saving current round', {
                key: STORAGE_KEYS.CURRENT_ROUND,
                roundId: currentRound.startTime,
                activeHole: currentRound.activeHole,
            });
            localStorage.setItem(STORAGE_KEYS.CURRENT_ROUND, JSON.stringify(currentRound));
        }
    }, [currentRound]);

    // Save fundatory bets to local storage
    useEffect(() => {
        if (typeof window !== 'undefined' && fundatoryBets.length >= 0) {
            logger.storage('Saving fundatory bets', {
                key: STORAGE_KEYS.FUNDATORY_BETS,
                count: fundatoryBets.length,
            });
            localStorage.setItem(STORAGE_KEYS.FUNDATORY_BETS, JSON.stringify(fundatoryBets));
        }
    }, [fundatoryBets]);

    // Save active bets to local storage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            logger.storage('Saving active bets', {
                key: STORAGE_KEYS.ACTIVE_BETS,
                hasSkins: !!activeBets.skins,
                hasNassau: !!activeBets.nassau,
            });
            localStorage.setItem(STORAGE_KEYS.ACTIVE_BETS, JSON.stringify(activeBets));
        }
    }, [activeBets]);

    // ========================================================================
    // MIGRATED: startRound function
    // ========================================================================
    const startRound = (selectedCourse: Course, selectedPlayers: Player[]) => {
        logger.round('Starting new round', {
            courseId: selectedCourse.id,
            courseName: selectedCourse.name,
            playerCount: selectedPlayers.length,
            playerNames: selectedPlayers.map(p => p.name),
        });

        // Initialize tee order with player IDs (default order)
        const playerIds = selectedPlayers.map((p: Player) => p.id).filter(Boolean);

        if (playerIds.length === 0) {
            // MIGRATED: console.error → logger.error with context
            logger.error('No valid player IDs found when starting round', new Error('Invalid player data'), {
                selectedPlayers: selectedPlayers.map(p => ({
                    name: p.name,
                    id: p.id,
                    uid: (p as any).uid,
                })),
                courseId: selectedCourse.id,
                courseName: selectedCourse.name,
            });
            return;
        }

        const newRound: GameRound = {
            course: selectedCourse,
            players: selectedPlayers,
            scores: {}, // { holeNumber: { playerId: score } }
            startTime: new Date().toISOString(),
            status: ROUND_STATUS.ACTIVE,
            activeHole: 1,
            teeOrder: playerIds,
            currentTeeIndex: 0
        };

        setCurrentRound(newRound);

        logger.round('Round started successfully', {
            roundId: newRound.startTime,
            activeHole: 1,
            teeOrderCount: playerIds.length,
            status: ROUND_STATUS.ACTIVE,
        });
    };

    const setActiveHole = useCallback((hole: number) => {
        logger.round('Setting active hole', {
            currentHole: activeHole,
            newHole: hole,
            roundId: currentRound?.startTime,
        });

        setCurrentRound((prev: GameRound | null) => {
            if (!prev) return prev;

            let updatedTeeOrder = prev.teeOrder || [];

            // If moving to a new hole (not hole 1), update tee order based on golf rules
            // Golf rules: lowest score from previous hole tees first
            if (hole > 1 && prev.scores) {
                // ... rest of the logic
            }

            // Rest of the implementation...
            return prev;
        });
    }, [activeHole, currentRound]);

    // ... rest of the GameContext implementation
    // (Additional functions would be similarly migrated)

    return (
        <GameContext.Provider value={{
            currentRound,
            players,
            course,
            activeHole,
            teeOrder,
            currentTeeIndex,
            startRound,
            updateScore: () => {}, // Placeholder
            setActiveHole,
            nextTee: () => {}, // Placeholder
            setTeeOrder: () => {}, // Placeholder
            fundatoryBets,
            addFundatoryBet: () => {}, // Placeholder
            updateFundatoryBet: () => {}, // Placeholder
            activeBets,
            startSkins: () => {}, // Placeholder
            startNassau: () => {}, // Placeholder
            clearBets: () => {}, // Placeholder
            endRound: async () => ({} as FinalRoundData), // Placeholder
            isLoading,
            updateCourseLayout: () => {}, // Placeholder
            hasRecentRound: () => false, // Placeholder
            restoreRecentRound: () => {}, // Placeholder
            addPlayerToRound: () => {}, // Placeholder
            removePlayerFromRound: () => {}, // Placeholder
            getCachedRounds: () => [], // Placeholder
            restoreCachedRound: () => {}, // Placeholder
            getPlayerMRTZBalance: async () => null, // Placeholder
            getPlayerLedger: async () => [], // Placeholder
            getOutstandingBalances: async () => ({ owedToMe: [], iOwe: [] }), // Placeholder
            achievement: null,
            clearAchievement: () => {}, // Placeholder
            roundAchievements: [],
            liveMode: false,
            toggleLiveMode: async () => {}, // Placeholder
            roundId: null,
            loadRound: () => {}, // Placeholder
        }}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within GameProvider');
    }
    return context;
}
