'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';

export default function Leaderboard() {
    const { currentRound } = useGame();

    if (!currentRound || !currentRound.players) {
        return null;
    }

    const players = currentRound.players;
    const scores = currentRound.scores || {};

    // Calculate total scores for each player
    const playerTotals: { [key: string]: { total: number; holesPlayed: number } } = {};

    players.forEach((player: any) => {
        playerTotals[player.id] = { total: 0, holesPlayed: 0 };
        Object.keys(scores).forEach((holeNum) => {
            const holeScores = scores[holeNum];
            if (holeScores && holeScores[player.id] !== undefined) {
                playerTotals[player.id].total += holeScores[player.id];
                playerTotals[player.id].holesPlayed++;
            }
        });
    });

    // Sort players by score (lower is better)
    const sortedPlayers = [...players].sort((a: any, b: any) => {
        return playerTotals[a.id].total - playerTotals[b.id].total;
    });

    if (sortedPlayers.length === 0) {
        return (
            <div className="card">
                <p>No players in the current round.</p>
            </div>
        );
    }

    const getPositionColor = (position: number) => {
        if (position === 0) return '#f1c40f'; // Gold
        if (position === 1) return '#95a5a6'; // Silver
        if (position === 2) return '#cd7f32'; // Bronze
        return 'var(--border)';
    };

    const formatScore = (score: number) => {
        if (score === 0) return 'E';
        return score < 0 ? score.toString() : `+${score}`;
    };

    return (
        <div className="card">
            <h2>Leaderboard</h2>
            <div style={{ marginTop: '1rem' }}>
                {sortedPlayers.map((player: any, index: number) => {
                    const stats = playerTotals[player.id];
                    const isLeading = index === 0;
                    
                    return (
                        <div
                            key={player.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                marginBottom: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: isLeading ? 'rgba(241, 196, 15, 0.1)' : 'transparent',
                                border: `2px solid ${getPositionColor(index)}`
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: getPositionColor(index),
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {index + 1}
                                </div>
                                <div>
                                    <div style={{ fontWeight: isLeading ? 600 : 400, fontSize: '1rem' }}>
                                        {player.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                        {stats.holesPlayed} {stats.holesPlayed === 1 ? 'hole' : 'holes'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div
                                    style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        color: stats.total < 0 ? 'var(--success)' : stats.total > 0 ? 'var(--danger)' : 'var(--text)'
                                    }}
                                >
                                    {formatScore(stats.total)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                    {stats.total === 0
                                        ? 'Even par'
                                        : stats.total < 0
                                            ? `${Math.abs(stats.total)} under`
                                            : `${stats.total} over`}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

