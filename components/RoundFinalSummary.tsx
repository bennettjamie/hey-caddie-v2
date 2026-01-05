'use client';

import { useGame } from '@/context/GameContext';
import { calculateSkins, calculateNassau, calculateFundatory } from '@/lib/betting';
import { calculateRoundMRTZ } from '@/lib/mrtz';

interface RoundFinalSummaryProps {
    onClose: () => void;
    finalRoundData?: any; // Optional final round data if round was already ended
}

export default function RoundFinalSummary({ onClose, finalRoundData }: RoundFinalSummaryProps) {
    const { currentRound: contextRound, activeBets: contextBets = {}, fundatoryBets: contextFundatoryBets, players: contextPlayers } = useGame();

    // Use finalRoundData if provided (round already ended), otherwise use context
    const currentRound = finalRoundData || contextRound;
    const activeBets = finalRoundData?.bets ? {
        skins: finalRoundData.bets.skins ? { started: true, value: (Object.values(finalRoundData.bets.skins)[0] as any)?.value || 0, participants: undefined } : undefined,
        nassau: finalRoundData.bets.nassau ? { started: true, value: 0, participants: undefined } : undefined
    } : contextBets;
    const fundatoryBets = finalRoundData?.bets?.fundatory || contextFundatoryBets;
    const players = finalRoundData?.players || contextPlayers;

    if (!currentRound) return null;

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

                {/* Final Leaderboard */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>Final Leaderboard</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {leaderboard.map((entry: any, index: number) => (
                            <div
                                key={entry.player.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: index === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    border: index === 0 ? '1px solid var(--success)' : '1px solid #334155'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 'bold',
                                        color: index === 0 ? 'var(--success)' : '#94A3B8',
                                        minWidth: '30px'
                                    }}>
                                        {index + 1}
                                    </span>
                                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                        {entry.player.name}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 'bold',
                                        color: getScoreColor(entry.score)
                                    }}>
                                        {getScoreDisplay(entry.score)}
                                    </span>
                                    {entry.mrtz !== 0 && (
                                        <span style={{
                                            fontSize: '0.875rem',
                                            color: entry.mrtz > 0 ? 'var(--success)' : 'var(--danger)',
                                            fontWeight: 600,
                                            backgroundColor: 'rgba(0,0,0,0.3)',
                                            padding: '4px 8px',
                                            borderRadius: '4px'
                                        }}>
                                            {entry.mrtz > 0 ? '+' : ''}{entry.mrtz.toFixed(2)}
                                        </span>
                                    )}
                                </div>
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

                {/* Action Button */}
                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
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
        </div>
    );
}
