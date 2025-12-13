'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';

interface BettingSetupModalProps {
    onClose: () => void;
}

export default function BettingSetupModal({ onClose }: BettingSetupModalProps) {
    const { activeBets = {}, startSkins, startNassau } = useGame();
    const [betType, setBetType] = useState<'skins' | 'nassau'>('skins');
    const [value, setValue] = useState(0.25);

    // Update default value when bet type changes
    useEffect(() => {
        if (betType === 'skins') {
            // Use active bet value if available, otherwise default to 0.25
            setValue(activeBets?.skins?.value || 0.25);
        } else {
            // Use active bet value if available, otherwise default to 1.0 for Nassau
            setValue(activeBets?.nassau?.value || 1.0);
        }
    }, [betType, activeBets?.skins?.value, activeBets?.nassau?.value]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value <= 0) {
            alert('Bet value must be greater than 0');
            return;
        }

        if (betType === 'skins') {
            if (startSkins && typeof startSkins === 'function') {
                startSkins(value);
            } else {
                alert('Error: Unable to start Skins bet. Please try again.');
                console.error('startSkins is not a function:', startSkins);
                return;
            }
        } else {
            if (startNassau && typeof startNassau === 'function') {
                startNassau(value);
            } else {
                alert('Error: Unable to start Nassau bet. Please try again.');
                console.error('startNassau is not a function:', startNassau);
                return;
            }
        }
        onClose();
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
            zIndex: 1000
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '500px', backgroundColor: '#1e1e1e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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

                {/* Bet Type Selection */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => setBetType('skins')}
                        style={{
                            flex: 1,
                            backgroundColor: betType === 'skins' ? 'var(--primary)' : 'var(--border)',
                            opacity: activeBets?.skins?.started ? 0.6 : 1
                        }}
                        disabled={activeBets?.skins?.started}
                    >
                        Skins
                        {activeBets?.skins?.started && ' (Active)'}
                    </button>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => setBetType('nassau')}
                        style={{
                            flex: 1,
                            backgroundColor: betType === 'nassau' ? 'var(--primary)' : 'var(--border)',
                            opacity: activeBets?.nassau?.started ? 0.6 : 1
                        }}
                        disabled={activeBets?.nassau?.started}
                    >
                        Nassau
                        {activeBets?.nassau?.started && ' (Active)'}
                    </button>
                </div>

                {/* Active Bets Status */}
                {(activeBets?.skins?.started || activeBets?.nassau?.started) && (
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'rgba(0, 242, 96, 0.1)',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        border: '1px solid var(--primary)'
                    }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            Active Bets:
                        </div>
                        {activeBets?.skins?.started && (
                            <div style={{ fontSize: '0.875rem' }}>
                                Skins: {activeBets?.skins?.value || 0} MRTZ per hole
                            </div>
                        )}
                        {activeBets?.nassau?.started && (
                            <div style={{ fontSize: '0.875rem' }}>
                                Nassau: {activeBets?.nassau?.value || 0} MRTZ per segment
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                            Bet Value (MRTZ):
                        </label>
                        <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            value={value}
                            onChange={(e) => {
                                const newValue = parseFloat(e.target.value);
                                if (!isNaN(newValue) && newValue >= 0.25) {
                                    setValue(newValue);
                                }
                            }}
                            onBlur={(e) => {
                                const newValue = parseFloat(e.target.value);
                                if (isNaN(newValue) || newValue < 0.25) {
                                    // Reset to default based on bet type
                                    setValue(betType === 'skins' ? 0.25 : 1.0);
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                fontSize: '1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg)',
                                color: 'var(--text)'
                            }}
                            required
                        />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                            {betType === 'skins' 
                                ? 'Amount per hole. Winner takes all, ties carry over.'
                                : 'Amount per segment (Front 9, Back 9, Overall). Winner takes from all players.'}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            className="btn"
                            onClick={onClose}
                            style={{ flex: 1, backgroundColor: 'var(--border)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn"
                            style={{ flex: 1, backgroundColor: 'var(--success)' }}
                            disabled={
                                (betType === 'skins' && activeBets?.skins?.started) ||
                                (betType === 'nassau' && activeBets?.nassau?.started)
                            }
                        >
                            Start {betType === 'skins' ? 'Skins' : 'Nassau'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

