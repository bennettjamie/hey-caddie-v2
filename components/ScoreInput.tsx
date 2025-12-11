'use client';

import React, { useState } from 'react';
import ScoreButton from './ui/ScoreButton';

interface ScoreInputProps {
    players: Array<{ id: string; name: string }>;
    par: number;
    onScoreSelect: (playerId: string, score: number) => void;
    currentScores?: { [playerId: string]: number };
}

const SCORE_OPTIONS = [
    { label: 'Ace', score: -2, variant: 'success' as const },
    { label: 'Eagle', score: -2, variant: 'success' as const },
    { label: 'Birdie', score: -1, variant: 'success' as const },
    { label: 'Par', score: 0, variant: 'primary' as const },
    { label: 'Bogey', score: 1, variant: 'warning' as const },
    { label: 'Double', score: 2, variant: 'danger' as const },
    { label: 'Triple', score: 3, variant: 'danger' as const }
];

export default function ScoreInput({
    players,
    par,
    onScoreSelect,
    currentScores = {}
}: ScoreInputProps) {
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

    const handleScoreClick = (score: number) => {
        if (selectedPlayer) {
            onScoreSelect(selectedPlayer, score);
            // Auto-advance to next player or clear selection
            const currentIndex = players.findIndex((p) => p.id === selectedPlayer);
            if (currentIndex < players.length - 1) {
                setSelectedPlayer(players[currentIndex + 1].id);
            } else {
                setSelectedPlayer(null);
            }
        }
    };

    return (
        <div style={{ marginTop: '1rem' }}>
            <div className="card" style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Select Player</h3>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: '0.5rem'
                    }}
                >
                    {players.map((player) => {
                        const isSelected = selectedPlayer === player.id;
                        const hasScore = currentScores[player.id] !== undefined;
                        return (
                            <button
                                key={player.id}
                                onClick={() => setSelectedPlayer(player.id)}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: `2px solid ${isSelected ? '#3498db' : hasScore ? '#2ecc71' : '#ddd'}`,
                                    backgroundColor: isSelected
                                        ? '#3498db'
                                        : hasScore
                                            ? 'rgba(46, 204, 113, 0.1)'
                                            : 'white',
                                    color: isSelected ? 'white' : 'inherit',
                                    fontWeight: isSelected ? 600 : 400,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {player.name}
                                {hasScore && (
                                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>
                                        {currentScores[player.id] === 0
                                            ? 'E'
                                            : currentScores[player.id]! > 0
                                                ? `+${currentScores[player.id]}`
                                                : currentScores[player.id]}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {selectedPlayer && (
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>
                        Score for {players.find((p) => p.id === selectedPlayer)?.name}
                    </h3>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                            gap: '0.75rem'
                        }}
                    >
                        {SCORE_OPTIONS.map((option) => (
                            <ScoreButton
                                key={option.label}
                                label={option.label}
                                score={option.score}
                                onClick={() => handleScoreClick(option.score)}
                                variant={option.variant}
                                size="large"
                            />
                        ))}
                    </div>
                    <button
                        className="btn"
                        onClick={() => setSelectedPlayer(null)}
                        style={{
                            marginTop: '1rem',
                            width: '100%',
                            backgroundColor: '#95a5a6'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}

