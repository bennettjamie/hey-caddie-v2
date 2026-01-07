'use client';

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
import { logger } from '@/lib/logger';
import { STORAGE_KEYS, ROUND_STATUS, MAX_ROUND_AGE_MINUTES } from '@/lib/constants';
import { updateFriendActivity, areFriends } from '@/lib/friends';
import { auth } from '@/lib/firebase';

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

    // Load from local storage on mount (Offline persistence)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsLoading(true);

            // Handle localStorage cleanup only (never restore from here)
            const savedRound = localStorage.getItem(STORAGE_KEYS.CURRENT_ROUND);
            if (savedRound) {
                try {
                    const parsed = JSON.parse(savedRound);
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

                            // Save as partial round if it has scores
                            if (parsed.scores && Object.keys(parsed.scores).length > 0 && parsed.course) {
                                (async () => {
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
                                            'partial' // Mark as partial
                                        );
                                        await saveRound(partialRound);
                                        // Removed console.log`Saved stale round as partial to database (${ageDescription})`);
                                    } catch (error) {
                                        logger.error('Failed to save stale round as partial', error, {
                                            roundAge: ageDescription,
                                            hasScores: Object.keys(parsed.scores).length > 0,
                                            courseId: parsed.course?.id,
                                            operation: 'stale-round-cleanup',
                                        });
                                        // Still clear even if save fails
                                    }
                                })();
                            }

                            // Removed console.log`Clearing stale active round from localStorage (${ageDescription})`);
                            localStorage.removeItem(STORAGE_KEYS.CURRENT_ROUND);
                            localStorage.removeItem(STORAGE_KEYS.FUNDATORY_BETS);
                            localStorage.removeItem(STORAGE_KEYS.ACTIVE_BETS);
                            setCurrentRound(null);
                        } else {
                            // Recent round exists - AUTO-RESTORE
                            // Ensure all round properties are set
                            const restoredRound: GameRound = {
                                ...parsed,
                                status: ROUND_STATUS.ACTIVE,
                                activeHole: parsed.activeHole ?? 1,
                                teeOrder: parsed.teeOrder || (parsed.players ? parsed.players.map((p: Player) => p.id || (p as any).uid).filter(Boolean) : []),
                                currentTeeIndex: parsed.currentTeeIndex ?? 0
                            };
                            setCurrentRound(restoredRound);

                            // Restore bets
                            const savedFundatory = localStorage.getItem(STORAGE_KEYS.FUNDATORY_BETS);
                            if (savedFundatory) {
                                try {
                                    setFundatoryBets(JSON.parse(savedFundatory));
                                } catch (e) {
                                    logger.error('Failed to restore fundatory bets', e, {
                                        key: STORAGE_KEYS.FUNDATORY_BETS,
                                        fallbackAvailable: !!parsed.fundatoryBets,
                                    });
                                    if (parsed.fundatoryBets) setFundatoryBets(parsed.fundatoryBets);
                                }
                            } else if (parsed.fundatoryBets) {
                                setFundatoryBets(parsed.fundatoryBets);
                            }

                            const savedActiveBets = localStorage.getItem(STORAGE_KEYS.ACTIVE_BETS);
                            if (savedActiveBets) {
                                try {
                                    setActiveBets(JSON.parse(savedActiveBets));
                                } catch (e) {
                                    logger.error('Failed to restore active bets', e, {
                                        key: STORAGE_KEYS.ACTIVE_BETS,
                                        fallbackAvailable: !!parsed.activeBets,
                                    });
                                    if (parsed.activeBets) setActiveBets(parsed.activeBets);
                                }
                            } else if (parsed.activeBets) {
                                setActiveBets(parsed.activeBets);
                            }
                        }
                    }
                } catch (e) {
                    logger.error('Failed to load saved round', e, {
                        key: STORAGE_KEYS.CURRENT_ROUND,
                        operation: 'initial-load',
                    });
                    // Clear corrupted data
                    localStorage.removeItem(STORAGE_KEYS.CURRENT_ROUND);
                    setCurrentRound(null);
                }
            } else {
                setCurrentRound(null);
            }

            setIsLoading(false);
        }
    }, []);

    // Save to local storage whenever state changes (only for active rounds)
    useEffect(() => {
        if (typeof window !== 'undefined' && currentRound && currentRound.status === ROUND_STATUS.ACTIVE) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_ROUND, JSON.stringify(currentRound));
        }
    }, [currentRound]);

    // Save fundatory bets to local storage
    useEffect(() => {
        if (typeof window !== 'undefined' && fundatoryBets.length >= 0) {
            localStorage.setItem(STORAGE_KEYS.FUNDATORY_BETS, JSON.stringify(fundatoryBets));
        }
    }, [fundatoryBets]);

    // Save active bets to local storage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_BETS, JSON.stringify(activeBets));
        }
    }, [activeBets]);

    const startRound = (selectedCourse: Course, selectedPlayers: Player[]) => {
        // Initialize tee order with player IDs (default order)
        const playerIds = selectedPlayers.map((p: Player) => p.id).filter(Boolean);
        if (playerIds.length === 0) {
            logger.error('No valid player IDs found when starting round', new Error('Invalid player data'), {
                selectedPlayers: selectedPlayers.map(p => ({ name: p.name, id: p.id })),
                courseId: selectedCourse.id,
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
    };

    const setActiveHole = useCallback((hole: number) => {
        setCurrentRound((prev: GameRound | null) => {
            if (!prev) return prev;

            let updatedTeeOrder = prev.teeOrder || [];

            // If moving to a new hole (not hole 1), update tee order based on golf rules
            // Golf rules: lowest score from previous hole tees first
            if (hole > 1 && prev.scores) {
                const previousHole = hole - 1;
                const previousHoleScores = prev.scores[previousHole];

                if (previousHoleScores && Object.keys(previousHoleScores).length > 0) {
                    // Calculate tee order based on scores (lowest score first)
                    const playerIds = prev.players.map((p: Player) => p.id).filter(Boolean);
                    updatedTeeOrder = [...playerIds].sort((a, b) => {
                        const scoreA = previousHoleScores[a] ?? 999; // Default high score if no score
                        const scoreB = previousHoleScores[b] ?? 999;
                        if (scoreA !== scoreB) {
                            return scoreA - scoreB; // Lower score first
                        }
                        // If tied, maintain current order
                        const currentIndexA = (prev.teeOrder || []).indexOf(a);
                        const currentIndexB = (prev.teeOrder || []).indexOf(b);
                        return currentIndexA - currentIndexB;
                    });
                }
            }

            return {
                ...prev,
                activeHole: hole,
                teeOrder: updatedTeeOrder,
                currentTeeIndex: 0 // Reset to first player when moving to new hole
            };
        });
    }, []);

    const nextTee = useCallback(() => {
        setCurrentRound((prev: GameRound | null) => {
            if (!prev || !prev.teeOrder || prev.teeOrder.length === 0) return prev;
            return {
                ...prev,
                currentTeeIndex: ((prev.currentTeeIndex ?? 0) + 1) % prev.teeOrder.length
            };
        });
    }, []);

    const setTeeOrder = useCallback((order: string[]) => {
        if (!Array.isArray(order)) {
            logger.warn('setTeeOrder called with invalid type', {
                receivedType: typeof order,
                receivedValue: order,
                expectedType: 'array',
            });
            return;
        }
        setCurrentRound((prev: GameRound | null) => {
            if (!prev) return prev;
            return {
                ...prev,
                teeOrder: order,
                currentTeeIndex: 0 // Reset to first player
            };
        });
    }, []);

    const addFundatoryBet = (bet: FundatoryBet) => {
        setFundatoryBets((prev) => [...prev, bet]);
    };

    const updateFundatoryBet = (betId: string, status: 'success' | 'fail') => {
        setFundatoryBets((prev) =>
            prev.map((bet) => (bet.id === betId ? { ...bet, status } : bet))
        );
    };

    const startSkins = useCallback((value: number, participants?: string[]) => {
        setActiveBets((prev) => ({
            ...prev,
            skins: { value, started: true, participants }
        }));
    }, []);

    const startNassau = useCallback((value: number, participants?: string[]) => {
        setActiveBets((prev) => ({
            ...prev,
            nassau: { value, started: true, participants }
        }));
    }, []);

    const clearBets = () => {
        setActiveBets({});
    };

    const endRound = async () => {
        let finalRoundData: any = null;

        if (currentRound && currentRound.course) {
            // Check if round has score data
            const hasScoreData = currentRound.scores && Object.keys(currentRound.scores).length > 0;

            // Get resolution options if available
            let resolution: any = null;
            if (typeof window !== 'undefined' && (window as any).__pendingRoundResolution) {
                resolution = (window as any).__pendingRoundResolution;
                delete (window as any).__pendingRoundResolution;
            }

            try {
                // Convert to Firestore format
                const layoutId = currentRound.course?.selectedLayoutKey || 'default';
                const courseId = currentRound.course.id || currentRound.course.name; // Fallback to name if no ID
                const layoutName = currentRound.course.layouts?.[layoutId]?.name || 'Main';

                // Create player names map for denormalization
                const playerNames: { [key: string]: string } = {};
                currentRound.players.forEach((p: Player) => {
                    playerNames[p.id] = p.name;
                });

                // Calculate final betting results
                const holes = Array.from({ length: 18 }, (_, i) => i + 1);
                const playerIds = currentRound.players.map((p: Player) => p.id);

                let skinsResults: {
                    [holeNumber: number]: {
                        winnerId?: string;
                        value: number;
                        carryOver: boolean;
                        push?: boolean;
                        tiedPlayers?: string[];
                    }
                } = {};
                let nassauResults: NassauResult | null = null;

                if (activeBets.skins?.started) {
                    skinsResults = resolveSkinsResults(currentRound, activeBets, resolution);
                }

                if (activeBets.nassau?.started) {
                    nassauResults = resolveNassauResults(currentRound, activeBets, playerIds, resolution);
                }

                // Calculate MRTZ for each player
                const roundMRTZ = calculateRoundMRTZ(
                    {
                        ...currentRound,
                        players: playerIds
                    } as any,
                    activeBets,
                    fundatoryBets
                );

                // Check if settled IRL or added to ledger
                const settlement = typeof window !== 'undefined' ? (window as any).__roundSettlement : null;
                const settledIRL = settlement?.settledIRL !== false; // Default to true if not specified

                // Create ledger entries for this round
                try {
                    const transactionIds = await createRoundLedgerEntries(
                        courseId,
                        roundMRTZ,
                        activeBets,
                        fundatoryBets,
                        currentRound.players.map((p: Player) => ({ id: p.id, name: p.name })),
                        currentRound.players[0]?.id || 'system' // Use first player as creator, or 'system'
                    );

                    // If not settled IRL, transactions are created but marked as pending
                    // They'll be marked as settled when settlement is confirmed
                    if (!settledIRL) {
                        // Transactions are already created, just need to mark them appropriately
                        // The settlement system will handle marking them as settled
                    }
                } catch (error) {
                    logger.error('Failed to create ledger entries', error, {
                        roundId: currentRound.startTime,
                        operation: 'end-round',
                    });
                    // Fallback to old system
                    if ((!resolution || resolution.settleToday) && settledIRL) {
                        for (const [playerId, amount] of Object.entries(roundMRTZ)) {
                            if (amount !== 0) {
                                try {
                                    await updatePlayerMRTZ(playerId, amount);
                                } catch (err) {
                                    logger.error(`Failed to update MRTZ for player ${playerId}`, err, {
                                        playerId,
                                        amount,
                                        roundId: currentRound.startTime,
                                        operation: 'end-round-mrtz-update',
                                    });
                                }
                            }
                        }
                    }
                }

                // Handle carry-overs
                if (resolution?.action === 'exclude' || !resolution?.settleToday) {
                    await processRoundCarryOvers(
                        courseId,
                        playerIds,
                        currentRound.players[0]?.id || 'system',
                        activeBets,
                        skinsResults,
                        nassauResults
                    );
                } else {
                    // Carry over - store unresolved bets for future rounds
                    if (typeof window !== 'undefined') {
                        const carryOverBets = {
                            skins: resolution?.action === 'exclude' ? {} : skinsResults,
                            nassau: nassauResults,
                            timestamp: new Date().toISOString()
                        };
                        const existing = localStorage.getItem(STORAGE_KEYS.CARRY_OVER_BETS);
                        const carryOvers = existing ? JSON.parse(existing) : [];
                        carryOvers.push(carryOverBets);
                        localStorage.setItem(STORAGE_KEYS.CARRY_OVER_BETS, JSON.stringify(carryOvers));
                    }
                }


                // Clean up settlement info
                if (typeof window !== 'undefined') {
                    delete (window as any).__roundSettlement;
                }

                const firestoreRound = convertGameRoundToFirestore(
                    {
                        ...currentRound,
                        bets: {
                            skins: skinsResults,
                            nassau: nassauResults,
                            fundatory: fundatoryBets,
                            mrtzResults: roundMRTZ
                        }
                    },
                    courseId,
                    layoutId,
                    hasScoreData && Object.keys(currentRound.scores).length >= 18 ? 'completed' : 'partial'
                );

                // Add metadata for easier display
                const roundWithMetadata = {
                    ...firestoreRound,
                    courseName: course?.name || 'Unknown',
                    layoutName: layoutName,
                    playerNames: playerNames
                };

                // Save to cloud if there's score data
                if (hasScoreData) {
                    try {
                        const roundId = await saveRound(roundWithMetadata);
                        // Removed console.log'Round saved to Firebase:', roundId);

                        // Update friend activity for all registered players who are friends
                        try {
                            const registeredPlayers = currentRound.players.filter((p: Player) => p.userId);

                            // Update friend activity for each pair of registered players who are friends
                            for (let i = 0; i < registeredPlayers.length; i++) {
                                for (let j = i + 1; j < registeredPlayers.length; j++) {
                                    const player1 = registeredPlayers[i];
                                    const player2 = registeredPlayers[j];

                                    if (player1.userId && player2.userId) {
                                        // Check if they are friends
                                        const areFriendsCheck = await areFriends(player1.userId, player2.userId);
                                        if (areFriendsCheck) {
                                            // Update activity for both directions
                                            await updateFriendActivity(player1.userId, player2.userId, roundId);
                                        }
                                    }
                                }
                            }
                        } catch (friendError) {
                            // Don't fail the round if friend activity update fails
                            logger.error('Failed to update friend activity', friendError, {
                                roundId,
                                operation: 'update-friend-activity',
                            });
                        }
                    } catch (error) {
                        logger.error('Failed to save to Firebase, saving locally', error, {
                            courseId: course?.id,
                            layoutId: currentRound.course?.selectedLayoutKey,
                            hasScoreData,
                            playerCount: currentRound.players.length,
                            operation: 'end-round-save',
                        });
                        // Save locally as fallback
                        saveLocalRound({
                            id: `local_${Date.now()}`,
                            ...roundWithMetadata
                        });
                    }
                }

                // Store final round data inside try block where variables are in scope
                finalRoundData = {
                    ...currentRound,
                    bets: {
                        skins: skinsResults,
                        nassau: nassauResults,
                        fundatory: fundatoryBets,
                        mrtzResults: roundMRTZ
                    },
                    finalScores: Object.fromEntries(
                        currentRound.players.map((p: Player) => {
                            let total = 0;
                            for (let i = 1; i <= 18; i++) {
                                const score = currentRound.scores[i]?.[p.id];
                                if (score !== undefined && score !== null) {
                                    total += score;
                                }
                            }
                            return [p.id, total];
                        })
                    )
                };
            } catch (error) {
                logger.error('Failed to save round', error, {
                    courseId: currentRound.course?.id,
                    hasScoreData,
                    playerCount: currentRound.players.length,
                    operation: 'end-round',
                });
                // Still proceed to cache locally even if save fails
                // Create minimal finalRoundData if error occurred
                finalRoundData = {
                    ...currentRound,
                    bets: {
                        skins: {},
                        nassau: null,
                        fundatory: fundatoryBets,
                        mrtzResults: {}
                    }
                };
            }
        }

        // Save to cached rounds before clearing
        if (typeof window !== 'undefined' && currentRound) {
            const endedRound = {
                ...currentRound,
                status: ROUND_STATUS.ENDED,
                endTime: new Date().toISOString(),
                fundatoryBets,
                activeBets
            };

            // Add to cached rounds
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.CACHED_ROUNDS);
                const cachedRounds = cached ? JSON.parse(cached) : [];
                const holesPlayed = currentRound.scores ? Object.keys(currentRound.scores).length : 0;

                cachedRounds.push({
                    timestamp: new Date().toISOString(),
                    round: endedRound,
                    courseName: currentRound.course?.name || 'Unknown Course',
                    holesPlayed
                });

                // Keep only last 50 cached rounds
                const sorted = cachedRounds.sort((a: CachedRound, b: CachedRound) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                ).slice(0, 50);

                localStorage.setItem(STORAGE_KEYS.CACHED_ROUNDS, JSON.stringify(sorted));
            } catch (e) {
                logger.error('Failed to save to cached rounds', e, {
                    key: STORAGE_KEYS.CACHED_ROUNDS,
                    holesPlayed: currentRound.scores ? Object.keys(currentRound.scores).length : 0,
                    courseName: currentRound.course?.name,
                    operation: 'end-round-cache',
                });
            }

            // Also save as currentRound for "Continue Round" button (if recent)
            localStorage.setItem('currentRound', JSON.stringify(endedRound));
            localStorage.setItem(STORAGE_KEYS.FUNDATORY_BETS, JSON.stringify(fundatoryBets));
            localStorage.setItem(STORAGE_KEYS.ACTIVE_BETS, JSON.stringify(activeBets));
        }

        // Store final round data before clearing (fallback if try block didn't execute)
        if (!finalRoundData) {
            finalRoundData = {
                ...currentRound,
                bets: {
                    skins: {},
                    nassau: null,
                    fundatory: fundatoryBets,
                    mrtzResults: {}
                },
                finalScores: Object.fromEntries(
                    players.map((p: any) => {
                        let total = 0;
                        for (let i = 1; i <= 18; i++) {
                            const score = currentRound?.scores[i]?.[p.id];
                            if (score !== undefined && score !== null) {
                                total += score;
                            }
                        }
                        return [p.id, total];
                    })
                )
            };
        }

        // Clear active state (but data remains in localStorage)
        setCurrentRound(null);
        setFundatoryBets([]);
        clearBets();

        // Return final round data for summary display
        return finalRoundData;
    };

    const hasRecentRound = useCallback(() => {
        if (typeof window === 'undefined') return false;
        const savedRound = localStorage.getItem('currentRound');
        if (!savedRound) return false;
        try {
            const parsed = JSON.parse(savedRound);
            if ((parsed.status === ROUND_STATUS.ACTIVE || parsed.status === ROUND_STATUS.ENDED) && parsed.startTime) {
                const startTime = new Date(parsed.startTime);
                const now = new Date();
                const minutesSinceStart = (now.getTime() - startTime.getTime()) / (1000 * 60);
                return !isNaN(startTime.getTime()) && minutesSinceStart <= MAX_ROUND_AGE_MINUTES;
            }
        } catch (e) {
            return false;
        }
        return false;
    }, []);

    const restoreRecentRound = useCallback(() => {
        if (typeof window === 'undefined') return;
        const savedRound = localStorage.getItem('currentRound');
        if (savedRound) {
            try {
                const parsed = JSON.parse(savedRound);
                if ((parsed.status === ROUND_STATUS.ACTIVE || parsed.status === ROUND_STATUS.ENDED) && parsed.startTime) {
                    const startTime = new Date(parsed.startTime);
                    const now = new Date();
                    const minutesSinceStart = (now.getTime() - startTime.getTime()) / (1000 * 60);

                    if (!isNaN(startTime.getTime()) && minutesSinceStart <= MAX_ROUND_AGE_MINUTES) {
                        // Ensure all round properties are set
                        const restoredRound: GameRound = {
                            ...parsed,
                            status: ROUND_STATUS.ACTIVE,
                            activeHole: parsed.activeHole ?? 1,
                            teeOrder: parsed.teeOrder || (parsed.players ? parsed.players.map((p: Player) => p.id || (p as any).uid).filter(Boolean) : []),
                            currentTeeIndex: parsed.currentTeeIndex ?? 0
                        };
                        setCurrentRound(restoredRound);

                        if (parsed.fundatoryBets) {
                            setFundatoryBets(parsed.fundatoryBets);
                        }
                        const savedActiveBets = localStorage.getItem(STORAGE_KEYS.ACTIVE_BETS);
                        if (savedActiveBets) {
                            try {
                                setActiveBets(JSON.parse(savedActiveBets));
                            } catch (e) {
                                logger.error('Failed to load active bets', e, {
                                    key: STORAGE_KEYS.ACTIVE_BETS,
                                    operation: 'restore-recent-round',
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                logger.error('Failed to restore round', e, {
                    key: 'currentRound',
                    operation: 'restore-recent-round',
                });
            }
        }
    }, []);

    const addPlayerToRound = useCallback((player: Player) => {
        setCurrentRound((prev: GameRound | null) => {
            if (!prev) return prev;
            const exists = prev.players.some((p: Player) => p.id === player.id);
            if (exists) {
                logger.warn('Player already in round', {
                    playerId: player.id,
                    playerName: player.name,
                    roundId: prev.startTime,
                });
                return prev;
            }
            const updatedPlayers = [...prev.players, player];
            return {
                ...prev,
                players: updatedPlayers,
                teeOrder: player.id ? [...(prev.teeOrder || []), player.id] : prev.teeOrder
            };
        });
    }, []);

    const removePlayerFromRound = useCallback((playerId: string) => {
        setCurrentRound((prev: GameRound | null) => {
            if (!prev) return prev;
            const updatedPlayers = prev.players.filter((p: Player) => p.id !== playerId);
            return {
                ...prev,
                players: updatedPlayers,
                teeOrder: (prev.teeOrder || []).filter((id: string) => id !== playerId),
                scores: Object.entries(prev.scores || {}).reduce((acc, [hole, scores]: [string, { [pid: string]: number }]) => {
                    const { [playerId]: removed, ...rest } = scores;
                    acc[parseInt(hole)] = rest;
                    return acc;
                }, {} as { [holeNumber: number]: { [playerId: string]: number } })
            };
        });
    }, []);

    const getCachedRounds = useCallback((): Array<{ timestamp: string, round: GameRound, courseName: string, holesPlayed: number }> => {
        if (typeof window === 'undefined') return [];
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.CACHED_ROUNDS);
            if (!cached) return [];
            const cachedRounds = JSON.parse(cached);
            return cachedRounds.map((item: any) => ({
                timestamp: item.timestamp,
                round: item.round,
                courseName: item.courseName || 'Unknown Course',
                holesPlayed: item.holesPlayed || 0
            })).sort((a: any, b: any) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
        } catch (e) {
            logger.error('Failed to get cached rounds', e, {
                key: STORAGE_KEYS.CACHED_ROUNDS,
                operation: 'get-cached-rounds',
            });
            return [];
        }
    }, []);

    const restoreCachedRound = useCallback((timestamp: string) => {
        if (typeof window === 'undefined') return;
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.CACHED_ROUNDS);
            if (!cached) return;
            const cachedRounds = JSON.parse(cached);
            const roundData = cachedRounds.find((item: CachedRound) => item.timestamp === timestamp);
            if (roundData && roundData.round) {
                const parsed = roundData.round;
                const restoredRound: GameRound = {
                    ...parsed,
                    status: ROUND_STATUS.ACTIVE,
                    activeHole: parsed.activeHole ?? 1,
                    teeOrder: parsed.teeOrder || (parsed.players ? parsed.players.map((p: Player) => p.id || (p as any).uid).filter(Boolean) : []),
                    currentTeeIndex: parsed.currentTeeIndex ?? 0
                };
                setCurrentRound(restoredRound);

                if (parsed.fundatoryBets) {
                    setFundatoryBets(parsed.fundatoryBets);
                }
            }
        } catch (e) {
            logger.error('Failed to restore cached round', e, {
                timestamp,
                key: STORAGE_KEYS.CACHED_ROUNDS,
                operation: 'restore-cached-round',
            });
        }
    }, []);

    const updateCourseLayout = useCallback((layoutId: string, holePars: { [holeNumber: number]: number }, holeDistances?: { [holeNumber: number]: number }) => {
        setCurrentRound((prev: GameRound | null) => {
            if (!prev || !prev.course) return prev;
            const updatedCourse = { ...prev.course };
            if (!updatedCourse.layouts) updatedCourse.layouts = {};
            if (!updatedCourse.layouts[layoutId]) updatedCourse.layouts[layoutId] = { name: layoutId, holes: {}, parTotal: 0 };

            // Update pars
            Object.entries(holePars).forEach(([holeNum, par]) => {
                const holeNumber = parseInt(holeNum);
                if (!updatedCourse.layouts[layoutId].holes) updatedCourse.layouts[layoutId].holes = {};
                const existingHole = updatedCourse.layouts[layoutId].holes[holeNumber] || {};
                updatedCourse.layouts[layoutId].holes[holeNumber] = { ...existingHole, par };
            });

            // Update distances if provided
            if (holeDistances) {
                Object.entries(holeDistances).forEach(([holeNum, distance]) => {
                    const holeNumber = parseInt(holeNum);
                    if (!updatedCourse.layouts[layoutId].holes) updatedCourse.layouts[layoutId].holes = {};
                    const existingHole = updatedCourse.layouts[layoutId].holes[holeNumber] || {};
                    updatedCourse.layouts[layoutId].holes[holeNumber] = { ...existingHole, distance };
                });
            }

            // Recalculate total par
            let totalPar = 0;
            if (updatedCourse.layouts[layoutId].holes) {
                Object.values(updatedCourse.layouts[layoutId].holes).forEach(h => {
                    totalPar += h.par || 0;
                });
            }
            updatedCourse.layouts[layoutId].parTotal = totalPar;

            return {
                ...prev,
                course: updatedCourse
            };
        });
    }, []);

    // Live Round State & Sync
    const [liveMode, setLiveMode] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Sync Active Round from Firestore if liveMode is on
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const setupSubscription = async () => {
            if (liveMode && currentRound?.id && !currentRound.id.startsWith('local_')) {
                const { subscribeToRound } = await import('@/lib/rounds');
                unsubscribe = subscribeToRound(currentRound.id, (updatedRound) => {
                    // Merge remote updates into local state
                    setCurrentRound(prev => {
                        if (!prev) return null;
                        // Only merge specific fields, keep local players array intact
                        // updatedRound is a Firestore Round type, map to GameRound
                        const mappedStatus = updatedRound.status === 'completed' ? ROUND_STATUS.ENDED : updatedRound.status;
                        return {
                            ...prev,
                            scores: updatedRound.scores || prev.scores,
                            status: mappedStatus as 'active' | 'ended' | 'partial',
                            startTime: typeof updatedRound.date === 'string' ? updatedRound.date : prev.startTime
                        };
                    });
                });
            }
        };

        setupSubscription();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [liveMode, currentRound?.id]);

    const toggleLiveMode = async () => {
        if (!currentRound) return;

        const newMode = !liveMode;
        setLiveMode(newMode);

        if (newMode) {
            // Enabling Live Mode: Create active round in Firestore if it doesn't exist or is local
            if (!currentRound.id || currentRound.id.startsWith('local_') || currentRound.id.startsWith('temp_')) {
                try {
                    const { createActiveRound } = await import('@/lib/rounds');
                    // Prepare round data for cloud
                    // We need to be careful with types here
                    const roundData = {
                        courseId: currentRound.course?.id || currentRound.course?.name || 'unknown',
                        layoutId: currentRound.course?.selectedLayoutKey || 'default',
                        date: currentRound.startTime || new Date().toISOString(),
                        players: currentRound.players.map(p => p.id),
                        scores: currentRound.scores || {},
                        bets: {
                            skins: {},
                            nassau: null,
                            fundatory: fundatoryBets || [],
                            mrtzResults: {}
                        },
                        status: ROUND_STATUS.ACTIVE
                    };

                    const newId = await createActiveRound(roundData);
                    setCurrentRound(prev => prev ? { ...prev, id: newId } : null);
                } catch (e) {
                    logger.error('Failed to go live', e, {
                        courseId: currentRound.course?.id,
                        playerCount: currentRound.players.length,
                        operation: 'toggle-live-mode',
                    });
                    setLiveMode(false); // Revert
                }
            }
        }
    };

    // Achievement State
    const [achievement, setAchievement] = useState<{ type: AchievementType; details: string } | null>(null);
    const [roundAchievements, setRoundAchievements] = useState<Array<{ playerId: string; type: AchievementType; details: string }>>([]);

    // Clear achievements when starting a new round
    useEffect(() => {
        if (!currentRound) {
            setRoundAchievements([]);
        }
    }, [currentRound?.id]);

    const updateScore = useCallback((playerId: string, holeNumber: number, score: number) => {
        // 1. Optimistic Update
        setCurrentRound((prev: GameRound | null) => {
            if (!prev) {
                logger.warn('Cannot update score: no active round', {
                    playerId,
                    holeNumber,
                    score,
                });
                return prev;
            }
            const newScores = { ...prev.scores };
            if (!newScores[holeNumber]) {
                newScores[holeNumber] = {};
            }
            newScores[holeNumber][playerId] = score;
            return { ...prev, scores: newScores };
        });

        // 2. Remote Update (if Live)
        if (typeof window !== 'undefined' && currentRound && !currentRound.id?.startsWith('local_')) {
            // We can use the logic here if we assume ID is valid for remote
            // But we can't switch on liveMode variable easily inside this callback unless in deps
            // We'll trust the caller/setup or implement explicit firestore update here later if needed
            // For now, the sync is ONE-WAY (read), we need WRITE too.
            // We will implement write in a separate effect or here.

            // Dynamic import to avoid cycles/closure issues if possible, 
            // but we really should just call updateActiveRound
            import('@/lib/rounds').then(({ updateActiveRound }) => {
                // We need to know if we are in live mode.
                // Ideally we check if currentRound.id is a Firestore ID (no 'local_')
                if (currentRound.id && !currentRound.id.startsWith('local_')) {
                    const updateKey = `scores.${holeNumber}.${playerId}`;
                    updateActiveRound(currentRound.id, {
                        [updateKey]: score
                    } as any).catch(e => {
                        logger.error('Failed to sync score to Firestore', e, {
                            roundId: currentRound.id,
                            playerId,
                            holeNumber,
                            score,
                            operation: 'update-score-sync',
                        });
                    });
                }
            });
        }

        // Check for achievements
        if (currentRound?.course?.id && currentRound?.course?.selectedLayoutKey) {
            const layout = currentRound.course.layouts?.[currentRound.course.selectedLayoutKey];
            const par = layout?.holes?.[holeNumber]?.par || 3;

            import('@/lib/stats').then(({ checkHoleAchievements }) => {
                checkHoleAchievements(
                    playerId,
                    currentRound.course!.id,
                    currentRound.course!.selectedLayoutKey!,
                    holeNumber,
                    score,
                    par
                ).then(result => {
                    if (result.type !== 'NONE') {
                        const details = result.details || '';
                        setAchievement({ type: result.type, details });

                        // Add to history for end of round summary
                        setRoundAchievements(prev => {
                            const exists = prev.some(a => a.details === details && a.playerId === playerId);
                            if (!exists) {
                                return [...prev, { playerId, type: result.type, details }];
                            }
                            return prev;
                        });
                    }
                });
            });
        }
    }, [currentRound?.course, currentRound?.id]);

    const clearAchievement = () => setAchievement(null);

    // MRTZ Ledger functions implementation
    const getPlayerMRTZBalance = async (playerId: string): Promise<PlayerMRTZSummary | null> => {
        try {
            const { getPlayerMRTZSummary: getSummary } = await import('@/lib/mrtzLedger');
            const summary = await getSummary(playerId);
            if (!summary) {
                return {
                    playerId,
                    playerName: 'Unknown',
                    currentBalance: 0,
                    pendingIn: 0,
                    pendingOut: 0,
                    netBalance: 0,
                    totalWon: 0,
                    totalLost: 0,
                    totalSettled: 0,
                    transactionCount: 0
                };
            }
            return summary;
        } catch (e) {
            logger.error('Failed to load MRTZ balance', e, {
                playerId,
                operation: 'get-player-mrtz-balance',
            });
            return null;
        }
    };

    const getPlayerLedger = async (playerId: string, options?: LedgerOptions): Promise<MRTZLedgerEntry[]> => {
        try {
            const { getPlayerLedger: getLedger } = await import('@/lib/mrtzLedger');
            return getLedger(playerId, options);
        } catch (e) {
            logger.error('Failed to load player ledger', e, {
                playerId,
                options,
                operation: 'get-player-ledger',
            });
            return [];
        }
    };

    const getOutstandingBalances = async (playerId: string): Promise<{ owedToMe: OutstandingBalance[]; iOwe: OutstandingBalance[] }> => {
        try {
            const { getOutstandingBalances: getBalances } = await import('@/lib/mrtzLedger');
            return getBalances(playerId);
        } catch (e) {
            logger.error('Failed to load outstanding balances', e, {
                playerId,
                operation: 'get-outstanding-balances',
            });
            return { owedToMe: [], iOwe: [] };
        }
    };

    const contextValue: GameContextType = {
        currentRound,
        players,
        course,
        activeHole,
        teeOrder,
        currentTeeIndex,
        startRound,
        updateScore,
        setActiveHole,
        nextTee,
        setTeeOrder,
        fundatoryBets,
        addFundatoryBet,
        updateFundatoryBet,
        activeBets,
        startSkins,
        startNassau,
        clearBets,
        endRound: async () => {
            return endRound();
        },
        isLoading,
        updateCourseLayout,
        hasRecentRound,
        restoreRecentRound,
        addPlayerToRound,
        removePlayerFromRound,
        getCachedRounds,
        restoreCachedRound,
        getPlayerMRTZBalance,
        getPlayerLedger,
        getOutstandingBalances,
        achievement,
        clearAchievement,
        roundAchievements,
        liveMode,
        toggleLiveMode,
        roundId: currentRound?.id || null,
        loadRound: useCallback((round: GameRound) => {
            setCurrentRound(round);
            // If it's a remote round, enable live mode automatically
            if (round.id && !round.id.startsWith('local_') && !round.id.startsWith('temp_')) {
                setLiveMode(true);
            }
        }, [])
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}
