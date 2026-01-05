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

// Only restore rounds that started within the last 30 minutes
const MAX_ROUND_AGE_MINUTES = 30;

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
    updateCourseLayout: (layoutId: string, holePars: { [holeNumber: number]: number }) => void;
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

            // EXPLICITLY clear all state first - NEVER auto-restore
            setCurrentRound(null);
            setFundatoryBets([]);
            setActiveBets({});

            // Handle localStorage cleanup only (never restore from here)
            const savedRound = localStorage.getItem('currentRound');
            if (savedRound) {
                try {
                    const parsed = JSON.parse(savedRound);
                    if (parsed.status === 'active' || parsed.status === 'ended' || !parsed.status) {
                        // Check if round is stale and needs cleanup
                        const startTime = parsed.startTime ? new Date(parsed.startTime) : null;
                        const now = new Date();
                        const minutesSinceStart = startTime && !isNaN(startTime.getTime())
                            ? (now.getTime() - startTime.getTime()) / (1000 * 60)
                            : Infinity;

                        // Only clean up stale rounds, never restore
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
                                        console.error('Error saving partial round:', error);
                                        // Still clear even if save fails
                                    }
                                })();
                            }

                            // Removed console.log`Clearing stale active round from localStorage (${ageDescription})`);
                            localStorage.removeItem('currentRound');
                            localStorage.removeItem('fundatoryBets');
                            localStorage.removeItem('activeBets');
                        } else {
                            // Recent round exists but we DON'T auto-restore
                            // It will be available via "Continue Round" or cached rounds
                            // Removed console.log'Recent round found in localStorage but not auto-restoring. Use "Continue Round" button.');
                        }
                    }
                } catch (e) {
                    console.error('Error loading saved round:', e);
                    // Clear corrupted data
                    localStorage.removeItem('currentRound');
                }
            }

            // Don't restore bets either - they should only exist with an active round
            setIsLoading(false);
        }
    }, []);

    // Save to local storage whenever state changes (only for active rounds)
    useEffect(() => {
        if (typeof window !== 'undefined' && currentRound && currentRound.status === 'active') {
            localStorage.setItem('currentRound', JSON.stringify(currentRound));
        }
    }, [currentRound]);

    // Save fundatory bets to local storage
    useEffect(() => {
        if (typeof window !== 'undefined' && fundatoryBets.length >= 0) {
            localStorage.setItem('fundatoryBets', JSON.stringify(fundatoryBets));
        }
    }, [fundatoryBets]);

    // Save active bets to local storage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('activeBets', JSON.stringify(activeBets));
        }
    }, [activeBets]);

    const startRound = (selectedCourse: Course, selectedPlayers: Player[]) => {
        // Initialize tee order with player IDs (default order)
        const playerIds = selectedPlayers.map((p: Player) => p.id).filter(Boolean);
        if (playerIds.length === 0) {
            console.error('No valid player IDs found when starting round');
            return;
        }

        const newRound: GameRound = {
            course: selectedCourse,
            players: selectedPlayers,
            scores: {}, // { holeNumber: { playerId: score } }
            startTime: new Date().toISOString(),
            status: 'active',
            activeHole: 1,
            teeOrder: playerIds,
            currentTeeIndex: 0
        };
        setCurrentRound(newRound);
    };

    const updateScore = useCallback((playerId: string, holeNumber: number, score: number) => {
        setCurrentRound((prev: GameRound | null) => {
            if (!prev) {
                console.warn('Cannot update score: no active round');
                return prev;
            }
            const newScores = { ...prev.scores };
            if (!newScores[holeNumber]) {
                newScores[holeNumber] = {};
            }
            newScores[holeNumber][playerId] = score;
            return { ...prev, scores: newScores };
        });
    }, []);

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
            console.warn('setTeeOrder called with non-array:', order);
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
                    console.error('Error creating ledger entries:', error);
                    // Fallback to old system
                    if ((!resolution || resolution.settleToday) && settledIRL) {
                        for (const [playerId, amount] of Object.entries(roundMRTZ)) {
                            if (amount !== 0) {
                                try {
                                    await updatePlayerMRTZ(playerId, amount);
                                } catch (err) {
                                    console.error(`Error updating MRTZ for player ${playerId}:`, err);
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
                        const existing = localStorage.getItem('carryOverBets');
                        const carryOvers = existing ? JSON.parse(existing) : [];
                        carryOvers.push(carryOverBets);
                        localStorage.setItem('carryOverBets', JSON.stringify(carryOvers));
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
                    } catch (error) {
                        console.error('Failed to save to Firebase, saving locally:', error);
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
                console.error('Error saving round:', error);
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
                status: 'ended',
                endTime: new Date().toISOString(),
                fundatoryBets,
                activeBets
            };

            // Add to cached rounds
            try {
                const cached = localStorage.getItem('cachedRounds');
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

                localStorage.setItem('cachedRounds', JSON.stringify(sorted));
            } catch (e) {
                console.error('Error saving to cached rounds:', e);
            }

            // Also save as currentRound for "Continue Round" button (if recent)
            localStorage.setItem('currentRound', JSON.stringify(endedRound));
            localStorage.setItem('fundatoryBets', JSON.stringify(fundatoryBets));
            localStorage.setItem('activeBets', JSON.stringify(activeBets));
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
            if ((parsed.status === 'active' || parsed.status === 'ended') && parsed.startTime) {
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
                if ((parsed.status === 'active' || parsed.status === 'ended') && parsed.startTime) {
                    const startTime = new Date(parsed.startTime);
                    const now = new Date();
                    const minutesSinceStart = (now.getTime() - startTime.getTime()) / (1000 * 60);

                    if (!isNaN(startTime.getTime()) && minutesSinceStart <= MAX_ROUND_AGE_MINUTES) {
                        // Ensure all round properties are set
                        const restoredRound: GameRound = {
                            ...parsed,
                            status: 'active',
                            activeHole: parsed.activeHole ?? 1,
                            teeOrder: parsed.teeOrder || (parsed.players ? parsed.players.map((p: Player) => p.id || (p as any).uid).filter(Boolean) : []),
                            currentTeeIndex: parsed.currentTeeIndex ?? 0
                        };
                        setCurrentRound(restoredRound);

                        if (parsed.fundatoryBets) {
                            setFundatoryBets(parsed.fundatoryBets);
                        }
                        const savedActiveBets = localStorage.getItem('activeBets');
                        if (savedActiveBets) {
                            try {
                                setActiveBets(JSON.parse(savedActiveBets));
                            } catch (e) {
                                console.error('Error loading active bets:', e);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Error restoring round:', e);
            }
        }
    }, []);

    const addPlayerToRound = useCallback((player: Player) => {
        setCurrentRound((prev: GameRound | null) => {
            if (!prev) return prev;
            const exists = prev.players.some((p: Player) => p.id === player.id);
            if (exists) {
                console.warn('Player already in round');
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
            const cached = localStorage.getItem('cachedRounds');
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
            console.error('Error getting cached rounds:', e);
            return [];
        }
    }, []);

    const restoreCachedRound = useCallback((timestamp: string) => {
        if (typeof window === 'undefined') return;
        try {
            const cached = localStorage.getItem('cachedRounds');
            if (!cached) return;
            const cachedRounds = JSON.parse(cached);
            const roundData = cachedRounds.find((item: CachedRound) => item.timestamp === timestamp);
            if (roundData && roundData.round) {
                const parsed = roundData.round;
                const restoredRound: GameRound = {
                    ...parsed,
                    status: 'active',
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
            console.error('Error restoring cached round:', e);
        }
    }, []);

    const updateCourseLayout = useCallback((layoutId: string, holePars: { [holeNumber: number]: number }) => {
        setCurrentRound((prev: GameRound | null) => {
            if (!prev || !prev.course) return prev;
            const updatedCourse = { ...prev.course };
            if (!updatedCourse.layouts) updatedCourse.layouts = {};
            if (!updatedCourse.layouts[layoutId]) updatedCourse.layouts[layoutId] = { name: layoutId, holes: {}, parTotal: 0 };

            Object.entries(holePars).forEach(([holeNum, par]) => {
                const holeNumber = parseInt(holeNum);
                if (!updatedCourse.layouts[layoutId].holes) updatedCourse.layouts[layoutId].holes = {};
                // Preserve existing hole info if any
                const existingHole = updatedCourse.layouts[layoutId].holes[holeNumber] || {};
                updatedCourse.layouts[layoutId].holes[holeNumber] = { ...existingHole, par };
            });

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

    const contextValue = {
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
        endRound,
        isLoading,
        updateCourseLayout,
        hasRecentRound,
        restoreRecentRound,
        addPlayerToRound,
        removePlayerFromRound,
        getCachedRounds,
        restoreCachedRound,
        // MRTZ Ledger functions
        getPlayerMRTZBalance: async (playerId: string): Promise<PlayerMRTZSummary> => {
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
        },
        getPlayerLedger: async (playerId: string, options?: LedgerOptions): Promise<MRTZLedgerEntry[]> => {
            const { getPlayerLedger: getLedger } = await import('@/lib/mrtzLedger');
            return getLedger(playerId, options);
        },
        getOutstandingBalances: async (playerId: string): Promise<{ owedToMe: OutstandingBalance[]; iOwe: OutstandingBalance[] }> => {
            const { getOutstandingBalances: getBalances } = await import('@/lib/mrtzLedger');
            return getBalances(playerId);
        }
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
