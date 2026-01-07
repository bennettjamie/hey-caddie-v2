'use client';

import { useState, useEffect } from 'react';
import { getAllPlayers, getLocalPlayers, getOrCreatePlayerByName, Player as PlayerType } from '@/lib/players';
import { getFriends, getRecentlyPlayedWith } from '@/lib/friends';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Friend } from '@/types/firestore';

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
    const [newPlayerEmail, setNewPlayerEmail] = useState('');
    const [recentPlayers, setRecentPlayers] = useState<Player[]>([]);
    const [activeTab, setActiveTab] = useState<'recent' | 'friends' | 'all'>('recent');
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [allPlayers, setAllPlayers] = useState<PlayerType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Auth state listener
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        loadPlayers();
    }, []);

    // Load friends when user is authenticated and Friends tab is active
    useEffect(() => {
        if (currentUser && activeTab === 'friends') {
            loadFriends();
        }
    }, [currentUser, activeTab]);

    // Load all players when All tab is active
    useEffect(() => {
        if (activeTab === 'all') {
            loadAllPlayers();
        }
    }, [activeTab]);

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

    const loadFriends = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        try {
            const friendsList = await getRecentlyPlayedWith(currentUser.uid, 20);
            setFriends(friendsList);
        } catch (error) {
            console.error('Error loading friends:', error);
            setFriends([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAllPlayers = async () => {
        setIsLoading(true);
        try {
            const playersList = await getAllPlayers(100);
            setAllPlayers(playersList);
        } catch (error) {
            console.error('Error loading all players:', error);
            setAllPlayers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const addPlayer = async () => {
        if (newPlayerName.trim() && !players.find(p => p.name.toLowerCase() === newPlayerName.toLowerCase())) {
            try {
                // Try to get or create player in Firebase
                const player = await getOrCreatePlayerByName(newPlayerName.trim(), undefined, newPlayerEmail.trim() || undefined);
                const newPlayer: Player = {
                    id: player.id,
                    name: player.name
                };
                const updated = [...players, newPlayer];
                setPlayers(updated);
                setNewPlayerName('');
                setNewPlayerEmail('');
                onSelect(updated);
                saveRecentPlayer(newPlayer);
            } catch (error) {
                console.error('Error adding player:', error);
                // Fallback to local player
                const newPlayer: Player = {
                    id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: newPlayerName.trim()
                };
                // Note: Local players won't persist email effectively without schema update, but that's okay for offline fallback
                const updated = [...players, newPlayer];
                setPlayers(updated);
                setNewPlayerName('');
                setNewPlayerEmail('');
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

    const addFriendToRound = async (friend: Friend) => {
        // Check if friend has a linked player
        if (friend.playerId) {
            // Use their existing player record
            const player: Player = {
                id: friend.playerId,
                name: friend.displayName
            };
            if (!players.find(p => p.id === player.id)) {
                const updated = [...players, player];
                setPlayers(updated);
                onSelect(updated);
                saveRecentPlayer(player);
            }
        } else {
            // Create a new player for this friend
            try {
                const player = await getOrCreatePlayerByName(friend.displayName, friend.id, friend.email);
                const newPlayer: Player = {
                    id: player.id,
                    name: player.name
                };
                if (!players.find(p => p.id === newPlayer.id)) {
                    const updated = [...players, newPlayer];
                    setPlayers(updated);
                    onSelect(updated);
                    saveRecentPlayer(newPlayer);
                }
            } catch (error) {
                console.error('Error adding friend to round:', error);
            }
        }
    };

    const addAllPlayerToRound = (player: PlayerType) => {
        const newPlayer: Player = {
            id: player.id,
            name: player.name
        };
        if (!players.find(p => p.id === newPlayer.id)) {
            const updated = [...players, newPlayer];
            setPlayers(updated);
            onSelect(updated);
            saveRecentPlayer(newPlayer);
        }
    };

    const formatLastPlayedDate = (dateString?: string): string => {
        if (!dateString) return 'Never';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 5) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div>
            <div className="card">
                <h2>Select Players</h2>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    borderBottom: '2px solid var(--border)',
                    paddingBottom: '0.5rem'
                }}>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('recent')}
                        style={{
                            flex: 1,
                            backgroundColor: activeTab === 'recent' ? 'var(--primary)' : 'var(--surface)',
                            color: activeTab === 'recent' ? 'white' : 'var(--text)',
                            borderBottom: activeTab === 'recent' ? '2px solid var(--primary)' : 'none',
                            minHeight: 'auto',
                            padding: '0.75rem'
                        }}
                    >
                        Recent
                    </button>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('friends')}
                        style={{
                            flex: 1,
                            backgroundColor: activeTab === 'friends' ? 'var(--primary)' : 'var(--surface)',
                            color: activeTab === 'friends' ? 'white' : 'var(--text)',
                            borderBottom: activeTab === 'friends' ? '2px solid var(--primary)' : 'none',
                            minHeight: 'auto',
                            padding: '0.75rem'
                        }}
                    >
                        Friends {currentUser && friends.length > 0 && `(${friends.length})`}
                    </button>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('all')}
                        style={{
                            flex: 1,
                            backgroundColor: activeTab === 'all' ? 'var(--primary)' : 'var(--surface)',
                            color: activeTab === 'all' ? 'white' : 'var(--text)',
                            borderBottom: activeTab === 'all' ? '2px solid var(--primary)' : 'none',
                            minHeight: 'auto',
                            padding: '0.75rem'
                        }}
                    >
                        All
                    </button>
                </div>

                {/* Add new player (always visible) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Player Name"
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
                        <input
                            type="email"
                            placeholder="Email (Optional)"
                            value={newPlayerEmail}
                            onChange={(e) => setNewPlayerEmail(e.target.value)}
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
                </div>

                {/* Tab Content */}
                <div style={{ marginTop: '1rem' }}>
                    {/* Recent Tab */}
                    {activeTab === 'recent' && (
                        <>
                            {recentPlayers.length > 0 ? (
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
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    <p>No recent players yet. Add someone to get started!</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Friends Tab */}
                    {activeTab === 'friends' && (
                        <>
                            {!currentUser ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    <p>Sign in to see your friends</p>
                                </div>
                            ) : isLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    <p>Loading friends...</p>
                                </div>
                            ) : friends.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {friends
                                        .filter(f => !players.find(p => p.id === f.playerId || p.name === f.displayName))
                                        .map(friend => (
                                            <div
                                                key={friend.id}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '0.75rem',
                                                    backgroundColor: 'var(--surface)',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)'
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                                        {friend.displayName}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        {friend.lastPlayedTogether
                                                            ? `Played ${formatLastPlayedDate(friend.lastPlayedTogether)}`
                                                            : 'Never played together'}
                                                        {friend.roundsPlayedTogether > 0 && (
                                                            <span> • {friend.roundsPlayedTogether} round{friend.roundsPlayedTogether !== 1 ? 's' : ''}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn"
                                                    onClick={() => addFriendToRound(friend)}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        fontSize: '0.875rem',
                                                        backgroundColor: 'var(--primary)',
                                                        minHeight: 'auto'
                                                    }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    <p>No friends yet</p>
                                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                        Add friends in the Friends page to quickly add them to rounds
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* All Players Tab */}
                    {activeTab === 'all' && (
                        <>
                            {isLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    <p>Loading players...</p>
                                </div>
                            ) : allPlayers.length > 0 ? (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {allPlayers
                                        .filter(p => !players.find(selected => selected.id === p.id))
                                        .map(player => (
                                            <button
                                                key={player.id}
                                                className="btn"
                                                onClick={() => addAllPlayerToRound(player)}
                                                style={{
                                                    fontSize: '0.875rem',
                                                    padding: '0.5rem 1rem',
                                                    backgroundColor: 'var(--border)'
                                                }}
                                            >
                                                {player.name}
                                            </button>
                                        ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    <p>No players found</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

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

