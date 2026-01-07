'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { calculateSkins, calculateNassau, calculateFundatory } from '@/lib/betting';
import { calculateRoundMRTZ } from '@/lib/mrtz';
import { AchievementType } from '@/lib/stats';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import StatsClaimModal from './StatsClaimModal';

// Helper for highlights
function HighlightsSection({ stats, players }: { stats: any[], players: any[] }) {
    if (!stats || stats.length === 0) return null;

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', color: '#fbbf24' }}>
                Highlights ✨
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.map((stat, idx) => {
                    const player = players.find((p: any) => p.id === stat.playerId);
                    if (!player) return null;

                    return (
                        <div key={idx} style={{
                            padding: '0.75rem',
                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(251, 191, 36, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>
                                {stat.type === 'PERSONAL_BEST' ? '🏆' : '🔥'}
                            </span>
                            <div>
                                <div style={{ fontWeight: 'bold', color: '#F8FAFC' }}>
                                    {player.name}
                                </div>
                                <div style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
                                    {stat.details}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface RoundFinalSummaryProps {
    onClose: () => void;
    finalRoundData?: any; // Optional final round data if round was already ended
    roundId?: string; // Round ID for stats claims
}

export default function RoundFinalSummary({ onClose, finalRoundData, roundId }: RoundFinalSummaryProps) {
    const { currentRound: contextRound, activeBets: contextBets = {}, fundatoryBets: contextFundatoryBets, players: contextPlayers, roundAchievements: contextRoundAchievements } = useGame();

    // State for auth and claim modal
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [hasShownAutoModal, setHasShownAutoModal] = useState(false);

    // Use finalRoundData if provided (round already ended), otherwise use context
    const currentRound = finalRoundData || contextRound;
    const activeBets = finalRoundData?.bets ? {
        skins: finalRoundData.bets.skins ? { started: true, value: (Object.values(finalRoundData.bets.skins)[0] as any)?.value || 0, participants: undefined } : undefined,
        nassau: finalRoundData.bets.nassau ? { started: true, value: 0, participants: undefined } : undefined
    } : contextBets;
    const fundatoryBets = finalRoundData?.bets?.fundatory || contextFundatoryBets;
    const players = finalRoundData?.players || contextPlayers;

    if (!currentRound) return null;

    // Auth state listener
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    // Find unregistered players (those without userId)
    const unregisteredPlayers = currentRound.players.filter((p: any) => !p.userId);

    // Auto-show claim modal if there are unregistered players and user is authenticated
    useEffect(() => {
        if (currentUser && unregisteredPlayers.length > 0 && !hasShownAutoModal && roundId) {
            // Small delay to let the summary render first
            const timer = setTimeout(() => {
                setShowClaimModal(true);
                setHasShownAutoModal(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentUser, unregisteredPlayers.length, hasShownAutoModal, roundId]);

    const holes = Array.from({ length: 18 }, (_, i) => i + 1);
    const playerIds = currentRound.players.map((p: any) => p.id);

    // Calculate final results
    const skinsResults = activeBets?.skins?.started
        ? calculateSkins(currentRound.scores, holes, activeBets?.skins?.value || 0, activeBets?.skins?.participants)
        : [];

    const nassauResults = activeBets?.nassau?.started
        ? calculateNassau(currentRound.scores, playerIds, activeBets?.nassau?.participants)
        : null;

    const fundatoryResults = fundatoryBets.length > 0
        ? calculateFundatory(fundatoryBets)
        : {};

    // Calculate total MRTZ per player
    const roundMRTZ = calculateRoundMRTZ(
        {
            ...currentRound,
            players: playerIds
        } as any,
        activeBets,
        fundatoryBets
    );

    // Calculate final scores (total relative to par)
    const finalScores: { [playerId: string]: number } = {};
    currentRound.players.forEach((player: any) => {
        let total = 0;
        for (let i = 1; i <= 18; i++) {
            const score = currentRound.scores[i]?.[player.id];
            if (score !== undefined && score !== null) {
                total += score;
            }
        }
        finalScores[player.id] = total;
    });

    // Sort players by final score (lowest first - best score)
    const leaderboard = currentRound.players
        .map((p: any) => ({
            player: p,
            score: finalScores[p.id] || 0,
            mrtz: roundMRTZ[p.id] || 0
        }))
        .sort((a: any, b: any) => a.score - b.score);

    const getScoreDisplay = (score: number): string => {
        if (score === 0) return 'E';
        if (score < 0) return `${score}`;
        return `+${score}`;
    };

    const getScoreColor = (score: number): string => {
        if (score < 0) return 'var(--success)';
        if (score === 0) return 'var(--info)';
        return 'var(--danger)';
    };

    // Calculate settlements (Who pays who)
    const settlements: { from: string; to: string; amount: number }[] = [];
    const balances = { ...roundMRTZ };
    const debtors = Object.entries(balances)
        .filter(([, amount]) => amount < 0)
        .sort(([, a], [, b]) => a - b); // Ascending (most negative first)
    const creditors = Object.entries(balances)
        .filter(([, amount]) => amount > 0)
        .sort(([, a], [, b]) => b - a); // Descending (most positive first)

    let debtorIdx = 0;
    let creditorIdx = 0;

    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
        const [debtorId, debtAmount] = debtors[debtorIdx]; // Negative
        const [creditorId, creditAmount] = creditors[creditorIdx]; // Positive

        const amount = Math.min(Math.abs(debtAmount), creditAmount);

        settlements.push({ from: debtorId, to: creditorId, amount });

        // Adjust remaining
        debtors[debtorIdx][1] += amount;
        creditors[creditorIdx][1] -= amount;

        // Move pointers if settled (using small epsilon for float precision)
        if (Math.abs(debtors[debtorIdx][1]) < 0.01) debtorIdx++;
        if (creditors[creditorIdx][1] < 0.01) creditorIdx++;
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.9)', // Darker background
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '700px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    backgroundColor: '#0F172A', // Deep Slate
                    color: '#F8FAFC',
                    border: '1px solid #334155'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Round Complete! 🎉</h2>
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

                {/* Course Info */}
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    border: '1px solid #334155'
                }}>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#94A3B8' }}>
                        <span style={{ color: '#F8FAFC', fontWeight: 600 }}>Course:</span> {currentRound.course?.name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#94A3B8' }}>
                        <span style={{ color: '#F8FAFC', fontWeight: 600 }}>Layout:</span> {currentRound.course?.selectedLayoutKey || 'Main'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#94A3B8' }}>
                        <span style={{ color: '#F8FAFC', fontWeight: 600 }}>Date:</span> {new Date().toLocaleDateString()}
                    </div>
                </div>

                {/* Final Leaderboard & Scorecards */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>Scorecard</h3>

                    {/* Helper function for rendering 9-hole table */}
                    {[0, 1].map(half => {
                        const startHole = half * 9 + 1;
                        const endHole = startHole + 8;
                        const holeRange = Array.from({ length: 9 }, (_, i) => startHole + i);
                        const label = half === 0 ? "Front 9" : "Back 9";
                        const subtotalLabel = half === 0 ? "Out" : "In";

                        // Calculate Par Total for this 9
                        const parTotal = holeRange.reduce((sum, h) => sum + (currentRound.course?.layouts?.[currentRound.course.selectedLayoutKey || 'default']?.holes?.[h]?.par || 3), 0);

                        return (
                            <div key={label} style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
                                <h4 style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>{label}</h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'center' }}>
                                    <thead>
                                        <tr style={{ color: '#94A3B8' }}>
                                            <th style={{ textAlign: 'left', padding: '0.25rem', minWidth: '80px' }}>Hole</th>
                                            {holeRange.map(h => <th key={h} style={{ padding: '0.25rem' }}>{h}</th>)}
                                            <th style={{ padding: '0.25rem', fontWeight: 'bold', color: '#F8FAFC' }}>{subtotalLabel}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Distance Row */}
                                        <tr style={{ color: '#64748B' }}>
                                            <td style={{ textAlign: 'left', padding: '0.25rem' }}>Dist</td>
                                            {holeRange.map(h => (
                                                <td key={h} style={{ padding: '0.25rem' }}>
                                                    {currentRound.course?.layouts?.[currentRound.course.selectedLayoutKey || 'default']?.holes?.[h]?.distance || '-'}
                                                </td>
                                            ))}
                                            <td></td>
                                        </tr>
                                        {/* Par Row */}
                                        <tr style={{ color: '#F8FAFC', fontWeight: 'bold' }}>
                                            <td style={{ textAlign: 'left', padding: '0.25rem' }}>Par</td>
                                            {holeRange.map(h => (
                                                <td key={h} style={{ padding: '0.25rem' }}>
                                                    {currentRound.course?.layouts?.[currentRound.course.selectedLayoutKey || 'default']?.holes?.[h]?.par || 3}
                                                </td>
                                            ))}
                                            <td style={{ color: 'var(--info)' }}>{parTotal}</td>
                                        </tr>
                                        {/* Player Rows */}
                                        {currentRound.players.map((player: any) => {
                                            const playerScores = holeRange.map(h => currentRound.scores[h]?.[player.id]);
                                            const subtotal = playerScores.reduce((sum: number, s: number) => sum + (typeof s === 'number' ? s : 0), 0); // Relative to par sum
                                            // To show gross score, we'd need to add par. But app stores relative.
                                            // Let's show relative total for now as that's consistent with "E", "+1" etc.
                                            // ACTUALLY, usually scorecards show GROSS scores (3, 4, 5).
                                            // Stored scores are relative (0, 1, -1). We need to convert to Gross for display? 
                                            // User screenshot shows "3 3 2 3...". Apps usually show gross.
                                            // Let's assume we display GROSS scores in table.

                                            // Convert relative to gross for display
                                            const grossScores = holeRange.map(h => {
                                                const rel = currentRound.scores[h]?.[player.id];
                                                if (rel === undefined || rel === null) return null;
                                                const par = currentRound.course?.layouts?.[currentRound.course.selectedLayoutKey || 'default']?.holes?.[h]?.par || 3;
                                                return par + rel;
                                            });
                                            const grossTotal = grossScores.reduce((sum: number, s: number | null) => sum + (s || 0), 0);

                                            return (
                                                <tr key={player.id} style={{ borderTop: '1px solid #334155' }}>
                                                    <td style={{ textAlign: 'left', padding: '0.5rem 0.25rem', fontWeight: 600, color: '#F8FAFC' }}>
                                                        {player.name}
                                                    </td>
                                                    {grossScores.map((score, i) => {
                                                        const h = holeRange[i];
                                                        const par = currentRound.course?.layouts?.[currentRound.course.selectedLayoutKey || 'default']?.holes?.[h]?.par || 3;
                                                        const rel = score !== null ? score - par : 0;

                                                        // Circle for birdie/eagle, Box for bogey
                                                        let style = {};
                                                        if (rel < 0) style = { color: '#fff', backgroundColor: 'var(--success)', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
                                                        else if (rel > 0) style = { backgroundColor: 'var(--danger)', color: '#fff', borderRadius: '4px', padding: '0 4px' };
                                                        else style = { color: '#94A3B8' };

                                                        return (
                                                            <td key={h} style={{ padding: '0.25rem' }}>
                                                                {score !== null ? (
                                                                    <span style={style}>{score}</span>
                                                                ) : '-'}
                                                            </td>
                                                        );
                                                    })}
                                                    <td style={{ fontWeight: 'bold', color: '#F8FAFC' }}>
                                                        {grossTotal > 0 ? grossTotal : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}

                    {/* Total Summary */}
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        {leaderboard.map((entry: any) => (
                            <div key={entry.player.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>{entry.player.name}</span>
                                <span style={{ fontWeight: 'bold', color: getScoreColor(entry.score) }}>
                                    {getScoreDisplay(entry.score)} <span style={{ fontSize: '0.8em', color: '#64748B' }}>Total</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Betting Summary */}
                {(activeBets?.skins?.started || activeBets?.nassau?.started || fundatoryBets.length > 0) && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>Betting Details</h3>
                        {activeBets?.skins?.started && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '8px',
                                marginBottom: '0.75rem',
                                border: '1px solid #334155'
                            }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#F8FAFC' }}>
                                    Skins ({activeBets.skins.value} MRTZ/hole)
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                    {skinsResults.filter(s => s.winnerId).length} holes won
                                    {skinsResults.filter(s => s.isCarryOver).length > 0 && (
                                        <span>, {skinsResults.filter(s => s.isCarryOver).length} carryovers</span>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeBets?.nassau?.started && nassauResults && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '8px',
                                marginBottom: '0.75rem',
                                border: '1px solid #334155'
                            }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#F8FAFC' }}>
                                    Nassau ({activeBets.nassau.value} MRTZ/segment)
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                    Front 9: {nassauResults.front9WinnerId ? currentRound.players.find((p: any) => p.id === nassauResults.front9WinnerId)?.name : 'Tie'}
                                    <br />
                                    Back 9: {nassauResults.back9WinnerId ? currentRound.players.find((p: any) => p.id === nassauResults.back9WinnerId)?.name : 'Tie'}
                                    <br />
                                    Overall: {nassauResults.overallWinnerId ? currentRound.players.find((p: any) => p.id === nassauResults.overallWinnerId)?.name : 'Tie'}
                                </div>
                            </div>
                        )}
                        {fundatoryBets.length > 0 && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '8px',
                                border: '1px solid #334155'
                            }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#F8FAFC' }}>
                                    Fundatory Bets: {fundatoryBets.length}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* HIGHLIGHTS SUMMARY */}
                {/* We need to get achievements from context since they aren't in finalRoundData yet */}
                {/* Note: In a real app we'd save these to the round object in Firestore, but for now we read from context state */}
                <HighlightsSection stats={contextRoundAchievements || []} players={players} />

                {/* SETTLEMENT BREAKDOWN - "Who Owes Who" */}
                {settlements.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', color: 'var(--accent)' }}>Settlements</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {settlements.map((s, idx) => {
                                const fromName = currentRound.players.find((p: any) => p.id === s.from)?.name || 'Unknown';
                                const toName = currentRound.players.find((p: any) => p.id === s.to)?.name || 'Unknown';
                                return (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem',
                                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid var(--danger)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{fromName}</span>
                                            <span style={{ color: '#94A3B8', fontSize: '0.875rem' }}>pays</span>
                                            <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{toName}</span>
                                        </div>
                                        <span style={{
                                            color: 'var(--success)',
                                            fontWeight: 'bold',
                                            fontSize: '1.1rem'
                                        }}>
                                            {s.amount.toFixed(2)} MRTZ
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748B', fontStyle: 'italic' }}>
                            * These transactions have been recorded in the Ledger.
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 'auto' }}>
                    {/* Invite Players Button (shown if there are unregistered players) */}
                    {currentUser && unregisteredPlayers.length > 0 && roundId && (
                        <button
                            className="btn"
                            onClick={() => setShowClaimModal(true)}
                            style={{
                                width: '100%',
                                backgroundColor: 'var(--accent)',
                                padding: '1rem',
                                fontSize: '1rem',
                                fontWeight: 600
                            }}
                        >
                            📨 Invite Players ({unregisteredPlayers.length})
                        </button>
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            className="btn"
                            onClick={async () => {
                                // Generate share text
                                const winner = leaderboard[0];
                                const shareText = `🏌️‍♂️ Round Complete at ${currentRound.course?.name || 'Unknown Course'}!\n\n` +
                                    `🏆 Winner: ${winner.player.name} (${getScoreDisplay(winner.score)})\n\n` +
                                    `Leaderboard:\n` +
                                    leaderboard.map((l: any, i: number) =>
                                        `${i + 1}. ${l.player.name}: ${getScoreDisplay(l.score)}${l.mrtz !== 0 ? ` (${l.mrtz > 0 ? '+' : ''}${l.mrtz.toFixed(2)} MRTZ)` : ''}`
                                    ).join('\n') +
                                    `\n\nPlayed with Hey Caddie ⛳`;

                                if (navigator.share) {
                                    try {
                                        await navigator.share({
                                            title: 'Round Results',
                                            text: shareText
                                        });
                                    } catch (err) {
                                        console.error('Error sharing:', err);
                                    }
                                } else {
                                    // Fallback to clipboard
                                    try {
                                        await navigator.clipboard.writeText(shareText);
                                        alert('Results copied to clipboard!');
                                    } catch (err) {
                                        console.error('Error copying:', err);
                                    }
                                }
                            }}
                            style={{
                                flex: 1,
                                backgroundColor: 'var(--info)',
                                padding: '1rem',
                                fontSize: '1rem',
                                fontWeight: 600
                            }}
                        >
                            📤 Share Results
                        </button>
                        <button
                            className="btn"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                backgroundColor: 'var(--success)',
                                padding: '1rem',
                                fontSize: '1.125rem',
                                fontWeight: 600
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>

                {/* Stats Claim Modal */}
                {showClaimModal && currentUser && roundId && unregisteredPlayers.length > 0 && (
                    <StatsClaimModal
                        roundId={roundId}
                        unregisteredPlayers={unregisteredPlayers}
                        currentUserId={currentUser.uid}
                        currentUserName={currentUser.displayName || 'Unknown'}
                        onClose={() => setShowClaimModal(false)}
                    />
                )}
            </div>
        </div>
    );
}
