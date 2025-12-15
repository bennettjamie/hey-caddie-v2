'use client';

import { useGame } from '@/context/GameContext';
import { calculateSkins, calculateNassau, calculateFundatory } from '@/lib/betting';
import { calculateRoundMRTZ } from '@/lib/mrtz';

interface BettingResultsProps {
    onClose?: () => void;
}

export default function BettingResults({ onClose }: BettingResultsProps) {
    const { currentRound, activeBets = {}, fundatoryBets, players } = useGame();

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

    // Calculate skin winnings
    const skinWinnings: { [key: string]: number } = {};
    skinsResults.forEach(s => {
        if (s.winnerId) {
            skinWinnings[s.winnerId] = (skinWinnings[s.winnerId] || 0) + s.value;
        }
    });

    // Calculate Nassau winnings
    const nassauWinnings: { [key: string]: number } = {};
    if (nassauResults && activeBets?.nassau?.started) {
        const nassauValue = activeBets?.nassau?.value || 0;
        const winners = [
            nassauResults.front9WinnerId,
            nassauResults.back9WinnerId,
            nassauResults.overallWinnerId
        ].filter(Boolean) as string[];

        winners.forEach(winnerId => {
            nassauWinnings[winnerId] = (nassauWinnings[winnerId] || 0) + nassauValue;
        });
    }

    // Sort players by total MRTZ (highest first)
    const playerTotals = currentRound.players.map((p: any) => ({
        player: p,
        total: roundMRTZ[p.id] || 0
    })).sort((a, b) => b.total - a.total);

    const hasAnyBets = activeBets?.skins?.started || activeBets?.nassau?.started || fundatoryBets.length > 0;

    if (!hasAnyBets) {
        return (
            <div className="card">
                <h2>Betting Results</h2>
                <p style={{ color: 'var(--text-light)' }}>No bets were active for this round.</p>
                {onClose && (
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{ marginTop: '1rem', width: '100%' }}
                    >
                        Close
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Final Betting Results</h2>
                {onClose && (
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--border)',
                            minHeight: 'auto'
                        }}
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Summary - Net MRTZ per Player */}
            <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(0, 242, 96, 0.1)',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '2px solid var(--primary)'
            }}>
                <h3 style={{ marginBottom: '0.75rem' }}>Net MRTZ</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {playerTotals.map(({ player, total }, index) => (
                        <div
                            key={player.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.75rem',
                                backgroundColor: index === 0 && total > 0 ? 'rgba(0, 242, 96, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                                borderRadius: '6px',
                                border: index === 0 && total > 0 ? '2px solid var(--success)' : '1px solid var(--border)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>
                                    #{index + 1}
                                </span>
                                <span style={{ fontWeight: 500 }}>{player.name}</span>
                            </div>
                            <span
                                style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold',
                                    color: total > 0 ? 'var(--success)' : total < 0 ? 'var(--danger)' : 'var(--text)'
                                }}
                            >
                                {total > 0 ? '+' : ''}{total.toFixed(2)} MRTZ
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Skins Breakdown */}
            {activeBets?.skins?.started && skinsResults.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '0.75rem' }}>Skins Results</h3>
                    <div style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem'
                    }}>
                        {skinsResults.map(s => (
                            <div
                                key={s.holeNumber}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.5rem',
                                    borderBottom: '1px solid var(--border)'
                                }}
                            >
                                <span>Hole {s.holeNumber}:</span>
                                {s.winnerId ? (
                                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                                        {currentRound.players.find((p: any) => p.id === s.winnerId)?.name} won {s.value.toFixed(2)} MRTZ
                                    </span>
                                ) : (
                                    <span style={{ color: 'var(--warning)' }}>
                                        Push ({s.value.toFixed(2)} MRTZ carried over)
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    {Object.keys(skinWinnings).length > 0 && (
                        <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            borderRadius: '6px'
                        }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                Total Skins Winnings:
                            </div>
                            {Object.entries(skinWinnings).map(([playerId, amount]) => (
                                <div key={playerId} style={{ fontSize: '0.875rem' }}>
                                    {currentRound.players.find((p: any) => p.id === playerId)?.name}:{' '}
                                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                                        +{amount.toFixed(2)} MRTZ
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Nassau Breakdown */}
            {activeBets?.nassau?.started && nassauResults && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '0.75rem' }}>Nassau Results</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            borderRadius: '6px',
                            border: nassauResults.front9WinnerId ? '2px solid var(--success)' : '1px solid var(--border)'
                        }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                Front 9
                            </div>
                            <div style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>
                                {nassauResults.front9WinnerId
                                    ? currentRound.players.find((p: any) => p.id === nassauResults.front9WinnerId)?.name
                                    : 'Tie'}
                            </div>
                            {nassauResults.front9WinnerId && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 'bold' }}>
                                    +{activeBets?.nassau?.value || 0} MRTZ
                                </div>
                            )}
                        </div>
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            borderRadius: '6px',
                            border: nassauResults.back9WinnerId ? '2px solid var(--success)' : '1px solid var(--border)'
                        }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                Back 9
                            </div>
                            <div style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>
                                {nassauResults.back9WinnerId
                                    ? currentRound.players.find((p: any) => p.id === nassauResults.back9WinnerId)?.name
                                    : 'Tie'}
                            </div>
                            {nassauResults.back9WinnerId && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 'bold' }}>
                                    +{activeBets?.nassau?.value || 0} MRTZ
                                </div>
                            )}
                        </div>
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            borderRadius: '6px',
                            border: nassauResults.overallWinnerId ? '2px solid var(--success)' : '1px solid var(--border)'
                        }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                Overall
                            </div>
                            <div style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>
                                {nassauResults.overallWinnerId
                                    ? currentRound.players.find((p: any) => p.id === nassauResults.overallWinnerId)?.name
                                    : 'Tie'}
                            </div>
                            {nassauResults.overallWinnerId && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 'bold' }}>
                                    +{activeBets?.nassau?.value || 0} MRTZ
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Fundatory Breakdown */}
            {fundatoryBets.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '0.75rem' }}>Fundatory Results</h3>
                    <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem'
                    }}>
                        {fundatoryBets.map(bet => {
                            const challenger = players.find((p: any) => p.id === bet.challengerId);
                            const target = players.find((p: any) => p.id === bet.targetId);
                            return (
                                <div
                                    key={bet.id}
                                    style={{
                                        padding: '0.5rem',
                                        borderBottom: '1px solid var(--border)',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                        {bet.gapDescription} (Hole {bet.holeNumber})
                                    </div>
                                    <div>
                                        {target?.name} {bet.status === 'success' ? 'hit' : 'missed'} the gap
                                        {' - '}
                                        {bet.status === 'success' ? (
                                            <span style={{ color: 'var(--success)' }}>
                                                {target?.name} +{bet.amount} MRTZ, {challenger?.name} -{bet.amount} MRTZ
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--danger)' }}>
                                                {target?.name} -{bet.amount} MRTZ, {challenger?.name} +{bet.amount} MRTZ
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

