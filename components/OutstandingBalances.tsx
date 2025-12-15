'use client';

import { useState, useEffect } from 'react';
import { getOutstandingBalances, getPlayerBalance } from '@/lib/mrtzLedger';
import { createSettlementFromBalances } from '@/lib/mrtzSettlements';
import { getAllPlayers, Player } from '@/lib/players';

interface OutstandingBalancesProps {
    playerId: string;
    onClose?: () => void;
}

export default function OutstandingBalances({ playerId, onClose }: OutstandingBalancesProps) {
    const [balances, setBalances] = useState<{
        owedToMe: any[];
        iOwe: any[];
    }>({ owedToMe: [], iOwe: [] });
    const [playerNames, setPlayerNames] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [selectedSettlement, setSelectedSettlement] = useState<{
        type: 'owedToMe' | 'iOwe';
        otherPlayerId: string;
        amount: number;
        transactionIds: string[];
    } | null>(null);
    const [settlementType, setSettlementType] = useState<'money' | 'good_deed' | 'agreed_void'>('money');
    const [moneyAmount, setMoneyAmount] = useState<number | null>(null);

    useEffect(() => {
        loadBalances();
    }, [playerId]);

    const loadBalances = async () => {
        setLoading(true);
        try {
            const balancesData = await getOutstandingBalances(playerId);
            setBalances(balancesData);
            
            // Fetch player names
            const allPlayers = await getAllPlayers(100);
            const namesMap: { [key: string]: string } = {};
            allPlayers.forEach(p => {
                namesMap[p.id] = p.name;
            });
            setPlayerNames(namesMap);
        } catch (error) {
            console.error('Error loading balances:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSettlement = async (
        fromPlayerId: string,
        toPlayerId: string,
        amount: number,
        transactionIds: string[]
    ) => {
        try {
            const settlementMethod: any = {};
            if (settlementType === 'money' && moneyAmount) {
                settlementMethod.moneyAmount = moneyAmount;
                settlementMethod.currency = 'USD';
            } else if (settlementType === 'good_deed') {
                // Will need to link to good deed ID
                settlementMethod.notes = 'Settled via good deed';
            } else if (settlementType === 'agreed_void') {
                settlementMethod.notes = 'Both parties agreed to void';
            }
            
            await createSettlementFromBalances(
                fromPlayerId,
                toPlayerId,
                transactionIds,
                settlementType === 'agreed_void' ? 'agreed_void' : settlementType,
                settlementMethod,
                playerId
            );
            
            setSelectedSettlement(null);
            loadBalances(); // Refresh
        } catch (error) {
            console.error('Error creating settlement:', error);
            alert('Error creating settlement. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div>Loading balances...</div>
            </div>
        );
    }

    const totalOwedToMe = balances.owedToMe.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalIOwe = balances.iOwe.reduce((sum, b) => sum + b.totalAmount, 0);
    const netBalance = totalOwedToMe - totalIOwe;

    return (
        <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Outstanding MRTZ Balances</h2>
                {onClose && (
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
                )}
            </div>

            {/* Summary */}
            <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(0, 242, 96, 0.1)',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid var(--primary)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Owed to Me:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                        +{totalOwedToMe.toFixed(2)} MRTZ
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>I Owe:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>
                        -{totalIOwe.toFixed(2)} MRTZ
                    </span>
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border)',
                    fontWeight: 'bold',
                    fontSize: '1.125rem'
                }}>
                    <span>Net Balance:</span>
                    <span style={{ color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {netBalance >= 0 ? '+' : ''}{netBalance.toFixed(2)} MRTZ
                    </span>
                </div>
            </div>

            {/* Owed to Me */}
            {balances.owedToMe.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Owed to Me</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {balances.owedToMe.map((balance, index) => (
                            <div
                                key={index}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--success)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
                                            {playerNames[balance.fromPlayerId] || balance.fromPlayerId}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                            {balance.transactionIds.length} transaction(s)
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--success)' }}>
                                            +{balance.totalAmount.toFixed(2)} MRTZ
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="btn"
                                    onClick={() => setSelectedSettlement({
                                        type: 'owedToMe',
                                        otherPlayerId: balance.fromPlayerId,
                                        amount: balance.totalAmount,
                                        transactionIds: balance.transactionIds
                                    })}
                                    style={{
                                        width: '100%',
                                        backgroundColor: 'var(--info)',
                                        marginTop: '0.5rem'
                                    }}
                                >
                                    Create Settlement
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* I Owe */}
            {balances.iOwe.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--danger)' }}>I Owe</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {balances.iOwe.map((balance, index) => (
                            <div
                                key={index}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--danger)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
                                            {playerNames[balance.toPlayerId] || balance.toPlayerId}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                            {balance.transactionIds.length} transaction(s)
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--danger)' }}>
                                            -{balance.totalAmount.toFixed(2)} MRTZ
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="btn"
                                    onClick={() => setSelectedSettlement({
                                        type: 'iOwe',
                                        otherPlayerId: balance.toPlayerId,
                                        amount: balance.totalAmount,
                                        transactionIds: balance.transactionIds
                                    })}
                                    style={{
                                        width: '100%',
                                        backgroundColor: 'var(--warning)',
                                        marginTop: '0.5rem'
                                    }}
                                >
                                    Create Settlement
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {balances.owedToMe.length === 0 && balances.iOwe.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    No outstanding balances! 🎉
                </div>
            )}

            {/* Settlement Modal */}
            {selectedSettlement && (
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
                    onClick={() => setSelectedSettlement(null)}
                >
                    <div
                        className="card"
                        style={{
                            width: '100%',
                            maxWidth: '500px',
                            backgroundColor: '#1e1e1e'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3>Create Settlement</h3>
                            <button
                                className="btn"
                                onClick={() => setSelectedSettlement(null)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: 'var(--danger)',
                                    minHeight: 'auto'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                {selectedSettlement.type === 'owedToMe' 
                                    ? `${playerNames[selectedSettlement.otherPlayerId] || selectedSettlement.otherPlayerId} owes you`
                                    : `You owe ${playerNames[selectedSettlement.otherPlayerId] || selectedSettlement.otherPlayerId}`}
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                                {selectedSettlement.amount.toFixed(2)} MRTZ
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>
                                Settlement Type:
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setSettlementType('money')}
                                    style={{
                                        backgroundColor: settlementType === 'money' ? 'var(--primary)' : 'var(--border)',
                                        textAlign: 'left',
                                        padding: '0.75rem'
                                    }}
                                >
                                    💵 Money Exchange
                                </button>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setSettlementType('good_deed')}
                                    style={{
                                        backgroundColor: settlementType === 'good_deed' ? 'var(--primary)' : 'var(--border)',
                                        textAlign: 'left',
                                        padding: '0.75rem'
                                    }}
                                >
                                    🌱 Good Deed
                                </button>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setSettlementType('agreed_void')}
                                    style={{
                                        backgroundColor: settlementType === 'agreed_void' ? 'var(--primary)' : 'var(--border)',
                                        textAlign: 'left',
                                        padding: '0.75rem'
                                    }}
                                >
                                    🤝 Agreed Void
                                </button>
                            </div>
                        </div>

                        {settlementType === 'money' && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                                    Money Amount (optional):
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={moneyAmount || ''}
                                    onChange={(e) => setMoneyAmount(e.target.value ? parseFloat(e.target.value) : null)}
                                    placeholder="e.g., 5.00"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg)',
                                        color: 'var(--text)',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                className="btn"
                                onClick={() => setSelectedSettlement(null)}
                                style={{
                                    flex: 1,
                                    backgroundColor: 'var(--border)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn"
                                onClick={() => {
                                    const fromPlayerId = selectedSettlement.type === 'iOwe' ? playerId : selectedSettlement.otherPlayerId;
                                    const toPlayerId = selectedSettlement.type === 'owedToMe' ? playerId : selectedSettlement.otherPlayerId;
                                    handleCreateSettlement(
                                        fromPlayerId,
                                        toPlayerId,
                                        selectedSettlement.amount,
                                        selectedSettlement.transactionIds
                                    );
                                }}
                                style={{
                                    flex: 1,
                                    backgroundColor: 'var(--success)'
                                }}
                            >
                                Create Settlement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

