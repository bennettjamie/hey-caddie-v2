'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';

interface RoundReviewModalProps {
    onClose: () => void;
    onConfirm: () => void;
    onEdit: () => void;
}

export default function RoundReviewModal({ onClose, onConfirm, onEdit }: RoundReviewModalProps) {
    const { currentRound, course, updateScore } = useGame();
    const [editableScores, setEditableScores] = useState<{ [playerId: string]: { [holeNum: number]: number | null } }>({});

    if (!currentRound || !course) return null;

    const holes = Array.from({ length: 18 }, (_, i) => i + 1);
    const layoutKey = currentRound.course?.selectedLayoutKey || 'default';
    
    // Calculate totals for each player (using editable scores if available)
    const playerTotals: { [playerId: string]: { name: string; total: number; holes: number } } = {};
    currentRound.players.forEach((player: any) => {
        let total = 0;
        let holesCount = 0;
        holes.forEach(holeNum => {
            const score = getEditableScore(player.id, holeNum);
            if (score !== undefined && score !== null) {
                total += score;
                holesCount++;
            }
        });
        playerTotals[player.id] = {
            name: player.name,
            total,
            holes: holesCount
        };
    });

    const getScoreDisplay = (score: number | null | undefined): string => {
        if (score === null || score === undefined) return '-';
        if (score === 0) return 'E';
        if (score < 0) return `${Math.abs(score)}`;
        return `+${score}`;
    };

    const getScoreColor = (score: number | null | undefined): string => {
        if (score === null || score === undefined) return 'var(--text-light)';
        if (score < 0) return 'var(--success)';
        if (score === 0) return 'var(--info)';
        return 'var(--danger)';
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                padding: '0.5rem'
            }}
            onClick={onClose}
        >
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '100%',
                    maxHeight: '95vh',
                    overflowY: 'auto',
                    backgroundColor: '#1e1e1e',
                    padding: '1rem'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'sticky', top: 0, backgroundColor: '#1e1e1e', paddingBottom: '1rem', zIndex: 10 }}>
                    <h2 style={{ fontSize: '1.5rem' }}>Review Round Scores</h2>
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--danger)',
                            minHeight: 'auto'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Course Info */}
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                        <strong>Course:</strong> {course.name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '1rem' }}>
                        <strong>Layout:</strong> {currentRound.course?.selectedLayout || 'Main'}
                    </div>
                </div>

                {/* Scrollable Table */}
                <div style={{ 
                    overflowX: 'auto',
                    marginBottom: '1.5rem',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.875rem',
                        minWidth: '600px'
                    }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1e1e1e', zIndex: 5 }}>
                            <tr>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'left',
                                    borderBottom: '2px solid var(--border)',
                                    fontWeight: 'bold',
                                    position: 'sticky',
                                    left: 0,
                                    backgroundColor: '#1e1e1e',
                                    zIndex: 6
                                }}>
                                    Player
                                </th>
                                {holes.map(holeNum => (
                                    <th
                                        key={holeNum}
                                        style={{
                                            padding: '0.5rem',
                                            textAlign: 'center',
                                            borderBottom: '2px solid var(--border)',
                                            fontWeight: 'bold',
                                            minWidth: '50px'
                                        }}
                                    >
                                        {holeNum}
                                    </th>
                                ))}
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    borderBottom: '2px solid var(--border)',
                                    fontWeight: 'bold',
                                    backgroundColor: 'rgba(0, 242, 96, 0.1)'
                                }}>
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRound.players.map((player: any) => {
                                const total = playerTotals[player.id]?.total || 0;
                                return (
                                    <tr key={player.id}>
                                        <td style={{
                                            padding: '0.75rem',
                                            borderBottom: '1px solid var(--border)',
                                            fontWeight: 600,
                                            position: 'sticky',
                                            left: 0,
                                            backgroundColor: '#1e1e1e',
                                            zIndex: 4
                                        }}>
                                            {player.name}
                                        </td>
                                        {holes.map(holeNum => {
                                            const score = currentRound.scores[holeNum]?.[player.id];
                                            const par = course.layouts?.[layoutKey]?.holes?.[holeNum]?.par || 3;
                                            return (
                                                <td
                                                    key={holeNum}
                                                    style={{
                                                        padding: '0.5rem',
                                                        textAlign: 'center',
                                                        borderBottom: '1px solid var(--border)',
                                                        color: getScoreColor(score),
                                                        fontWeight: score !== null && score !== undefined ? 600 : 400
                                                    }}
                                                >
                                                    {score !== null && score !== undefined
                                                        ? `${par + score}`
                                                        : '-'}
                                                </td>
                                            );
                                        })}
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderBottom: '1px solid var(--border)',
                                            color: getScoreColor(total),
                                            fontWeight: 'bold',
                                            fontSize: '1rem',
                                            backgroundColor: 'rgba(0, 242, 96, 0.05)'
                                        }}>
                                            {getScoreDisplay(total)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Summary */}
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(0, 242, 96, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    border: '1px solid var(--primary)'
                }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                        Leaderboard:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {currentRound.players
                            .map((p: any) => ({
                                player: p,
                                total: playerTotals[p.id]?.total || 0
                            }))
                            .sort((a, b) => a.total - b.total)
                            .map((entry, index) => (
                                <div
                                    key={entry.player.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.5rem',
                                        backgroundColor: index === 0 ? 'rgba(46, 204, 113, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                                        borderRadius: '6px'
                                    }}
                                >
                                    <span style={{ fontWeight: 600 }}>
                                        {index + 1}. {entry.player.name}
                                    </span>
                                    <span style={{
                                        color: getScoreColor(entry.total),
                                        fontWeight: 'bold'
                                    }}>
                                        {getScoreDisplay(entry.total)}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.keys(editableScores).length > 0 && (
                        <button
                            className="btn"
                            onClick={() => {
                                handleSaveEdits();
                                setEditableScores({});
                            }}
                            style={{
                                width: '100%',
                                backgroundColor: 'var(--info)',
                                padding: '1rem',
                                fontSize: '1.125rem',
                                fontWeight: 600,
                                minHeight: '60px'
                            }}
                        >
                            💾 Save Edits
                        </button>
                    )}
                    <button
                        className="btn"
                        onClick={() => {
                            if (Object.keys(editableScores).length > 0) {
                                handleSaveEdits();
                            }
                            onConfirm();
                        }}
                        style={{
                            width: '100%',
                            backgroundColor: 'var(--success)',
                            padding: '1rem',
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            minHeight: '60px'
                        }}
                    >
                        ✓ Finish Round and Save
                    </button>
                </div>
            </div>
        </div>
    );
}

