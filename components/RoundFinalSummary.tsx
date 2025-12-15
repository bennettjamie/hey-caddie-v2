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
        skins: finalRoundData.bets.skins ? { started: true, value: Object.values(finalRoundData.bets.skins)[0]?.value || 0 } : undefined,
        nassau: finalRoundData.bets.nassau ? { started: true, value: 0 } : undefined
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
        .sort((a, b) => a.score - b.score);

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

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
                    backgroundColor: '#1e1e1e'
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
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        <strong>Course:</strong> {currentRound.course?.name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        <strong>Layout:</strong> {currentRound.course?.selectedLayout || 'Main'}
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                        <strong>Date:</strong> {new Date().toLocaleDateString()}
                    </div>
                </div>

                {/* Final Leaderboard */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Final Leaderboard</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {leaderboard.map((entry, index) => (
                            <div
                                key={entry.player.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem',
                                    backgroundColor: index === 0 ? 'rgba(46, 204, 113, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: '8px',
                                    border: index === 0 ? '2px solid var(--success)' : '1px solid var(--border)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 'bold',
                                        color: index === 0 ? 'var(--success)' : 'var(--text-light)',
                                        minWidth: '30px'
                                    }}>
                                        {index + 1}
                                    </span>
                                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                                        {entry.player.name}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: '1.125rem',
                                        fontWeight: 'bold',
                                        color: getScoreColor(entry.score)
                                    }}>
                                        {getScoreDisplay(entry.score)}
                                    </span>
                                    {entry.mrtz !== 0 && (
                                        <span style={{
                                            fontSize: '0.875rem',
                                            color: entry.mrtz > 0 ? 'var(--success)' : 'var(--danger)',
                                            fontWeight: 600
                                        }}>
                                            {entry.mrtz > 0 ? '+' : ''}{entry.mrtz.toFixed(2)} MRTZ
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
                        <h3 style={{ marginBottom: '1rem' }}>Betting Summary</h3>
                        {activeBets?.skins?.started && (
                            <div style={{
                                padding: '0.75rem',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                borderRadius: '8px',
                                marginBottom: '0.5rem'
                            }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    Skins ({activeBets.skins.value} MRTZ/hole)
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                    {skinsResults.filter(s => s.winnerId).length} holes won
                                    {skinsResults.filter(s => s.isCarryOver).length > 0 && (
                                        <span>, {skinsResults.filter(s => s.isCarryOver).length} carryovers</span>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeBets?.nassau?.started && nassauResults && (
                            <div style={{
                                padding: '0.75rem',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                borderRadius: '8px',
                                marginBottom: '0.5rem'
                            }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    Nassau ({activeBets.nassau.value} MRTZ/segment)
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
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
                                padding: '0.75rem',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                borderRadius: '8px'
                            }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    Fundatory Bets: {fundatoryBets.length}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Button */}
                <button
                    className="btn"
                    onClick={onClose}
                    style={{
                        width: '100%',
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
    );
}
