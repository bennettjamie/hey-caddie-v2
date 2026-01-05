'use client';

import { useState, useEffect } from 'react';
import { getPlayerSettlements, agreeToSettlement, rejectSettlement, getSettlement } from '@/lib/mrtzSettlements';
import { getAllPlayers, Player } from '@/lib/players';
import { MRTZSettlement } from '@/types/mrtz';

interface SettlementManagerProps {
    playerId: string;
    onClose?: () => void;
}

export default function SettlementManager({ playerId, onClose }: SettlementManagerProps) {
    const [settlements, setSettlements] = useState<MRTZSettlement[]>([]);
    const [playerNames, setPlayerNames] = useState<{ [key: string]: string }>({});
    const [filter, setFilter] = useState<'pending' | 'agreed' | 'completed' | 'rejected' | 'all'>('pending');
    const [loading, setLoading] = useState(true);
    const [selectedSettlement, setSelectedSettlement] = useState<MRTZSettlement | null>(null);

    useEffect(() => {
        loadSettlements();
    }, [playerId, filter]);

    const loadSettlements = async () => {
        setLoading(true);
        try {
            const [settlementsData, allPlayers] = await Promise.all([
                getPlayerSettlements(playerId, filter === 'all' ? undefined : filter),
                getAllPlayers(100)
            ]);
            
            setSettlements(settlementsData);
            
            const namesMap: { [key: string]: string } = {};
            allPlayers.forEach(p => {
                namesMap[p.id] = p.name;
            });
            setPlayerNames(namesMap);
        } catch (error) {
            console.error('Error loading settlements:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAgree = async (settlementId: string) => {
        try {
            const allAgreed = await agreeToSettlement(settlementId, playerId);
            if (allAgreed) {
                alert('Settlement completed! All parties have agreed.');
            } else {
                alert('Your agreement has been recorded. Waiting for other parties...');
            }
            loadSettlements();
        } catch (error) {
            console.error('Error agreeing to settlement:', error);
            alert('Error agreeing to settlement. Please try again.');
        }
    };

    const handleReject = async (settlementId: string, reason?: string) => {
        if (!confirm('Are you sure you want to reject this settlement?')) {
            return;
        }
        
        try {
            await rejectSettlement(settlementId, playerId, reason);
            alert('Settlement rejected.');
            loadSettlements();
        } catch (error) {
            console.error('Error rejecting settlement:', error);
            alert('Error rejecting settlement. Please try again.');
        }
    };

    const formatDate = (date: any): string => {
        if (!date) return 'Unknown';
        const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusColor = (status: string): string => {
        const colors: { [key: string]: string } = {
            pending: 'var(--warning)',
            agreed: 'var(--info)',
            completed: 'var(--success)',
            rejected: 'var(--danger)'
        };
        return colors[status] || 'var(--text-light)';
    };

    if (loading) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div>Loading settlements...</div>
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'sticky', top: 0, backgroundColor: '#1e1e1e', paddingBottom: '1rem', zIndex: 10 }}>
                <h2>Settlement Manager</h2>
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

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {(['pending', 'agreed', 'completed', 'rejected', 'all'] as const).map(status => (
                    <button
                        key={status}
                        className="btn"
                        onClick={() => setFilter(status)}
                        style={{
                            backgroundColor: filter === status ? 'var(--primary)' : 'var(--border)',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem'
                        }}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* Settlements List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {settlements.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                        No settlements found
                    </div>
                ) : (
                    settlements.map((settlement) => {
                        const myParty = settlement.parties.find(p => p.playerId === playerId);
                        const otherParties = settlement.parties.filter(p => p.playerId !== playerId);
                        const iAmPayer = myParty?.role === 'payer';
                        const iAmReceiver = myParty?.role === 'receiver';
                        
                        return (
                            <div
                                key={settlement.id}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: '8px',
                                    border: `1px solid ${getStatusColor(settlement.status)}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                                                {settlement.type === 'money' ? '💵' : 
                                                 settlement.type === 'good_deed' ? '🌱' : 
                                                 settlement.type === 'agreed_void' ? '🤝' : '⏳'} 
                                                {settlement.type.charAt(0).toUpperCase() + settlement.type.slice(1)} Settlement
                                            </span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                backgroundColor: getStatusColor(settlement.status),
                                                color: 'white',
                                                fontWeight: 600
                                            }}>
                                                {settlement.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                            Amount: <strong>{settlement.totalMRTZ.toFixed(2)} MRTZ</strong>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                            {iAmPayer && `You pay ${otherParties.map(p => playerNames[p.playerId] || p.playerId).join(', ')}`}
                                            {iAmReceiver && `${otherParties.map(p => playerNames[p.playerId] || p.playerId).join(', ')} pay${otherParties.length > 1 ? '' : 's'} you`}
                                        </div>
                                        {settlement.settlementMethod?.moneyAmount && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                                Money: ${settlement.settlementMethod.moneyAmount.toFixed(2)} {settlement.settlementMethod.currency || 'USD'}
                                            </div>
                                        )}
                                        {settlement.settlementMethod?.goodDeed && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                                Good Deed: {settlement.settlementMethod.goodDeed.description}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                                            Created: {formatDate(settlement.createdAt)}
                                        </div>
                                    </div>
                                </div>

                                {/* Party Status */}
                                <div style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: '4px',
                                    marginBottom: '0.75rem'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                        Party Status:
                                    </div>
                                    {settlement.parties.map((party, idx) => (
                                        <div key={idx} style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                            {playerNames[party.playerId] || party.playerId}: 
                                            <span style={{ 
                                                color: party.agreed ? 'var(--success)' : 'var(--warning)',
                                                marginLeft: '0.5rem'
                                            }}>
                                                {party.agreed ? '✓ Agreed' : '⏳ Pending'}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                {settlement.status === 'pending' && myParty && !myParty.agreed && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn"
                                            onClick={() => handleAgree(settlement.settlementId)}
                                            style={{
                                                flex: 1,
                                                backgroundColor: 'var(--success)'
                                            }}
                                        >
                                            ✓ Agree
                                        </button>
                                        <button
                                            className="btn"
                                            onClick={() => {
                                                const reason = prompt('Reason for rejection (optional):');
                                                handleReject(settlement.settlementId, reason || undefined);
                                            }}
                                            style={{
                                                flex: 1,
                                                backgroundColor: 'var(--danger)'
                                            }}
                                        >
                                            ✗ Reject
                                        </button>
                                    </div>
                                )}

                                {settlement.status === 'completed' && (
                                    <div style={{
                                        padding: '0.5rem',
                                        backgroundColor: 'rgba(46, 204, 113, 0.2)',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem',
                                        color: 'var(--success)',
                                        fontWeight: 600
                                    }}>
                                        ✓ Completed: {formatDate(settlement.completedAt)}
                                    </div>
                                )}

                                {settlement.status === 'rejected' && (
                                    <div style={{
                                        padding: '0.5rem',
                                        backgroundColor: 'rgba(231, 76, 60, 0.2)',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem',
                                        color: 'var(--danger)'
                                    }}>
                                        ✗ Rejected: {settlement.rejectionReason || 'No reason provided'}
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


