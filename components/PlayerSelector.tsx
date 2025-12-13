'use client';

import { useState, useEffect } from 'react';
import { getAllPlayers, getLocalPlayers, getOrCreatePlayerByName, Player as PlayerType } from '@/lib/players';

interface Player {
    id: string;
    name: string;
}

interface PlayerSelectorProps {
    onSelect: (players: Player[]) => void;
    initialPlayers?: Player[];
}

export default function PlayerSelector({ onSelect, initialPlayers = [] }: PlayerSelectorProps) {
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [recentPlayers, setRecentPlayers] = useState<Player[]>([]);

    useEffect(() => {
        loadPlayers();
    }, []);

    const loadPlayers = async () => {
        // Load recent players from localStorage first (for quick display)
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('recentPlayers');
                if (stored) {
                    setRecentPlayers(JSON.parse(stored));
                }
            } catch (error) {
                console.error('Error loading recent players:', error);
            }
        }

        // Also try to load from Firebase
        try {
            const firebasePlayers = await getAllPlayers(50);
            if (firebasePlayers.length > 0) {
                // Merge with recent players, prioritizing Firebase
                const combined = [...firebasePlayers, ...recentPlayers];
                const unique = combined.filter((p, index, self) => 
                    index === self.findIndex((p2) => p2.id === p.id)
                );
                setRecentPlayers(unique.slice(0, 20)); // Keep top 20
            }
        } catch (error) {
            console.error('Error loading players from Firebase:', error);
            // Fallback to local storage
            const localPlayers = getLocalPlayers();
            if (localPlayers.length > 0) {
                setRecentPlayers(localPlayers.slice(0, 20));
            }
        }
    };

    const addPlayer = async () => {
        if (newPlayerName.trim() && !players.find(p => p.name.toLowerCase() === newPlayerName.toLowerCase())) {
            try {
                // Try to get or create player in Firebase
                const player = await getOrCreatePlayerByName(newPlayerName.trim());
                const newPlayer: Player = {
                    id: player.id,
                    name: player.name
                };
                const updated = [...players, newPlayer];
                setPlayers(updated);
                setNewPlayerName('');
                onSelect(updated);
                saveRecentPlayer(newPlayer);
            } catch (error) {
                console.error('Error adding player:', error);
                // Fallback to local player
                const newPlayer: Player = {
                    id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: newPlayerName.trim()
                };
                const updated = [...players, newPlayer];
                setPlayers(updated);
                setNewPlayerName('');
                onSelect(updated);
                saveRecentPlayer(newPlayer);
            }
        }
    };

    const removePlayer = (playerId: string) => {
        const updated = players.filter(p => p.id !== playerId);
        setPlayers(updated);
        onSelect(updated);
    };

    const addRecentPlayer = (player: Player) => {
        if (!players.find(p => p.id === player.id)) {
            const updated = [...players, player];
            setPlayers(updated);
            onSelect(updated);
            saveRecentPlayer(player);
        }
    };

    const saveRecentPlayer = (player: Player) => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('recentPlayers');
                const recent = stored ? JSON.parse(stored) : [];
                // Remove if exists and add to front
                const filtered = recent.filter((p: Player) => p.id !== player.id);
                const updated = [player, ...filtered].slice(0, 10); // Keep last 10
                localStorage.setItem('recentPlayers', JSON.stringify(updated));
                setRecentPlayers(updated);
            } catch (error) {
                console.error('Error saving recent player:', error);
            }
        }
    };

    return (
        <div>
            <div className="card">
                <h2>Select Players</h2>
                
                {/* Add new player */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Player name"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                addPlayer();
                            }
                        }}
                        className="input"
                        style={{ flex: 1, marginTop: 0 }}
                    />
                    <button className="btn" onClick={addPlayer} style={{ backgroundColor: 'var(--success)' }}>
                        Add
                    </button>
                </div>

                {/* Recent players */}
                {recentPlayers.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                            Recent Players
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {recentPlayers
                                .filter(p => !players.find(selected => selected.id === p.id))
                                .map(player => (
                                    <button
                                        key={player.id}
                                        className="btn"
                                        onClick={() => addRecentPlayer(player)}
                                        style={{
                                            fontSize: '0.875rem',
                                            padding: '0.5rem 1rem',
                                            backgroundColor: 'var(--info)'
                                        }}
                                    >
                                        {player.name}
                                    </button>
                                ))}
                        </div>
                    </div>
                )}

                {/* Selected players */}
                {players.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                            Selected Players ({players.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {players.map(player => (
                                <div
                                    key={player.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem',
                                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--primary)'
                                    }}
                                >
                                    <span style={{ fontWeight: 500 }}>{player.name}</span>
                                    <button
                                        className="btn"
                                        onClick={() => removePlayer(player.id)}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            fontSize: '0.875rem',
                                            backgroundColor: 'var(--danger)',
                                            minHeight: 'auto'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

