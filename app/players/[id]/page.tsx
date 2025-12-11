'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPlayer, Player } from '@/lib/players';
import { getCompletedRounds, getLocalRounds, Round } from '@/lib/rounds';
import { calculatePlayerStatistics, PlayerStatistics, getScoreDisplay, getScoreColor } from '@/lib/statistics';

export default function PlayerProfile() {
    const params = useParams();
    const playerId = params.id as string;
    
    const [player, setPlayer] = useState<Player | null>(null);
    const [stats, setStats] = useState<PlayerStatistics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPlayerData();
    }, [playerId]);

    const loadPlayerData = async () => {
        setLoading(true);
        try {
            // Load player
            const playerData = await getPlayer(playerId);
            setPlayer(playerData);

            // Load rounds
            let rounds: Round[] = [];
            try {
                rounds = await getCompletedRounds(100);
            } catch {
                rounds = getLocalRounds();
            }

            // Calculate statistics
            if (rounds.length > 0) {
                const playerStats = await calculatePlayerStatistics(playerId, rounds);
                setStats(playerStats);
            }
        } catch (error) {
            console.error('Error loading player data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <main className="container">
                <p>Loading player profile...</p>
            </main>
        );
    }

    if (!player) {
        return (
            <main className="container">
                <h1>Player Not Found</h1>
                <Link href="/history" className="btn" style={{ backgroundColor: 'var(--info)' }}>
                    Back to History
                </Link>
            </main>
        );
    }

    return (
        <main className="container">
            <div style={{ marginBottom: '1rem' }}>
                <Link href="/history" style={{ color: 'var(--info)', textDecoration: 'none' }}>
                    ← Back to History
                </Link>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h1>{player.name}</h1>
                {player.email && (
                    <p style={{ color: 'var(--text-light)' }}>{player.email}</p>
                )}
            </div>

            {stats ? (
                <>
                    {/* Key Statistics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                {stats.totalRounds}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                Rounds Played
                            </div>
                        </div>

                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ 
                                fontSize: '2rem', 
                                fontWeight: 'bold', 
                                color: getScoreColor(stats.averageScore) 
                            }}>
                                {getScoreDisplay(stats.averageScore)}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                Average Score
                            </div>
                        </div>

                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ 
                                fontSize: '2rem', 
                                fontWeight: 'bold', 
                                color: getScoreColor(stats.bestRound) 
                            }}>
                                {getScoreDisplay(stats.bestRound)}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                Best Round
                            </div>
                            {stats.bestCourse && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                    {stats.bestCourse}
                                </div>
                            )}
                        </div>

                        {stats.improvementTrend !== 0 && (
                            <div className="card" style={{ textAlign: 'center' }}>
                                <div style={{ 
                                    fontSize: '2rem', 
                                    fontWeight: 'bold',
                                    color: stats.improvementTrend > 0 ? 'var(--success)' : 'var(--danger)'
                                }}>
                                    {stats.improvementTrend > 0 ? '↓' : '↑'} {Math.abs(stats.improvementTrend).toFixed(1)}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                    {stats.improvementTrend > 0 ? 'Improving' : 'Declining'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Recent Rounds */}
                    {stats.recentRounds.length > 0 && (
                        <div className="card" style={{ marginBottom: '2rem' }}>
                            <h3>Recent Rounds</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                                {stats.recentRounds.map((round) => {
                                    const roundTotal = Object.values(round.scores || {}).reduce((sum, hole) => 
                                        sum + (hole[playerId] || 0), 0);

                                    return (
                                        <Link
                                            key={round.id}
                                            href={`/history?round=${round.id}`}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.75rem',
                                                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                color: 'inherit'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 500 }}>
                                                    {round.courseName || round.courseId}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                                    {new Date(round.date).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div style={{ 
                                                fontSize: '1.25rem', 
                                                fontWeight: 'bold',
                                                color: getScoreColor(roundTotal)
                                            }}>
                                                {getScoreDisplay(roundTotal)}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Courses Played */}
                    {Object.keys(stats.roundsByCourse).length > 0 && (
                        <div className="card">
                            <h3>Courses Played</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                                {Object.entries(stats.roundsByCourse)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([courseId, count]) => {
                                        const round = stats.recentRounds.find(r => r.courseId === courseId);
                                        const courseName = round?.courseName || courseId;
                                        return (
                                            <div
                                                key={courseId}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '0.75rem',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                    borderRadius: '6px'
                                                }}
                                            >
                                                <span>{courseName}</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                                    {count} {count === 1 ? 'round' : 'rounds'}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="card">
                    <p>No statistics available. Play some rounds to see your stats!</p>
                </div>
            )}
        </main>
    );
}

