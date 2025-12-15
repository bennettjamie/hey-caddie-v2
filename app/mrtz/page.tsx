'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGame } from '@/context/GameContext';
import MRTZLedgerView from '@/components/MRTZLedgerView';
import OutstandingBalances from '@/components/OutstandingBalances';
import SettlementManager from '@/components/SettlementManager';
import GoodDeedSubmission from '@/components/GoodDeedSubmission';
import GoodDeedValidation from '@/components/GoodDeedValidation';
import { getPlayerBalance } from '@/lib/mrtzLedger';
import { getActiveCarryOvers } from '@/lib/mrtzCarryOvers';

export default function MRTZPage() {
    const { players } = useGame();
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'ledger' | 'balances' | 'settlements' | 'good_deeds' | 'validations' | 'carryovers'>('ledger');
    const [balance, setBalance] = useState<any>(null);
    const [activeCarryOvers, setActiveCarryOvers] = useState<any[]>([]);

    useEffect(() => {
        if (players.length > 0 && !selectedPlayerId) {
            setSelectedPlayerId(players[0].id);
        }
    }, [players]);

    useEffect(() => {
        if (selectedPlayerId) {
            loadPlayerData();
        }
    }, [selectedPlayerId]);

    const loadPlayerData = async () => {
        if (!selectedPlayerId) return;
        
        try {
            const [balanceData, carryOvers] = await Promise.all([
                getPlayerBalance(selectedPlayerId),
                getActiveCarryOvers(selectedPlayerId)
            ]);
            setBalance(balanceData);
            setActiveCarryOvers(carryOvers);
        } catch (error) {
            console.error('Error loading player data:', error);
        }
    };

    if (players.length === 0) {
        return (
            <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
                <h1>MRTZ Ledger</h1>
                <p style={{ color: 'var(--text-light)', marginTop: '1rem' }}>
                    No players found. Please start a round first.
                </p>
            </div>
        );
    }

    const selectedPlayer = players.find(p => p.id === selectedPlayerId) || players[0];

    return (
        <div className="container" style={{ padding: '1rem', paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>MRTZ Ledger & Settlement</h1>
                <Link 
                    href="/" 
                    style={{ 
                        fontSize: '0.875rem', 
                        color: 'var(--info)', 
                        textDecoration: 'none',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--border)',
                        borderRadius: '8px'
                    }}
                >
                    ← Back to Home
                </Link>
            </div>

            {/* Player Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Select Player:
                </label>
                <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: '1rem'
                    }}
                >
                    {players.map(player => (
                        <option key={player.id} value={player.id}>
                            {player.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Balance Summary */}
            {balance && (
                <div className="card" style={{
                    padding: '1.5rem',
                    backgroundColor: 'rgba(0, 242, 96, 0.1)',
                    border: '2px solid var(--primary)',
                    marginBottom: '1.5rem'
                }}>
                    <h2 style={{ marginBottom: '1rem' }}>MRTZ Balance</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                Current Balance
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                                {balance.balance.toFixed(2)} MRTZ
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                Net Balance
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                {(balance.balance + balance.pendingIn - balance.pendingOut).toFixed(2)} MRTZ
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                Pending In
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                +{balance.pendingIn.toFixed(2)} MRTZ
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                Pending Out
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                                -{balance.pendingOut.toFixed(2)} MRTZ
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Carry-Overs */}
            {activeCarryOvers.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Active Carry-Overs</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {activeCarryOvers.map((co, idx) => (
                            <div
                                key={co.id || idx}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--warning)'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    {co.betType.charAt(0).toUpperCase() + co.betType.slice(1)} Carry-Over
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                    Value: {co.betValue.toFixed(2)} MRTZ
                                </div>
                                {co.carryOverDetails.skins && (
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                        Holes: {co.carryOverDetails.skins.holes.join(', ')}
                                        <br />
                                        Accumulated: {co.carryOverDetails.skins.accumulatedValue.toFixed(2)} MRTZ
                                    </div>
                                )}
                                {co.carryOverDetails.nassau && (
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                        Segments: {co.carryOverDetails.nassau.segments.join(', ')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {(['ledger', 'balances', 'settlements', 'good_deeds', 'validations', 'carryovers'] as const).map(tab => (
                    <button
                        key={tab}
                        className="btn"
                        onClick={() => setActiveTab(tab)}
                        style={{
                            backgroundColor: activeTab === tab ? 'var(--primary)' : 'var(--border)',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem'
                        }}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'ledger' && selectedPlayerId && (
                    <MRTZLedgerView playerId={selectedPlayerId} />
                )}
                {activeTab === 'balances' && selectedPlayerId && (
                    <OutstandingBalances playerId={selectedPlayerId} />
                )}
                {activeTab === 'settlements' && selectedPlayerId && (
                    <SettlementManager playerId={selectedPlayerId} />
                )}
                {activeTab === 'good_deeds' && selectedPlayerId && (
                    <GoodDeedSubmission 
                        playerId={selectedPlayerId}
                        onSuccess={loadPlayerData}
                    />
                )}
                {activeTab === 'validations' && selectedPlayerId && (
                    <GoodDeedValidation playerId={selectedPlayerId} />
                )}
                {activeTab === 'carryovers' && (
                    <div className="card" style={{ padding: '1rem' }}>
                        <h3>Carry-Over Manager</h3>
                        <p style={{ color: 'var(--text-light)', marginTop: '1rem' }}>
                            Carry-overs are automatically created when you choose to carry over unresolved bets.
                            They will be resolved in future rounds.
                        </p>
                        {activeCarryOvers.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                                No active carry-overs
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

