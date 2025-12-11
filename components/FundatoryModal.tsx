'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';

export default function FundatoryModal({ onClose }: { onClose: () => void }) {
    const { players, activeHole, addFundatoryBet } = useGame();
    const [challengerId, setChallengerId] = useState(players[0]?.id || '');
    const [targetId, setTargetId] = useState(players[1]?.id || '');
    const [amount, setAmount] = useState(1);
    const [gapDescription, setGapDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addFundatoryBet({
            id: Math.random().toString(36).substr(2, 9),
            challengerId,
            targetId,
            amount,
            gapDescription,
            status: 'pending',
            holeNumber: activeHole
        });
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '500px', backgroundColor: '#1e1e1e' }}>
                <h2>New Fundatory Bet</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <label>
                        Challenger:
                        <select value={challengerId} onChange={e => setChallengerId(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                            {players.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Target Player:
                        <select value={targetId} onChange={e => setTargetId(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                            {players.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Amount (Merits):
                        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem' }} />
                    </label>

                    <label>
                        Gap Description:
                        <input type="text" value={gapDescription} onChange={e => setGapDescription(e.target.value)} placeholder="e.g. Tree Gap" style={{ width: '100%', padding: '0.5rem' }} />
                    </label>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" className="btn" onClick={onClose} style={{ backgroundColor: '#666' }}>Cancel</button>
                        <button type="submit" className="btn">Create Bet</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
