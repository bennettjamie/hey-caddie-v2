'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';

interface BettingSetupModalProps {
    onClose: () => void;
}

export default function BettingSetupModal({ onClose }: BettingSetupModalProps) {
    const { currentRound, activeBets = {}, startSkins, startNassau } = useGame();
    const [skinsValue, setSkinsValue] = useState(activeBets?.skins?.value || 0.25);
    const [nassauValue, setNassauValue] = useState(activeBets?.nassau?.value || 1.0);
    const [skinsParticipants, setSkinsParticipants] = useState<string[]>([]);
    const [nassauParticipants, setNassauParticipants] = useState<string[]>([]);

    // Initialize participants to all players if not already set
    useEffect(() => {
        if (currentRound?.players) {
            const allPlayerIds = currentRound.players.map((p: any) => p.id).filter(Boolean);
            if (skinsParticipants.length === 0 && !activeBets?.skins?.started) {
                setSkinsParticipants(allPlayerIds);
            }
            if (nassauParticipants.length === 0 && !activeBets?.nassau?.started) {
                setNassauParticipants(allPlayerIds);
            }
        }
    }, [currentRound, activeBets]);

    const handleSkinsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (skinsValue <= 0) {
            alert('Bet value must be greater than 0');
            return;
        }
        if (skinsParticipants.length === 0) {
            alert('Please select at least one player for Skins');
            return;
        }
        if (startSkins && typeof startSkins === 'function') {
            startSkins(skinsValue, skinsParticipants);
        } else {
            alert('Error: Unable to start Skins bet. Please try again.');
            console.error('startSkins is not a function:', startSkins);
        }
    };

    const handleNassauSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (nassauValue <= 0) {
            alert('Bet value must be greater than 0');
            return;
        }
        if (nassauParticipants.length === 0) {
            alert('Please select at least one player for Nassau');
            return;
        }
        if (startNassau && typeof startNassau === 'function') {
            startNassau(nassauValue, nassauParticipants);
        } else {
            alert('Error: Unable to start Nassau bet. Please try again.');
            console.error('startNassau is not a function:', startNassau);
        }
    };

    const togglePlayer = (playerId: string, betType: 'skins' | 'nassau') => {
        if (betType === 'skins') {
            setSkinsParticipants(prev => 
                prev.includes(playerId) 
                    ? prev.filter(id => id !== playerId)
                    : [...prev, playerId]
            );
        } else {
            setNassauParticipants(prev => 
                prev.includes(playerId) 
                    ? prev.filter(id => id !== playerId)
                    : [...prev, playerId]
            );
        }
    };

    const renderValueStepper = (value: number, setValue: (val: number) => void, disabled: boolean) => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: 'rgba(0, 242, 96, 0.1)',
            borderRadius: '12px',
            border: '2px solid var(--primary)',
            opacity: disabled ? 0.5 : 1
        }}>
            <button
                type="button"
                onClick={() => {
                    if (!disabled) {
                        const newValue = Math.max(0.25, value - 0.25);
                        setValue(newValue);
                    }
                }}
                disabled={disabled}
                style={{
                    minWidth: '60px',
                    minHeight: '60px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    backgroundColor: disabled ? 'var(--border)' : 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                }}
            >
                −
            </button>
            
            <div style={{ minWidth: '100px', textAlign: 'center' }}>
                <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: 'var(--primary)',
                    lineHeight: 1.2
                }}>
                    {value.toFixed(2)}
                </div>
                <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-light)',
                    fontWeight: 500
                }}>
                    MRTZ
                </div>
            </div>
            
            <button
                type="button"
                onClick={() => {
                    if (!disabled) {
                        const newValue = value + 0.25;
                        setValue(newValue);
                    }
                }}
                disabled={disabled}
                style={{
                    minWidth: '60px',
                    minHeight: '60px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    backgroundColor: disabled ? 'var(--border)' : 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                }}
            >
                +
            </button>
        </div>
    );

    const renderPlayerSelection = (participants: string[], betType: 'skins' | 'nassau', disabled: boolean) => {
        if (!currentRound?.players) return null;
        
        return (
            <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                opacity: disabled ? 0.5 : 1
            }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    Select Participants:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {currentRound.players.map((player: any) => {
                        const isSelected = participants.includes(player.id);
                        return (
                            <label
                                key={player.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    padding: '0.5rem',
                                    borderRadius: '4px',
                                    backgroundColor: isSelected ? 'rgba(0, 242, 96, 0.1)' : 'transparent'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => !disabled && togglePlayer(player.id, betType)}
                                    disabled={disabled}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        cursor: disabled ? 'not-allowed' : 'pointer'
                                    }}
                                />
                                <span style={{ fontSize: '0.875rem' }}>{player.name}</span>
                            </label>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem',
            overflowY: 'auto'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '700px', backgroundColor: '#1e1e1e', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Start Betting</h2>
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

                {/* Active Bets Status */}
                {(activeBets?.skins?.started || activeBets?.nassau?.started) && (
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'rgba(0, 242, 96, 0.1)',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        border: '1px solid var(--primary)'
                    }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            Active Bets:
                        </div>
                        {activeBets?.skins?.started && (
                            <div style={{ fontSize: '0.875rem' }}>
                                ✓ Skins: {activeBets?.skins?.value || 0} MRTZ per hole
                            </div>
                        )}
                        {activeBets?.nassau?.started && (
                            <div style={{ fontSize: '0.875rem' }}>
                                ✓ Nassau: {activeBets?.nassau?.value || 0} MRTZ per segment
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {/* Skins Section */}
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        border: activeBets?.skins?.started ? '2px solid var(--success)' : '1px solid var(--border)'
                    }}>
                        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Skins
                            {activeBets?.skins?.started && <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>✓ Active</span>}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
                            Amount per hole. Winner takes all, ties carry over.
                        </p>
                        
                        <form onSubmit={handleSkinsSubmit}>
                            {renderValueStepper(skinsValue, setSkinsValue, activeBets?.skins?.started || false)}
                            {renderPlayerSelection(skinsParticipants, 'skins', activeBets?.skins?.started || false)}
                            
                            <button
                                type="submit"
                                className="btn"
                                style={{
                                    width: '100%',
                                    backgroundColor: activeBets?.skins?.started ? 'var(--border)' : 'var(--success)',
                                    marginTop: '1rem'
                                }}
                                disabled={activeBets?.skins?.started}
                            >
                                {activeBets?.skins?.started ? 'Already Active' : 'Start Skins'}
                            </button>
                        </form>
                    </div>

                    {/* Nassau Section */}
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        border: activeBets?.nassau?.started ? '2px solid var(--success)' : '1px solid var(--border)'
                    }}>
                        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Nassau
                            {activeBets?.nassau?.started && <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>✓ Active</span>}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
                            Amount per segment (Front 9, Back 9, Overall). Winner takes from all players.
                        </p>
                        
                        <form onSubmit={handleNassauSubmit}>
                            {renderValueStepper(nassauValue, setNassauValue, activeBets?.nassau?.started || false)}
                            {renderPlayerSelection(nassauParticipants, 'nassau', activeBets?.nassau?.started || false)}
                            
                            <button
                                type="submit"
                                className="btn"
                                style={{
                                    width: '100%',
                                    backgroundColor: activeBets?.nassau?.started ? 'var(--border)' : 'var(--success)',
                                    marginTop: '1rem'
                                }}
                                disabled={activeBets?.nassau?.started}
                            >
                                {activeBets?.nassau?.started ? 'Already Active' : 'Start Nassau'}
                            </button>
                        </form>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                        type="button"
                        className="btn"
                        onClick={onClose}
                        style={{ flex: 1, backgroundColor: (activeBets?.skins?.started || activeBets?.nassau?.started) ? 'var(--success)' : 'var(--border)' }}
                    >
                        {(activeBets?.skins?.started || activeBets?.nassau?.started) ? 'Done' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
}
