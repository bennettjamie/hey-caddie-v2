'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { calculateSkins, calculateNassau, SkinResult } from '@/lib/betting';
import { createCarryOver } from '@/lib/mrtzCarryOvers';

interface UnresolvedBetsModalProps {
    onClose: () => void;
    onResolve: (resolution: {
        action: 'exclude' | 'playoff' | 'payout' | 'push';
        settleToday: boolean;
        playoffHole?: number;
        playoffWinners?: { [holeNumber: number]: string };
    }) => void;
}

export default function UnresolvedBetsModal({ onClose, onResolve }: UnresolvedBetsModalProps) {
    const { currentRound, activeBets = {}, players } = useGame();
    const [action, setAction] = useState<'exclude' | 'playoff' | 'payout' | 'push'>('exclude');
    const [settleToday, setSettleToday] = useState(true);
    const [playoffHole, setPlayoffHole] = useState(1);
    const [playoffWinners, setPlayoffWinners] = useState<{ [holeNumber: number]: string }>({});

    if (!currentRound) return null;

    const holes = Array.from({ length: 18 }, (_, i) => i + 1);
    const playerIds = currentRound.players.map((p: any) => p.id);

    // Calculate unresolved bets
    let skinsCarryovers: SkinResult[] = [];
    let nassauTies: { segment: string; tiedPlayers: string[] }[] = [];

    if (activeBets?.skins?.started) {
        const skinsResults = calculateSkins(currentRound.scores, holes, activeBets.skins.value, activeBets.skins.participants);
        skinsCarryovers = skinsResults.filter(s => s.isCarryOver);
    }

    if (activeBets?.nassau?.started) {
        const nassauResults = calculateNassau(currentRound.scores, playerIds, activeBets.nassau.participants);
        // Use participants if provided, otherwise all players
        const nassauParticipants = activeBets.nassau.participants && activeBets.nassau.participants.length > 0
            ? activeBets.nassau.participants
            : playerIds;
        
        if (nassauResults.front9WinnerId === null) {
            // Find tied players for front 9 (only among participants)
            const front9Scores: { [key: string]: number } = {};
            nassauParticipants.forEach(p => {
                let total = 0;
                for (let i = 1; i <= 9; i++) {
                    total += currentRound.scores[i]?.[p] || 0;
                }
                front9Scores[p] = total;
            });
            const minScore = Math.min(...Object.values(front9Scores));
            const tied = Object.entries(front9Scores)
                .filter(([_, score]) => score === minScore)
                .map(([id]) => id);
            if (tied.length > 1) {
                nassauTies.push({ segment: 'Front 9', tiedPlayers: tied });
            }
        }
        if (nassauResults.back9WinnerId === null) {
            // Find tied players for back 9 (only among participants)
            const back9Scores: { [key: string]: number } = {};
            nassauParticipants.forEach(p => {
                let total = 0;
                for (let i = 10; i <= 18; i++) {
                    total += currentRound.scores[i]?.[p] || 0;
                }
                back9Scores[p] = total;
            });
            const minScore = Math.min(...Object.values(back9Scores));
            const tied = Object.entries(back9Scores)
                .filter(([_, score]) => score === minScore)
                .map(([id]) => id);
            if (tied.length > 1) {
                nassauTies.push({ segment: 'Back 9', tiedPlayers: tied });
            }
        }
        if (nassauResults.overallWinnerId === null) {
            // Find tied players for overall (only among participants)
            const overallScores: { [key: string]: number } = {};
            nassauParticipants.forEach(p => {
                let total = 0;
                for (let i = 1; i <= 18; i++) {
                    total += currentRound.scores[i]?.[p] || 0;
                }
                overallScores[p] = total;
            });
            const minScore = Math.min(...Object.values(overallScores));
            const tied = Object.entries(overallScores)
                .filter(([_, score]) => score === minScore)
                .map(([id]) => id);
            if (tied.length > 1) {
                nassauTies.push({ segment: 'Overall', tiedPlayers: tied });
            }
        }
    }

    const hasUnresolvedBets = skinsCarryovers.length > 0 || nassauTies.length > 0;

    if (!hasUnresolvedBets) {
        // No unresolved bets, proceed directly
        onResolve({ action: 'exclude', settleToday: true });
        return null;
    }

    // Calculate total carryover value
    const totalCarryoverValue = skinsCarryovers.reduce((sum, s) => sum + s.value, 0);

    const getPlayerName = (playerId: string) => {
        const player = currentRound.players.find((p: any) => p.id === playerId);
        return player?.name || playerId;
    };

    const handlePlayoffWinnerSelect = (holeNum: number, playerId: string) => {
        setPlayoffWinners(prev => ({
            ...prev,
            [holeNum]: playerId
        }));
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
                    maxWidth: '600px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    backgroundColor: '#1e1e1e'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Unresolved Bets</h2>
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

                {/* Unresolved Bets Summary */}
                <div style={{ marginBottom: '1.5rem' }}>
                    {skinsCarryovers.length > 0 && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: 'rgba(243, 156, 18, 0.2)',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            border: '1px solid var(--warning)'
                        }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                Skins Carryovers: {skinsCarryovers.length} hole(s)
                            </div>
                            <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                Total Value: {totalCarryoverValue.toFixed(2)} MRTZ
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                {skinsCarryovers.map(s => `Hole ${s.holeNumber} (${s.value.toFixed(2)} MRTZ)`).join(', ')}
                            </div>
                        </div>
                    )}

                    {nassauTies.length > 0 && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: 'rgba(243, 156, 18, 0.2)',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            border: '1px solid var(--warning)'
                        }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                Nassau Ties: {nassauTies.length} segment(s)
                            </div>
                            {nassauTies.map((tie, idx) => (
                                <div key={idx} style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-light)' }}>
                                    {tie.segment}: {tie.tiedPlayers.map(getPlayerName).join(', ')}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Resolution Options - Skins */}
                {skinsCarryovers.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500, fontSize: '1rem' }}>
                            Resolve Skins Carryovers:
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setAction('playoff')}
                                style={{
                                    backgroundColor: action === 'playoff' ? 'var(--primary)' : 'var(--border)',
                                    textAlign: 'left',
                                    padding: '0.75rem',
                                    minHeight: '60px'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Playoff to Decide</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                    Play additional holes to determine winners
                                </div>
                            </button>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setAction('exclude')}
                                style={{
                                    backgroundColor: action === 'exclude' ? 'var(--primary)' : 'var(--border)',
                                    textAlign: 'left',
                                    padding: '0.75rem',
                                    minHeight: '60px'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Exclude from MRTZ</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                    Don't add outstanding skins to any player's MRTZ account
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Resolution Options - Nassau */}
                {nassauTies.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500, fontSize: '1rem' }}>
                            Resolve Nassau Ties:
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setAction('playoff')}
                                style={{
                                    backgroundColor: action === 'playoff' ? 'var(--primary)' : 'var(--border)',
                                    textAlign: 'left',
                                    padding: '0.75rem',
                                    minHeight: '60px'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Playoff to Decide</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                    Play additional holes to break ties
                                </div>
                            </button>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setAction('push')}
                                style={{
                                    backgroundColor: action === 'push' ? 'var(--primary)' : 'var(--border)',
                                    textAlign: 'left',
                                    padding: '0.75rem',
                                    minHeight: '60px'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Split Merits Equally</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                    Divide MRTZ equally among tied players
                                </div>
                            </button>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setAction('exclude')}
                                style={{
                                    backgroundColor: action === 'exclude' ? 'var(--primary)' : 'var(--border)',
                                    textAlign: 'left',
                                    padding: '0.75rem',
                                    minHeight: '60px'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>No Payout (Push)</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                    No MRTZ paid out since there was a tie
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Playoff Configuration */}
                {action === 'playoff' && (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                            Playoff Hole:
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="18"
                            value={playoffHole}
                            onChange={(e) => setPlayoffHole(parseInt(e.target.value) || 1)}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg)',
                                color: 'var(--text)',
                                marginBottom: '1rem'
                            }}
                        />
                        {skinsCarryovers.map(skin => (
                            <div key={skin.holeNumber} style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    Winner for Hole {skin.holeNumber} ({skin.value.toFixed(2)} MRTZ):
                                </label>
                                <select
                                    value={playoffWinners[skin.holeNumber] || ''}
                                    onChange={(e) => handlePlayoffWinnerSelect(skin.holeNumber, e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg)',
                                        color: 'var(--text)'
                                    }}
                                >
                                    <option value="">Select winner...</option>
                                    {currentRound.players.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                )}

                {/* Settle Today vs Carry Over */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>
                        Settlement:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setSettleToday(true)}
                            style={{
                                backgroundColor: settleToday ? 'var(--success)' : 'var(--border)',
                                textAlign: 'left',
                                padding: '0.75rem'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Settle Today</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                Update MRTZ balances and finalize all bets now
                            </div>
                        </button>

                        <button
                            type="button"
                            className="btn"
                            onClick={() => setSettleToday(false)}
                            style={{
                                backgroundColor: !settleToday ? 'var(--info)' : 'var(--border)',
                                textAlign: 'left',
                                padding: '0.75rem'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Carry Over for Future Bets</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                Keep unresolved bets active for future rounds. Everyone maintains MRTZ cache and bet history.
                            </div>
                        </button>
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
                        onClick={async () => {
                            // If action is exclude and settleToday is false, create carry-over entries
                            if (action === 'exclude' && !settleToday) {
                                try {
                                    const playerIds = currentRound.players.map((p: any) => p.id);
                                    
                                    // Create skins carry-over if applicable
                                    if (skinsCarryovers.length > 0 && activeBets?.skins?.started) {
                                        const carryOverHoles = skinsCarryovers.map(s => s.holeNumber);
                                        const accumulatedValue = skinsCarryovers.reduce((sum, s) => sum + s.value, 0);
                                        
                                        await createCarryOver(
                                            `round_${Date.now()}`, // Will be updated with actual round ID
                                            'skins',
                                            activeBets.skins.value,
                                            {
                                                skins: {
                                                    holes: carryOverHoles,
                                                    accumulatedValue
                                                }
                                            },
                                            playerIds,
                                            playerIds[0] || 'system'
                                        );
                                    }
                                    
                                    // Create Nassau carry-over if applicable
                                    if (nassauTies.length > 0 && activeBets?.nassau?.started) {
                                        const tiedSegments = nassauTies.map(t => 
                                            t.segment === 'Front 9' ? 'front9' :
                                            t.segment === 'Back 9' ? 'back9' : 'overall'
                                        ) as ('front9' | 'back9' | 'overall')[];
                                        const allTiedPlayers = nassauTies.flatMap(t => t.tiedPlayers);
                                        const uniqueTiedPlayers = [...new Set(allTiedPlayers)];
                                        
                                        await createCarryOver(
                                            `round_${Date.now()}`,
                                            'nassau',
                                            activeBets.nassau.value,
                                            {
                                                nassau: {
                                                    segments: tiedSegments,
                                                    tiedPlayers: uniqueTiedPlayers
                                                }
                                            },
                                            playerIds,
                                            playerIds[0] || 'system'
                                        );
                                    }
                                } catch (error) {
                                    console.error('Error creating carry-over:', error);
                                    // Continue anyway
                                }
                            }
                            
                            onResolve({
                                action,
                                settleToday,
                                playoffHole: action === 'playoff' ? playoffHole : undefined,
                                playoffWinners: action === 'playoff' ? playoffWinners : undefined
                            });
                        }}
                        style={{
                            flex: 1,
                            backgroundColor: 'var(--success)'
                        }}
                        disabled={action === 'playoff' && skinsCarryovers.some(s => !playoffWinners[s.holeNumber])}
                    >
                        Resolve & Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
