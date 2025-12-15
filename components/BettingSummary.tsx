'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { calculateSkins, calculateNassau } from '@/lib/betting';
import BettingSetupModal from './BettingSetupModal';

export default function BettingSummary() {
    const { currentRound, activeBets = {}, activeHole } = useGame();
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        skins: true,
        nassau: true
    });

    if (!currentRound) return null;

    // Only show if bets are active
    const hasActiveBets = activeBets?.skins?.started || activeBets?.nassau?.started;

    const holes = Array.from({ length: 18 }, (_, i) => i + 1);
    const playerIds = currentRound.players.map((p: any) => p.id);

    // Calculate Skins if active
    const skins = activeBets?.skins?.started
        ? calculateSkins(currentRound.scores, holes, activeBets?.skins?.value || 0, activeBets?.skins?.participants)
        : [];

    // Calculate Nassau if active
    const nassau = activeBets?.nassau?.started
        ? calculateNassau(currentRound.scores, playerIds, activeBets?.nassau?.participants)
        : null;

    // Calculate total winnings per player
    const skinWinnings: { [key: string]: number } = {};
    skins.forEach(s => {
        if (s.winnerId) {
            skinWinnings[s.winnerId] = (skinWinnings[s.winnerId] || 0) + s.value;
        }
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // If no active bets, show start button
    if (!hasActiveBets) {
        return (
            <>
                <div className="card" style={{ marginTop: '2rem' }}>
                    <h2>Betting</h2>
                    <p style={{ color: 'var(--text-light)', marginTop: '0.5rem' }}>
                        No active bets. Start Skins or Nassau to track betting during your round.
                    </p>
                    <button
                        className="btn"
                        onClick={() => setShowSetupModal(true)}
                        style={{
                            marginTop: '1rem',
                            width: '100%',
                            backgroundColor: 'var(--primary)'
                        }}
                    >
                        Start Bets
                    </button>
                </div>
                {showSetupModal && <BettingSetupModal onClose={() => setShowSetupModal(false)} />}
            </>
        );
    }

    return (
        <>
            <div className="card" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2>Betting Summary</h2>
                    <button
                        className="btn"
                        onClick={() => setShowSetupModal(true)}
                        style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            backgroundColor: 'var(--info)',
                            minHeight: 'auto'
                        }}
                    >
                        Add Bet
                    </button>
                </div>

                {/* Skins Section */}
                {activeBets?.skins?.started && (
                    <div style={{ marginTop: '1rem' }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                borderRadius: '6px',
                                marginBottom: '0.5rem'
                            }}
                            onClick={() => toggleSection('skins')}
                        >
                            <h3 style={{ margin: 0 }}>Skins ({activeBets?.skins?.value} MRTZ/hole)</h3>
                            <span>{expandedSections.skins ? '▼' : '▶'}</span>
                        </div>
                        {expandedSections.skins && (
                            <div>
                                {skins.length === 0 ? (
                                    <p style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>
                                        No holes scored yet.
                                    </p>
                                ) : (
                                    <>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {skins.map(s => {
                                                const isCurrentHole = s.holeNumber === activeHole;
                                                return (
                                                    <li
                                                        key={s.holeNumber}
                                                        style={{
                                                            borderBottom: '1px solid var(--border)',
                                                            padding: '0.75rem 0',
                                                            backgroundColor: isCurrentHole ? 'rgba(0, 242, 96, 0.1)' : 'transparent',
                                                            fontWeight: isCurrentHole ? 'bold' : 'normal'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span>
                                                                Hole {s.holeNumber}: {isCurrentHole && '👈 '}
                                                                {s.winnerId ? (
                                                                    <span style={{ color: 'var(--success)' }}>
                                                                        {currentRound.players.find((p: any) => p.id === s.winnerId)?.name} won {s.value.toFixed(2)} MRTZ
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: 'var(--warning)' }}>
                                                                        Push ({s.value.toFixed(2)} MRTZ carried over)
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                        {/* Total Winnings */}
                                        {Object.keys(skinWinnings).length > 0 && (
                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '0.75rem',
                                                backgroundColor: 'rgba(0, 242, 96, 0.1)',
                                                borderRadius: '6px',
                                                border: '1px solid var(--success)'
                                            }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                                    Total Winnings:
                                                </div>
                                                {Object.entries(skinWinnings).map(([playerId, amount]) => (
                                                    <div key={playerId} style={{ fontSize: '0.875rem' }}>
                                                        {currentRound.players.find((p: any) => p.id === playerId)?.name}:{' '}
                                                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                                                            +{amount.toFixed(2)} MRTZ
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Nassau Section */}
                {activeBets?.nassau?.started && nassau && (
                    <div style={{ marginTop: '1rem' }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                borderRadius: '6px',
                                marginBottom: '0.5rem'
                            }}
                            onClick={() => toggleSection('nassau')}
                        >
                            <h3 style={{ margin: 0 }}>Nassau ({activeBets?.nassau?.value} MRTZ/segment)</h3>
                            <span>{expandedSections.nassau ? '▼' : '▶'}</span>
                        </div>
                        {expandedSections.nassau && (
                            <div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                                    <div style={{
                                        padding: '0.75rem',
                                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                        borderRadius: '6px',
                                        border: nassau.front9WinnerId ? '2px solid var(--success)' : '1px solid var(--border)'
                                    }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                            Front 9
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: nassau.front9WinnerId ? 'var(--success)' : 'var(--text-light)' }}>
                                            {nassau.front9WinnerId
                                                ? currentRound.players.find((p: any) => p.id === nassau.front9WinnerId)?.name
                                                : 'Tie'}
                                        </div>
                                        {nassau.front9WinnerId && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                                +{activeBets?.nassau?.value || 0} MRTZ
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        padding: '0.75rem',
                                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                        borderRadius: '6px',
                                        border: nassau.back9WinnerId ? '2px solid var(--success)' : '1px solid var(--border)'
                                    }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                            Back 9
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: nassau.back9WinnerId ? 'var(--success)' : 'var(--text-light)' }}>
                                            {nassau.back9WinnerId
                                                ? currentRound.players.find((p: any) => p.id === nassau.back9WinnerId)?.name
                                                : 'Tie'}
                                        </div>
                                        {nassau.back9WinnerId && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                                +{activeBets?.nassau?.value || 0} MRTZ
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        padding: '0.75rem',
                                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                        borderRadius: '6px',
                                        border: nassau.overallWinnerId ? '2px solid var(--success)' : '1px solid var(--border)'
                                    }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                            Overall
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: nassau.overallWinnerId ? 'var(--success)' : 'var(--text-light)' }}>
                                            {nassau.overallWinnerId
                                                ? currentRound.players.find((p: any) => p.id === nassau.overallWinnerId)?.name
                                                : 'Tie'}
                                        </div>
                                        {nassau.overallWinnerId && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                                +{activeBets?.nassau?.value || 0} MRTZ
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {showSetupModal && <BettingSetupModal onClose={() => setShowSetupModal(false)} />}
        </>
    );
}
