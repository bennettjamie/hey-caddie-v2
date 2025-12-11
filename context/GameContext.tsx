'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FundatoryBet } from '@/lib/betting';
import { saveRound, convertGameRoundToFirestore, saveLocalRound } from '@/lib/rounds';

interface GameContextType {
    currentRound: any;
    players: any[];
    course: any;
    activeHole: number;
    teeOrder: string[]; // Array of player IDs in tee order
    currentTeeIndex: number; // Index of current player in tee order
    startRound: (selectedCourse: any, selectedPlayers: any[]) => void;
    updateScore: (playerId: string, holeNumber: number, score: number) => void;
    setActiveHole: (hole: number) => void;
    nextTee: () => void; // Move to next player in tee order
    setTeeOrder: (order: string[]) => void; // Set custom tee order
    fundatoryBets: FundatoryBet[];
    addFundatoryBet: (bet: FundatoryBet) => void;
    updateFundatoryBet: (betId: string, status: 'success' | 'fail') => void;
    endRound: () => void;
    isLoading: boolean;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
    const [currentRound, setCurrentRound] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [course, setCourse] = useState<any>(null);
    const [activeHole, setActiveHoleState] = useState(1);
    const [teeOrder, setTeeOrderState] = useState<string[]>([]);
    const [currentTeeIndex, setCurrentTeeIndex] = useState(0);
    const [fundatoryBets, setFundatoryBets] = useState<FundatoryBet[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load from local storage on mount (Offline persistence)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsLoading(true);
            const savedRound = localStorage.getItem('currentRound');
            if (savedRound) {
                try {
                    const parsed = JSON.parse(savedRound);
                    if (parsed.status === 'active') { // Only restore if active
                        setCurrentRound(parsed);
                        setPlayers(parsed.players || []);
                        setCourse(parsed.course || null);
                        if (parsed.activeHole) {
                            setActiveHoleState(parsed.activeHole);
                        }
                    }
                } catch (e) {
                    console.error('Error loading saved round:', e);
                }
            }
            const savedBets = localStorage.getItem('fundatoryBets');
            if (savedBets) {
                try {
                    setFundatoryBets(JSON.parse(savedBets));
                } catch (e) {
                    console.error('Error loading saved bets:', e);
                }
            }
            setIsLoading(false);
        }
    }, []);

    // Save to local storage whenever state changes
    useEffect(() => {
        if (typeof window !== 'undefined' && currentRound) {
            const toSave = {
                ...currentRound,
                activeHole
            };
            localStorage.setItem('currentRound', JSON.stringify(toSave));
        }
    }, [currentRound, activeHole]);

    // Save fundatory bets to local storage
    useEffect(() => {
        if (typeof window !== 'undefined' && fundatoryBets.length >= 0) {
            localStorage.setItem('fundatoryBets', JSON.stringify(fundatoryBets));
        }
    }, [fundatoryBets]);

    const startRound = (selectedCourse: any, selectedPlayers: any[]) => {
        const newRound = {
            course: selectedCourse,
            players: selectedPlayers,
            scores: {}, // { holeNumber: { playerId: score } }
            startTime: new Date().toISOString(),
            status: 'active'
        };
        setCurrentRound(newRound);
        setCourse(selectedCourse);
        setPlayers(selectedPlayers);
        setActiveHoleState(1);
        // Initialize tee order with player IDs (default order)
        const playerIds = selectedPlayers.map((p: any) => p.id);
        setTeeOrderState(playerIds);
        setCurrentTeeIndex(0);
    };

    const updateScore = (playerId: string, holeNumber: number, score: number) => {
        setCurrentRound((prev: any) => {
            if (!prev) return prev;
            const newScores = { ...prev.scores };
            if (!newScores[holeNumber]) newScores[holeNumber] = {};
            newScores[holeNumber][playerId] = score;
            return { ...prev, scores: newScores };
        });
    };

    const setActiveHole = (hole: number) => {
        setActiveHoleState(hole);
        // Reset tee order to first player when moving to new hole
        setCurrentTeeIndex(0);
    };

    const nextTee = () => {
        if (teeOrder.length === 0) return;
        setCurrentTeeIndex((prev) => (prev + 1) % teeOrder.length);
    };

    const setTeeOrder = (order: string[]) => {
        setTeeOrderState(order);
        setCurrentTeeIndex(0); // Reset to first player
    };

    const addFundatoryBet = (bet: FundatoryBet) => {
        setFundatoryBets((prev) => [...prev, bet]);
    };

    const updateFundatoryBet = (betId: string, status: 'success' | 'fail') => {
        setFundatoryBets((prev) =>
            prev.map((bet) => (bet.id === betId ? { ...bet, status } : bet))
        );
    };

    const endRound = async () => {
        if (currentRound && course) {
            try {
                // Convert to Firestore format
                const layoutId = currentRound.course?.selectedLayoutKey || 'default';
                const courseId = course.id || course.name; // Fallback to name if no ID
                const layoutName = course.layouts?.[layoutId]?.name || 'Main';
                
                // Create player names map for denormalization
                const playerNames: { [key: string]: string } = {};
                players.forEach((p: any) => {
                    playerNames[p.id] = p.name;
                });
                
                const firestoreRound = convertGameRoundToFirestore(
                    {
                        ...currentRound,
                        bets: {
                            skins: {},
                            nassau: null,
                            fundatory: fundatoryBets
                        }
                    },
                    courseId,
                    layoutId
                );
                
                // Add metadata for easier display
                const roundWithMetadata = {
                    ...firestoreRound,
                    courseName: course.name,
                    layoutName: layoutName,
                    playerNames: playerNames
                };
                
                // Try to save to Firebase
                try {
                    const roundId = await saveRound(roundWithMetadata);
                    console.log('Round saved to Firebase:', roundId);
                } catch (error) {
                    console.error('Failed to save to Firebase, saving locally:', error);
                    // Save locally as fallback
                    saveLocalRound({
                        id: `local_${Date.now()}`,
                        ...roundWithMetadata
                    });
                }
            } catch (error) {
                console.error('Error saving round:', error);
                // Still clear the round even if save fails
            }
        }
        
        // Clear state
        setCurrentRound(null);
        setPlayers([]);
        setCourse(null);
        setActiveHoleState(1);
        setTeeOrderState([]);
        setCurrentTeeIndex(0);
        setFundatoryBets([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('currentRound');
            localStorage.removeItem('fundatoryBets');
        }
    };

    return (
        <GameContext.Provider
            value={{
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
                endRound,
                isLoading
            }}
        >
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
