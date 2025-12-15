'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCompletedRounds, getLocalRounds, Round } from '@/lib/rounds';
import { calculateOverallStatistics, OverallStatistics, getScoreDisplay, getScoreColor } from '@/lib/statistics';

export default function StatisticsDashboard() {
    const [stats, setStats] = useState<OverallStatistics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStatistics();
    }, []);

    const loadStatistics = async () => {
        setLoading(true);
        try {
            let rounds: Round[] = [];
            try {
                rounds = await getCompletedRounds(200);
            } catch {
                rounds = getLocalRounds();
            }

            const overallStats = calculateOverallStatistics(rounds);
            setStats(overallStats);
        } catch (error) {
            console.error('Error loading statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <main className="container">
                <p>Loading statistics...</p>
            </main>
        );
    }

    if (!stats || stats.totalRounds === 0) {
        return (
            <main className="container">
                <div style={{ marginBottom: '1rem' }}>
                    <Link href="/" style={{ color: 'var(--info)', textDecoration: 'none' }}>
                        ← Back to Home
                    </Link>
                </div>
                <h1>Statistics</h1>
                <div className="card">
                    <p>No statistics available yet. Play some rounds to see your stats!</p>
                </div>
            </main>
        );
    }

    return (
        <main className="container">
            <div style={{ marginBottom: '1rem' }}>
                <Link href="/" style={{ color: 'var(--info)', textDecoration: 'none' }}>
                    ← Back to Home
                </Link>
            </div>

            <h1>Statistics Dashboard</h1>

            {/* Overview Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '1rem', 
                marginBottom: '2rem' 
            }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {stats.totalRounds}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                        Total Rounds
                    </div>
                </div>

                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {stats.totalPlayers}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                        Total Players
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
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {stats.roundsThisMonth}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                        This Month
                    </div>
                </div>

                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {stats.roundsThisYear}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                        This Year
                    </div>
                </div>
            </div>

            {/* Best Round */}
            {stats.bestRound && stats.bestRound.playerName && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3>🏆 Best Round</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            {stats.bestRound.playerName} - {getScoreDisplay(stats.bestRound.score)}
                        </div>
                        <div style={{ color: 'var(--text-light)' }}>
                            {stats.bestRound.course} • {new Date(stats.bestRound.date).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            )}

            {/* Most Played Course */}
            {stats.mostPlayedCourse && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3>📍 Most Played Course</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            {stats.mostPlayedCourse}
                        </div>
                        <div style={{ color: 'var(--text-light)' }}>
                            {stats.mostPlayedCourseCount} {stats.mostPlayedCourseCount === 1 ? 'round' : 'rounds'}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            {stats.recentActivity.length > 0 && (
                <div className="card">
                    <h3>Recent Activity</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                        {stats.recentActivity.map((round) => (
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
                                        {round.playerNames ? Object.values(round.playerNames).join(', ') : round.players.length + ' players'} • {new Date(round.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                    View →
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </main>
    );
}





