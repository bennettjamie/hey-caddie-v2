'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCompletedRounds, getLocalRounds, Round } from '@/lib/rounds';
import { getCourse } from '@/lib/courses';

export default function RoundHistory() {
    const [rounds, setRounds] = useState<Round[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRound, setSelectedRound] = useState<Round | null>(null);

    useEffect(() => {
        loadRounds();
    }, []);

    const loadRounds = async () => {
        setLoading(true);
        try {
            // Try Firebase first
            const firebaseRounds = await getCompletedRounds(50);
            if (firebaseRounds.length > 0) {
                setRounds(firebaseRounds);
            } else {
                // Fallback to local storage
                const localRounds = getLocalRounds();
                setRounds(localRounds);
            }
        } catch (error) {
            console.error('Error loading rounds:', error);
            // Fallback to local storage
            const localRounds = getLocalRounds();
            setRounds(localRounds);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const calculateTotalScore = (round: Round, playerId: string): number => {
        let total = 0;
        Object.keys(round.scores || {}).forEach((holeNum) => {
            const holeScores = round.scores[parseInt(holeNum)];
            if (holeScores && holeScores[playerId] !== undefined) {
                total += holeScores[playerId];
            }
        });
        return total;
    };

    const getScoreDisplay = (score: number): string => {
        if (score === 0) return 'E';
        if (score < 0) return `${Math.abs(score)}`;
        return `+${score}`;
    };

    if (loading) {
        return (
            <main className="container">
                <h1>Round History</h1>
                <p>Loading...</p>
            </main>
        );
    }

    if (selectedRound) {
        return (
            <main className="container">
                <div style={{ marginBottom: '1rem' }}>
                    <button
                        className="btn"
                        onClick={() => setSelectedRound(null)}
                        style={{ backgroundColor: 'var(--info)' }}
                    >
                        ← Back to History
                    </button>
                </div>
                <RoundDetail round={selectedRound} />
            </main>
        );
    }

    return (
        <main className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1>Round History</h1>
                <Link href="/" className="btn" style={{ backgroundColor: 'var(--primary)' }}>
                    New Round
                </Link>
            </div>

            {rounds.length === 0 ? (
                <div className="card">
                    <p>No completed rounds yet. Start playing to see your history here!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {rounds.map((round) => (
                        <div
                            key={round.id}
                            className="card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedRound(round)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ marginBottom: '0.25rem' }}>
                                        {round.courseName || round.courseId}
                                    </h3>
                                    {round.layoutName && (
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                            {round.layoutName}
                                        </p>
                                    )}
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                        {formatDate(round.date)}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                        {round.players.length} {round.players.length === 1 ? 'player' : 'players'}
                                    </div>
                                    {round.playerNames && Object.keys(round.playerNames).length > 0 && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                            {Object.entries(round.playerNames).slice(0, 3).map(([playerId, name]) => (
                                                <Link
                                                    key={playerId}
                                                    href={`/players/${playerId}`}
                                                    style={{ 
                                                        color: 'var(--info)', 
                                                        textDecoration: 'none',
                                                        marginRight: '0.25rem'
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {name}
                                                </Link>
                                            ))}
                                            {Object.keys(round.playerNames).length > 3 && '...'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}

function RoundDetail({ round }: { round: Round }) {
    const [course, setCourse] = useState<any>(null);
    const [playerNames, setPlayerNames] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        loadCourseData();
    }, [round]);

    const loadCourseData = async () => {
        try {
            const courseData = await getCourse(round.courseId);
            setCourse(courseData);
        } catch (error) {
            console.error('Error loading course:', error);
        }
        
        // Use denormalized names or fallback to IDs
        if (round.playerNames) {
            setPlayerNames(round.playerNames);
        } else {
            // Create default names from IDs
            const names: { [key: string]: string } = {};
            round.players.forEach((id, index) => {
                names[id] = `Player ${index + 1}`;
            });
            setPlayerNames(names);
        }
    };

    const calculateTotalScore = (playerId: string): number => {
        let total = 0;
        Object.keys(round.scores || {}).forEach((holeNum) => {
            const holeScores = round.scores[parseInt(holeNum)];
            if (holeScores && holeScores[playerId] !== undefined) {
                total += holeScores[playerId];
            }
        });
        return total;
    };

    const getScoreDisplay = (score: number): string => {
        if (score === 0) return 'E';
        if (score < 0) return `${Math.abs(score)}`;
        return `+${score}`;
    };

    const getScoreColor = (score: number): string => {
        if (score < 0) return 'var(--success)';
        if (score === 0) return 'var(--info)';
        return 'var(--danger)';
    };

    // Get all holes (1-18 or based on course layout)
    const maxHole = course?.layouts?.[round.layoutId]?.parTotal 
        ? Object.keys(course.layouts[round.layoutId].holes || {}).length
        : 18;

    return (
        <div>
            <h1>{round.courseName || round.courseId}</h1>
            {round.layoutName && <p style={{ color: 'var(--text-light)' }}>{round.layoutName}</p>}
            <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>
                {new Date(round.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}
            </p>

            {/* Leaderboard Summary */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <h3>Final Scores</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {round.players
                        .map((playerId) => ({
                            id: playerId,
                            name: playerNames[playerId] || playerId,
                            total: calculateTotalScore(playerId)
                        }))
                        .sort((a, b) => a.total - b.total)
                        .map((player, index) => (
                            <div
                                key={player.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.5rem',
                                    background: index === 0 ? 'rgba(0, 242, 96, 0.1)' : 'transparent',
                                    borderRadius: '6px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>
                                        #{index + 1}
                                    </span>
                                    <span>{player.name}</span>
                                </div>
                                <span
                                    style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 'bold',
                                        color: getScoreColor(player.total)
                                    }}
                                >
                                    {getScoreDisplay(player.total)}
                                </span>
                            </div>
                        ))}
                </div>
            </div>

            {/* Scorecard */}
            <div className="card">
                <h3>Scorecard</h3>
                <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Hole</th>
                                {round.players.map((playerId) => (
                                    <th key={playerId} style={{ textAlign: 'center', padding: '0.5rem' }}>
                                        {playerNames[playerId] || playerId}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: maxHole }, (_, i) => i + 1).map((holeNum) => {
                                const holeScores = round.scores[holeNum] || {};
                                return (
                                    <tr key={holeNum} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{holeNum}</td>
                                        {round.players.map((playerId) => {
                                            const score = holeScores[playerId];
                                            return (
                                                <td
                                                    key={playerId}
                                                    style={{
                                                        textAlign: 'center',
                                                        padding: '0.5rem',
                                                        color: score !== undefined ? getScoreColor(score) : 'var(--text-light)'
                                                    }}
                                                >
                                                    {score !== undefined ? getScoreDisplay(score) : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                                <td style={{ padding: '0.5rem' }}>Total</td>
                                {round.players.map((playerId) => {
                                    const total = calculateTotalScore(playerId);
                                    return (
                                        <td
                                            key={playerId}
                                            style={{
                                                textAlign: 'center',
                                                padding: '0.5rem',
                                                color: getScoreColor(total)
                                            }}
                                        >
                                            {getScoreDisplay(total)}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

