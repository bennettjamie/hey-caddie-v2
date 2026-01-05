'use client';

import { useState, useEffect } from 'react';
import { getPlayerLedger, getPlayerBalance } from '@/lib/mrtzLedger';
import { getAllPlayers, Player } from '@/lib/players';
import { MRTZLedgerEntry } from '@/types/mrtz';

interface MRTZLedgerViewProps {
    playerId: string;
    onClose?: () => void;
}

export default function MRTZLedgerView({ playerId, onClose }: MRTZLedgerViewProps) {
    const [transactions, setTransactions] = useState<MRTZLedgerEntry[]>([]);
    const [balance, setBalance] = useState<any>(null);
    const [playerNames, setPlayerNames] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<{
        type?: string;
        status?: string;
    }>({});

    useEffect(() => {
        loadData();
    }, [playerId, filter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ledgerData, balanceData, allPlayers] = await Promise.all([
                getPlayerLedger(playerId, { ...filter, limit: 100 }),
                getPlayerBalance(playerId),
                getAllPlayers(100)
            ]);

            setTransactions(ledgerData);
            setBalance(balanceData);

            const namesMap: { [key: string]: string } = {};
            allPlayers.forEach(p => {
                namesMap[p.id] = p.name;
            });
            setPlayerNames(namesMap);
        } catch (error) {
            console.error('Error loading ledger:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTransactionTypeLabel = (type: string): string => {
        const labels: { [key: string]: string } = {
            bet_win: '🎯 Bet Win',
            bet_loss: '📉 Bet Loss',
            settlement: '🤝 Settlement',
            good_deed: '🌱 Good Deed',
            carry_over: '⏳ Carry Over',
            carry_over_resolved: '✅ Carry Over Resolved',
            adjustment: '⚙️ Adjustment'
        };
        return labels[type] || type;
    };

    const getStatusColor = (status: string): string => {
        const colors: { [key: string]: string } = {
            confirmed: 'var(--success)',
            pending: 'var(--warning)',
            settled: 'var(--info)',
            carried_over: 'var(--warning)',
            voided: 'var(--danger)'
        };
        return colors[status] || 'var(--text-light)';
    };

    const formatDate = (date: any): string => {
        if (!date) return 'Unknown';
        const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div>Loading ledger...</div>
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'sticky', top: 0, backgroundColor: '#1e1e1e', paddingBottom: '1rem', zIndex: 10 }}>
                <h2>MRTZ Ledger</h2>
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

            {/* Balance Summary */}
            {balance && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(0, 242, 96, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    border: '1px solid var(--primary)'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                Current Balance
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                {balance.balance.toFixed(2)} MRTZ
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
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                Net Balance
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                                {(balance.balance + balance.pendingIn - balance.pendingOut).toFixed(2)} MRTZ
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <select
                    value={filter.type || ''}
                    onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
                    style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: '0.875rem'
                    }}
                >
                    <option value="">All Types</option>
                    <option value="bet_win">Bet Wins</option>
                    <option value="bet_loss">Bet Losses</option>
                    <option value="settlement">Settlements</option>
                    <option value="good_deed">Good Deeds</option>
                    <option value="carry_over">Carry Overs</option>
                </select>
                <select
                    value={filter.status || ''}
                    onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
                    style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: '0.875rem'
                    }}
                >
                    <option value="">All Status</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="settled">Settled</option>
                </select>
            </div>

            {/* Transactions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                        No transactions found
                    </div>
                ) : (
                    transactions.map((tx) => {
                        const isWin = tx.toPlayerId === playerId;
                        const otherPlayerId = isWin ? tx.fromPlayerId : tx.toPlayerId;
                        const otherPlayerName = otherPlayerId ? (playerNames[otherPlayerId] || otherPlayerId) : 'Multiple Players';

                        return (
                            <div
                                key={tx.id}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: isWin ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                    borderRadius: 'var(--radius-md)',
                                    border: `1px solid ${isWin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontSize: '1.25rem' }}>
                                                {getTransactionTypeLabel(tx.type)}
                                            </span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                backgroundColor: getStatusColor(tx.status),
                                                color: 'white',
                                                fontWeight: 600
                                            }}>
                                                {tx.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                                            {tx.description}
                                        </div>
                                        {tx.betType && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                                {tx.betType.charAt(0).toUpperCase() + tx.betType.slice(1)} bet
                                                {tx.betDetails?.holeNumber && ` • Hole ${tx.betDetails.holeNumber}`}
                                                {tx.betDetails?.segment && ` • ${tx.betDetails.segment}`}
                                            </div>
                                        )}
                                        {otherPlayerId && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                                {isWin ? 'From' : 'To'}: {otherPlayerName}
                                            </div>
                                        )}
                                        {tx.participants.length > 2 && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                                Participants: {tx.participants.map(p => playerNames[p] || p).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right', marginLeft: '1rem' }}>
                                        <div style={{
                                            fontSize: '1.5rem',
                                            fontWeight: 'bold',
                                            color: isWin ? 'var(--success)' : 'var(--danger)'
                                        }}>
                                            {isWin ? '+' : '-'}{tx.amount.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                            {formatDate(tx.date)}
                                        </div>
                                    </div>
                                </div>

                                {tx.settlementDetails && (
                                    <div style={{
                                        marginTop: '0.5rem',
                                        padding: '0.5rem',
                                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem'
                                    }}>
                                        {tx.settlementDetails.amount && (
                                            <div>Settled with ${tx.settlementDetails.amount.toFixed(2)}</div>
                                        )}
                                        {tx.settlementDetails.goodDeedId && (
                                            <div>Settled via good deed</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}


