'use client';

import { useState } from 'react';

interface SettlementModalProps {
    onClose: () => void;
    onConfirm: (settledIRL: boolean) => void;
    mrtzTotals: { [playerId: string]: number };
    playerNames: { [playerId: string]: string };
}

export default function SettlementModal({ onClose, onConfirm, mrtzTotals, playerNames }: SettlementModalProps) {
    const [settledIRL, setSettledIRL] = useState<boolean | null>(null);

    const totalOwed = Object.entries(mrtzTotals)
        .filter(([_, amount]) => amount !== 0)
        .reduce((sum, [_, amount]) => sum + Math.abs(amount), 0);

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
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    backgroundColor: '#1e1e1e'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>MRTZ Settlement</h2>
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
                        MRTZ Summary:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {Object.entries(mrtzTotals)
                            .filter(([_, amount]) => amount !== 0)
                            .map(([playerId, amount]) => (
                                <div
                                    key={playerId}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '0.5rem',
                                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <span>{playerNames[playerId] || playerId}</span>
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: amount > 0 ? 'var(--success)' : 'var(--danger)'
                                    }}>
                                        {amount > 0 ? '+' : ''}{amount.toFixed(2)} MRTZ
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500, fontSize: '1rem' }}>
                        Have MRTZ been settled IRL (in real life)?
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setSettledIRL(true)}
                            style={{
                                backgroundColor: settledIRL === true ? 'var(--success)' : 'var(--border)',
                                textAlign: 'left',
                                padding: '1rem',
                                minHeight: '60px'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Yes - Settled IRL</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                MRTZ have been paid/received in real life. Update balances and mark as settled.
                            </div>
                        </button>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setSettledIRL(false)}
                            style={{
                                backgroundColor: settledIRL === false ? 'var(--info)' : 'var(--border)',
                                textAlign: 'left',
                                padding: '1rem',
                                minHeight: '60px'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>No - Add to Ledger</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                Add to total ledger of what is owed to whom, from when, for future betting and settling of bets.
                            </div>
                        </button>
                    </div>
                </div>

                {settledIRL === false && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        border: '1px solid var(--info)'
                    }}>
                        <div style={{ fontSize: '0.875rem' }}>
                            <strong>Ledger Entry:</strong> This round's MRTZ will be tracked in your ledger for future settlement. 
                            You can view and settle outstanding amounts later.
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            backgroundColor: 'var(--border)',
                            padding: '1rem',
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            minHeight: '60px'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn"
                        onClick={() => {
                            if (settledIRL !== null) {
                                onConfirm(settledIRL);
                            }
                        }}
                        disabled={settledIRL === null}
                        style={{
                            flex: 1,
                            backgroundColor: settledIRL !== null ? 'var(--success)' : 'var(--border)',
                            padding: '1rem',
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            minHeight: '60px',
                            opacity: settledIRL !== null ? 1 : 0.5
                        }}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}


