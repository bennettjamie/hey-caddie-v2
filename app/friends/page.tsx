'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Friend, User } from '@/types/firestore';
import {
    getFriends,
    removeFriend,
    getRecentlyPlayedWith,
    getMutualFriends
} from '@/lib/friends';

export default function FriendsPage() {
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'recent'>('all');

    // Auth state
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                loadFriends(user.uid);
            } else {
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const loadFriends = async (userId: string) => {
        setIsLoading(true);
        try {
            const [allFriends, recentFriends] = await Promise.all([
                getFriends(userId),
                getRecentlyPlayedWith(userId, 10)
            ]);
            setFriends(allFriends);
            setRecentlyPlayed(recentFriends);
        } catch (error) {
            console.error('Error loading friends:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveFriend = async (friendId: string) => {
        if (!currentUser) return;
        if (!confirm('Remove this friend?')) return;

        try {
            await removeFriend(currentUser.uid, friendId);
            await loadFriends(currentUser.uid);
        } catch (error) {
            console.error('Error removing friend:', error);
            alert('Failed to remove friend');
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

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString();
    };

    // Not logged in
    if (!currentUser && !isLoading) {
        return (
            <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <h1 style={{ marginBottom: '1rem' }}>Friends</h1>
                    <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                        Sign in to view and manage your friends
                    </p>
                    <Link href="/" className="btn" style={{ display: 'inline-block' }}>
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    const displayedFriends = activeTab === 'recent' ? recentlyPlayed : friends;

    return (
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>Friends</h1>
                <Link href="/" className="btn">
                    Home
                </Link>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading friends...</p>
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '1rem',
                            marginBottom: '2rem'
                        }}
                    >
                        <div
                            style={{
                                padding: '1.5rem',
                                backgroundColor: 'var(--surface)',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                {friends.length}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                Total Friends
                            </div>
                        </div>
                        <div
                            style={{
                                padding: '1.5rem',
                                backgroundColor: 'var(--surface)',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                {recentlyPlayed.length}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                Recently Played
                            </div>
                        </div>
                        <div
                            style={{
                                padding: '1.5rem',
                                backgroundColor: 'var(--surface)',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                {friends.reduce((sum, f) => sum + (f.roundsPlayedTogether || 0), 0)}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                Rounds Together
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <button
                            className="btn"
                            onClick={() => setActiveTab('all')}
                            style={{
                                backgroundColor: activeTab === 'all' ? 'var(--primary)' : 'var(--border)',
                                flex: 1
                            }}
                        >
                            All Friends ({friends.length})
                        </button>
                        <button
                            className="btn"
                            onClick={() => setActiveTab('recent')}
                            style={{
                                backgroundColor: activeTab === 'recent' ? 'var(--primary)' : 'var(--border)',
                                flex: 1
                            }}
                        >
                            Recently Played ({recentlyPlayed.length})
                        </button>
                    </div>

                    {/* Friends List */}
                    {displayedFriends.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
                            <p style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>
                                {activeTab === 'recent' ? 'No recent activity' : 'No friends yet'}
                            </p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                                {activeTab === 'recent'
                                    ? 'Play rounds with your friends to see them here!'
                                    : 'Add friends to connect with other disc golfers'}
                            </p>
                            {activeTab === 'all' && (
                                <Link href="/" className="btn">
                                    Start a Round
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {displayedFriends.map((friend) => (
                                <div
                                    key={friend.id}
                                    style={{
                                        padding: '1.5rem',
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
                                                width: '64px',
                                                height: '64px',
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                flexShrink: 0
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: '64px',
                                                height: '64px',
                                                borderRadius: '50%',
                                                backgroundColor: 'var(--primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '2rem',
                                                fontWeight: 'bold',
                                                color: 'white',
                                                flexShrink: 0
                                            }}
                                        >
                                            {friend.displayName.charAt(0).toUpperCase()}
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                            {friend.displayName}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                            {friend.email}
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            <span>
                                                {friend.roundsPlayedTogether > 0
                                                    ? `${friend.roundsPlayedTogether} ${friend.roundsPlayedTogether === 1 ? 'round' : 'rounds'} together`
                                                    : 'No rounds yet'}
                                            </span>
                                            <span>•</span>
                                            <span>{formatLastPlayed(friend.lastPlayedTogether)}</span>
                                        </div>
                                        {friend.stats && (
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                Avg: {friend.stats.averageScore > 0 ? `+${friend.stats.averageScore.toFixed(1)}` : friend.stats.averageScore.toFixed(1)}
                                            </div>
                                        )}
                                        {friend.stats && friend.stats.bestRound !== undefined && (
                                            <div style={{ fontSize: '0.875rem', color: 'var(--success)', marginTop: '0.25rem' }}>
                                                Best: {friend.stats.bestRound > 0 ? `+${friend.stats.bestRound}` : friend.stats.bestRound}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                                        {friend.playerId && (
                                            <Link
                                                href={`/players/${friend.playerId}`}
                                                className="btn"
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    fontSize: '0.875rem',
                                                    minHeight: 'auto',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                View Profile
                                            </Link>
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
                </>
            )}
        </div>
    );
}
