'use client';

import { useGame } from '@/context/GameContext';
import { calculateSkins, calculateNassau } from '@/lib/betting';

export default function BettingSummary() {
    const { currentRound } = useGame();

    if (!currentRound) return null;

    const holes = Array.from({ length: 18 }, (_, i) => i + 1);
    const playerIds = currentRound.players.map((p: any) => p.id);

    const skins = calculateSkins(currentRound.scores, holes);
    const nassau = calculateNassau(currentRound.scores, playerIds);

    // Calculate total winnings (mock)
    // In reality, we'd sum up skin values for each winner
    const skinWinnings: { [key: string]: number } = {};
    skins.forEach(s => {
        if (s.winnerId) {
            skinWinnings[s.winnerId] = (skinWinnings[s.winnerId] || 0) + s.value;
        }
    });

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <h2>Betting Summary</h2>

            <div style={{ marginTop: '1rem' }}>
                <h3>Skins</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {skins.map(s => (
                        <li key={s.holeNumber} style={{ borderBottom: '1px solid #eee', padding: '0.5rem 0' }}>
                            Hole {s.holeNumber}: {s.winnerId ?
                                `${currentRound.players.find((p: any) => p.id === s.winnerId)?.name} won ${s.value} MRTZ` :
                                `Push (${s.value} MRTZ carried over)`}
                        </li>
                    ))}
                </ul>
            </div>

            <div style={{ marginTop: '1rem' }}>
                <h3>Nassau</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                        <strong>Front 9</strong><br />
                        {nassau.front9WinnerId ? currentRound.players.find((p: any) => p.id === nassau.front9WinnerId)?.name : 'Tie'}
                    </div>
                    <div>
                        <strong>Back 9</strong><br />
                        {nassau.back9WinnerId ? currentRound.players.find((p: any) => p.id === nassau.back9WinnerId)?.name : 'Tie'}
                    </div>
                    <div>
                        <strong>Overall</strong><br />
                        {nassau.overallWinnerId ? currentRound.players.find((p: any) => p.id === nassau.overallWinnerId)?.name : 'Tie'}
                    </div>
                </div>
            </div>
        </div>
    );
}
