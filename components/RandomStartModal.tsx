'use client';

import { useGame } from '@/context/GameContext';

interface RandomStartModalProps {
    onClose: () => void;
    onRandomize: () => void;
    onKeepOrder: () => void;
}

export default function RandomStartModal({ onClose, onRandomize, onKeepOrder }: RandomStartModalProps) {
    const { currentRound, teeOrder } = useGame();

    if (!currentRound) return null;

    const getPlayerName = (playerId: string) => {
        const player = currentRound.players.find((p: any) => p.id === playerId);
        return player?.name || playerId;
    };

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
                    backgroundColor: '#1e1e1e',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>First Tee - Choose Start Order</h2>
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

                <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(0, 242, 96, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    border: '1px solid var(--primary)'
                }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                        Current Tee Order:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {teeOrder.map((playerId, index) => (
                            <div
                                key={playerId}
                                style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}
                            >
                                <span style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold',
                                    color: 'var(--primary)',
                                    minWidth: '30px'
                                }}>
                                    {index + 1}
                                </span>
                                <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                                    {getPlayerName(playerId)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', lineHeight: 1.6 }}>
                        Would you like to randomize the tee order for the first hole? After the first hole, 
                        the order will follow regular golf rules (lowest score tees first).
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button
                        className="btn"
                        onClick={() => {
                            onRandomize();
                            onClose();
                        }}
                        style={{
                            width: '100%',
                            backgroundColor: 'var(--primary)',
                            padding: '1rem',
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            minHeight: '60px'
                        }}
                    >
                        🎲 Randomize Tee Order
                    </button>
                    <button
                        className="btn"
                        onClick={() => {
                            onKeepOrder();
                            onClose();
                        }}
                        style={{
                            width: '100%',
                            backgroundColor: 'var(--border)',
                            padding: '1rem',
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            minHeight: '60px'
                        }}
                    >
                        Keep Current Order
                    </button>
                </div>
            </div>
        </div>
    );
}


