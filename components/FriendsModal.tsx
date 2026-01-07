'use client';

import { useState, useEffect } from 'react';
import { Friend } from '@/types/firestore';
import {
    getFriends,
    removeFriend,
    searchFriends,
    getSuggestedFriends
} from '@/lib/friends';
import { searchUsers } from '@/lib/users';
import { addFriend as addFriendAPI } from '@/lib/friends';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '@/types/firestore';

interface FriendsModalProps {
    onClose: () => void;
    currentUser: FirebaseUser;
    onAddPlayerToRound?: (friend: Friend) => void; // Optional: for adding friends to current round
}

export default function FriendsModal({ onClose, currentUser, onAddPlayerToRound }: FriendsModalProps) {
    const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'suggestions'>('friends');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [suggestions, setSuggestions] = useState<User[]>([]);
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load friends on mount
    useEffect(() => {
        loadFriends();
    }, [currentUser]);

    // Load suggestions when suggestions tab is opened
    useEffect(() => {
        if (activeTab === 'suggestions') {
            loadSuggestions();
        }
    }, [activeTab]);

    // Search debounce
    useEffect(() => {
        if (activeTab === 'search' && searchQuery.trim()) {
            const timer = setTimeout(() => {
                handleSearch();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, activeTab]);

    const loadFriends = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const friendsList = await getFriends(currentUser.uid);
            setFriends(friendsList);
        } catch (err) {
            setError('Failed to load friends');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadSuggestions = async () => {
        setIsLoading(true);
        try {
            const suggested = await getSuggestedFriends(currentUser.uid);
            setSuggestions(suggested);
        } catch (err) {
            console.error('Error loading suggestions:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const results = await searchUsers(searchQuery);
            // Filter out current user and existing friends
            const friendIds = friends.map(f => f.id);
            const filtered = results.filter(
                u => u.uid !== currentUser.uid && !friendIds.includes(u.uid)
            );
            setSearchResults(filtered);
        } catch (err) {
            setError('Search failed');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddFriend = async (userId: string) => {
        try {
            await addFriendAPI(currentUser.uid, userId);
            await loadFriends(); // Refresh friends list
            setSearchQuery(''); // Clear search
            setSearchResults([]);
            setActiveTab('friends'); // Switch to friends tab
        } catch (err) {
            setError('Failed to add friend');
            console.error(err);
        }
    };

    const handleRemoveFriend = async (friendId: string) => {
        if (!confirm('Remove this friend?')) return;

        try {
            await removeFriend(currentUser.uid, friendId);
            await loadFriends(); // Refresh friends list
        } catch (err) {
            setError('Failed to remove friend');
            console.error(err);
        }
    };

    const formatLastPlayed = (dateString?: string) => {
        if (!dateString) return 'Never played together';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    };

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}
        >
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--background)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Friends</h2>
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

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('friends')}
                        style={{
                            backgroundColor: activeTab === 'friends' ? 'var(--primary)' : 'var(--border)',
                            fontSize: '0.875rem',
                            padding: '0.5rem 1rem'
                        }}
                    >
                        My Friends ({friends.length})
                    </button>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('search')}
                        style={{
                            backgroundColor: activeTab === 'search' ? 'var(--primary)' : 'var(--border)',
                            fontSize: '0.875rem',
                            padding: '0.5rem 1rem'
                        }}
                    >
                        Search Users
                    </button>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('suggestions')}
                        style={{
                            backgroundColor: activeTab === 'suggestions' ? 'var(--primary)' : 'var(--border)',
                            fontSize: '0.875rem',
                            padding: '0.5rem 1rem'
                        }}
                    >
                        Suggestions
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--danger)',
                        borderRadius: '6px',
                        marginBottom: '1rem',
                        color: 'white'
                    }}>
                        {error}
                    </div>
                )}

                {/* Friends Tab */}
                {activeTab === 'friends' && (
                    <div>
                        {isLoading ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading friends...</p>
                        ) : friends.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                <p>No friends yet</p>
                                <p style={{ fontSize: '0.875rem' }}>Search for users to add friends</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {friends.map(friend => (
                                    <div
                                        key={friend.id}
                                        style={{
                                            padding: '1rem',
                                            backgroundColor: 'var(--surface)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem'
                                        }}
                                    >
                                        {/* Photo */}
                                        {friend.photoURL ? (
                                            <img
                                                src={friend.photoURL}
                                                alt={friend.displayName}
                                                style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '50%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.5rem',
                                                    fontWeight: 'bold',
                                                    color: 'white'
                                                }}
                                            >
                                                {friend.displayName.charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        {/* Info */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                                {friend.displayName}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                {friend.roundsPlayedTogether > 0
                                                    ? `${friend.roundsPlayedTogether} rounds together`
                                                    : 'No rounds yet'}
                                                {' • '}
                                                {formatLastPlayed(friend.lastPlayedTogether)}
                                            </div>
                                            {friend.stats && (
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    Avg: {friend.stats.averageScore > 0 ? `+${friend.stats.averageScore.toFixed(1)}` : friend.stats.averageScore.toFixed(1)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {onAddPlayerToRound && (
                                                <button
                                                    className="btn"
                                                    onClick={() => onAddPlayerToRound(friend)}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        fontSize: '0.875rem',
                                                        minHeight: 'auto'
                                                    }}
                                                >
                                                    Add to Round
                                                </button>
                                            )}
                                            <button
                                                className="btn"
                                                onClick={() => handleRemoveFriend(friend.id)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    fontSize: '0.875rem',
                                                    backgroundColor: 'var(--danger)',
                                                    minHeight: 'auto'
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Search Tab */}
                {activeTab === 'search' && (
                    <div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                marginBottom: '1rem',
                                fontSize: '1rem',
                                backgroundColor: 'var(--surface)'
                            }}
                        />

                        {isLoading ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Searching...</p>
                        ) : searchResults.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                {searchQuery.trim() ? 'No users found' : 'Enter a name or email to search'}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {searchResults.map(user => (
                                    <div
                                        key={user.uid}
                                        style={{
                                            padding: '1rem',
                                            backgroundColor: 'var(--surface)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem'
                                        }}
                                    >
                                        {/* Photo */}
                                        {user.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt={user.displayName}
                                                style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '50%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.5rem',
                                                    fontWeight: 'bold',
                                                    color: 'white'
                                                }}
                                            >
                                                {user.displayName.charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        {/* Info */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                                {user.displayName}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                {user.email}
                                            </div>
                                            {user.stats && user.stats.roundsPlayed > 0 && (
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    {user.stats.roundsPlayed} rounds played
                                                </div>
                                            )}
                                        </div>

                                        {/* Action */}
                                        <button
                                            className="btn"
                                            onClick={() => handleAddFriend(user.uid)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                fontSize: '0.875rem',
                                                minHeight: 'auto'
                                            }}
                                        >
                                            Add Friend
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Suggestions Tab */}
                {activeTab === 'suggestions' && (
                    <div>
                        {isLoading ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading suggestions...</p>
                        ) : suggestions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                <p>No suggestions</p>
                                <p style={{ fontSize: '0.875rem' }}>Play with other users to get friend suggestions!</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                    Users you've played with:
                                </p>
                                {suggestions.map(user => (
                                    <div
                                        key={user.uid}
                                        style={{
                                            padding: '1rem',
                                            backgroundColor: 'var(--surface)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem'
                                        }}
                                    >
                                        {/* Photo */}
                                        {user.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt={user.displayName}
                                                style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '50%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.5rem',
                                                    fontWeight: 'bold',
                                                    color: 'white'
                                                }}
                                            >
                                                {user.displayName.charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        {/* Info */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                                {user.displayName}
                                            </div>
                                            {user.stats && user.stats.roundsPlayed > 0 && (
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    {user.stats.roundsPlayed} rounds played
                                                </div>
                                            )}
                                        </div>

                                        {/* Action */}
                                        <button
                                            className="btn"
                                            onClick={() => handleAddFriend(user.uid)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                fontSize: '0.875rem',
                                                minHeight: 'auto'
                                            }}
                                        >
                                            Add Friend
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
