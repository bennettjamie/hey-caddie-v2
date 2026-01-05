'use client';

import { useGame } from '@/context/GameContext';
import { calculateSkins, calculateNassau, calculateFundatory } from '@/lib/betting';
import { calculateRoundMRTZ } from '@/lib/mrtz';

interface BetSummaryReviewModalProps {
    onClose: () => void;
    onConfirm: () => void;
    finalRoundData?: any;
}

export default function BetSummaryReviewModal({ onClose, onConfirm, finalRoundData }: BetSummaryReviewModalProps) {
    const { currentRound: contextRound, activeBets: contextBets = {}, fundatoryBets: contextFundatoryBets } = useGame();

    const currentRound = finalRoundData || contextRound;
    const activeBets = finalRoundData?.bets ? {
        skins: finalRoundData.bets.skins ? { started: true, value: (Object.values(finalRoundData.bets.skins)[0] as any)?.value || 0, participants: undefined } : undefined,
        nassau: finalRoundData.bets.nassau ? { started: true, value: finalRoundData.bets.nassau.value || 0, participants: undefined } : undefined
    } : contextBets;
    const fundatoryBets = finalRoundData?.bets?.fundatory || contextFundatoryBets;

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

    const getPlayerName = (playerId: string) => {
        const player = currentRound.players.find((p: any) => p.id === playerId);
        return player?.name || playerId;
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
                    <h2>Bet Summary Review</h2>
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

                {/* Skins Summary */}
                {activeBets?.skins?.started && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        <h3 style={{ marginBottom: '0.75rem' }}>Skins ({activeBets.skins.value} MRTZ/hole)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {skinsResults.filter(s => s.winnerId).map(skin => (
                                <div key={skin.holeNumber} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '0.5rem',
                                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                                    borderRadius: '4px'
                                }}>
                                    <span>Hole {skin.holeNumber}: {getPlayerName(skin.winnerId!)}</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                                        +{skin.value.toFixed(2)} MRTZ
                                    </span>
                                </div>
                            ))}
                            {skinsResults.filter(s => s.isCarryOver).length > 0 && (
                                <div style={{
                                    padding: '0.5rem',
                                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                                    borderRadius: '4px',
                                    fontSize: '0.875rem'
                                }}>
                                    {skinsResults.filter(s => s.isCarryOver).length} carryover(s) resolved
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Nassau Summary */}
                {activeBets?.nassau?.started && nassauResults && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        <h3 style={{ marginBottom: '0.75rem' }}>Nassau ({activeBets.nassau.value} MRTZ/segment)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {nassauResults.front9WinnerId && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '0.5rem',
                                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                                    borderRadius: '4px'
                                }}>
                                    <span>Front 9: {getPlayerName(nassauResults.front9WinnerId)}</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                                        +{activeBets.nassau.value.toFixed(2)} MRTZ
                                    </span>
                                </div>
                            )}
                            {nassauResults.back9WinnerId && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '0.5rem',
                                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                                    borderRadius: '4px'
                                }}>
                                    <span>Back 9: {getPlayerName(nassauResults.back9WinnerId)}</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                                        +{activeBets.nassau.value.toFixed(2)} MRTZ
                                    </span>
                                </div>
                            )}
                            {nassauResults.overallWinnerId && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '0.5rem',
                                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                                    borderRadius: '4px'
                                }}>
                                    <span>Overall: {getPlayerName(nassauResults.overallWinnerId)}</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                                        +{activeBets.nassau.value.toFixed(2)} MRTZ
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Fundatory Summary */}
                {fundatoryBets.length > 0 && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        <h3 style={{ marginBottom: '0.75rem' }}>Fundatory Bets</h3>
                        <div style={{ fontSize: '0.875rem' }}>
                            {fundatoryBets.length} bet(s) resolved
                        </div>
                    </div>
                )}

                {/* MRTZ Totals */}
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(0, 242, 96, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    border: '1px solid var(--primary)'
                }}>
                    <h3 style={{ marginBottom: '0.75rem' }}>MRTZ Changes</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {currentRound.players.map((player: any) => {
                            const mrtzChange = roundMRTZ[player.id] || 0;
                            return (
                                <div
                                    key={player.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem',
                                        backgroundColor: mrtzChange > 0 ? 'rgba(46, 204, 113, 0.2)' : mrtzChange < 0 ? 'rgba(231, 76, 60, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                                        borderRadius: '6px'
                                    }}
                                >
                                    <span style={{ fontWeight: 600 }}>{player.name}</span>
                                    <span style={{
                                        fontWeight: 'bold',
                                        fontSize: '1.125rem',
                                        color: mrtzChange > 0 ? 'var(--success)' : mrtzChange < 0 ? 'var(--danger)' : 'var(--text-light)'
                                    }}>
                                        {mrtzChange > 0 ? '+' : ''}{mrtzChange.toFixed(2)} MRTZ
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            backgroundColor: 'var(--border)',
                            padding: '1rem',
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            minHeight: '60px'
                        }}
                    >
                        Back
                    </button>
                    <button
                        className="btn"
                        onClick={onConfirm}
                        style={{
                            flex: 1,
                            backgroundColor: 'var(--success)',
                            padding: '1rem',
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            minHeight: '60px'
                        }}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}


