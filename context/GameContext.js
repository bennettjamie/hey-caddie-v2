'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const GameContext = createContext();

export function GameProvider({ children }) {
    const [currentRound, setCurrentRound] = useState(null);
    const [players, setPlayers] = useState([]);
    const [course, setCourse] = useState(null);
    const [activeHole, setActiveHole] = useState(1);

    // Load from local storage on mount (Offline persistence)
    useEffect(() => {
        const savedRound = localStorage.getItem('currentRound');
        if (savedRound) {
            setCurrentRound(JSON.parse(savedRound));
        }
    }, []);

    // Save to local storage whenever state changes
    useEffect(() => {
        if (currentRound) {
            localStorage.setItem('currentRound', JSON.stringify(currentRound));
        }
    }, [currentRound]);

    const startRound = (selectedCourse, selectedPlayers) => {
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
        setActiveHole(1);
    };

    const updateScore = (playerId, holeNumber, score) => {
        setCurrentRound(prev => {
            const newScores = { ...prev.scores };
            if (!newScores[holeNumber]) newScores[holeNumber] = {};
            newScores[holeNumber][playerId] = score;
            return { ...prev, scores: newScores };
        });
    };

    return (
        <GameContext.Provider value={{ currentRound, players, course, activeHole, startRound, updateScore }}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    return useContext(GameContext);
}
