'use client';

import { useGame } from '@/context/GameContext';

interface EndRoundConfirmModalProps {
    onClose: () => void;
    onConfirm: () => void;
}

export default function EndRoundConfirmModal({ onClose, onConfirm }: EndRoundConfirmModalProps) {
    const { currentRound, activeHole } = useGame();

    if (!currentRound) return null;

    // Calculate round summary
    const holesPlayed = Object.keys(currentRound.scores || {}).length;
    const totalHoles = 18;
    const players = currentRound.players || [];

    // Calculate total scores for each player
    const playerTotals: { [playerId: string]: { name: string; total: number; holes: number } } = {};
    players.forEach((player: any) => {
        let total = 0;
        let holesCount = 0;
        Object.entries(currentRound.scores || {}).forEach(([holeNum, scores]: [string, any]) => {
            if (scores[player.id] !== undefined && scores[player.id] !== null) {
                const layoutKey = currentRound.course.selectedLayoutKey || 'default';
                const par = currentRound.course.layouts?.[layoutKey]?.holes?.[parseInt(holeNum)]?.par || 3;
                const relativeScore = scores[player.id];
                total += relativeScore;
                holesCount++;
            }
        });
        playerTotals[player.id] = {
            name: player.name,
            total,
            holes: holesCount
        };
    });

    const hasScoreData = holesPlayed > 0;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    backgroundColor: '#1e1e1e'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>End Round?</h2>
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

                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-light)' }}>
                        Are you sure you want to end this round?
                    </p>

                    {/* Round Summary */}
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                            Round Summary:
                        </div>
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            <strong>Course:</strong> {currentRound.course?.name || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            <strong>Holes Played:</strong> {holesPlayed} / {totalHoles}
                        </div>
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            <strong>Current Hole:</strong> {activeHole}
                        </div>
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                            <strong>Players:</strong> {players.length}
                        </div>

                        {/* Player Scores */}
                        {hasScoreData && (
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    Scores:
                                </div>
                                {Object.values(playerTotals).map((player) => (
                                    <div key={player.name} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                        {player.name}: {player.total > 0 ? `+${player.total}` : player.total} ({player.holes} holes)
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Warning Message */}
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'rgba(243, 156, 18, 0.2)',
                        borderRadius: '8px',
                        border: '1px solid var(--warning)',
                        fontSize: '0.875rem',
                        color: 'var(--warning)'
                    }}>
                        {hasScoreData ? (
                            <>
                                <strong>Note:</strong> This round will be saved to the cloud and cached locally for 30 minutes in case you want to continue later.
                            </>
                        ) : (
                            <>
                                <strong>Note:</strong> This round will be cached locally for 30 minutes in case you want to continue later.
                            </>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            backgroundColor: 'var(--border)'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn"
                        onClick={() => {
                            onConfirm();
                        }}
                        style={{
                            flex: 1,
                            backgroundColor: 'var(--danger)'
                        }}
                    >
                        End Round
                    </button>
                </div>
            </div>
        </div>
    );
}




