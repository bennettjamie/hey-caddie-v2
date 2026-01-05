'use client';

import { useState, useEffect } from 'react';
import { getPendingValidations, validateGoodDeed, getGoodDeed } from '@/lib/mrtzGoodDeeds';
import { getAllPlayers, Player } from '@/lib/players';
import { MRTZGoodDeed } from '@/types/mrtz';

interface GoodDeedValidationProps {
    playerId: string;
    onClose?: () => void;
}

export default function GoodDeedValidation({ playerId, onClose }: GoodDeedValidationProps) {
    const [pendingDeeds, setPendingDeeds] = useState<MRTZGoodDeed[]>([]);
    const [playerNames, setPlayerNames] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [selectedDeed, setSelectedDeed] = useState<MRTZGoodDeed | null>(null);
    const [validationComment, setValidationComment] = useState('');

    useEffect(() => {
        loadPendingValidations();
    }, [playerId]);

    const loadPendingValidations = async () => {
        setLoading(true);
        try {
            const [deeds, allPlayers] = await Promise.all([
                getPendingValidations(playerId),
                getAllPlayers(100)
            ]);
            
            setPendingDeeds(deeds);
            
            const namesMap: { [key: string]: string } = {};
            allPlayers.forEach(p => {
                namesMap[p.id] = p.name;
            });
            setPlayerNames(namesMap);
        } catch (error) {
            console.error('Error loading pending validations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleValidate = async (deedId: string, status: 'approved' | 'rejected') => {
        try {
            const validated = await validateGoodDeed(
                deedId,
                playerId,
                status,
                validationComment || undefined
            );
            
            if (validated && status === 'approved') {
                alert('Good deed validated! MRTZ has been awarded.');
            } else if (status === 'rejected') {
                alert('Good deed rejected.');
            } else {
                alert('Your validation has been recorded. Waiting for other validators...');
            }
            
            setSelectedDeed(null);
            setValidationComment('');
            loadPendingValidations();
        } catch (error) {
            console.error('Error validating good deed:', error);
            alert('Error validating good deed. Please try again.');
        }
    };

    const formatDate = (date: any): string => {
        if (!date) return 'Unknown';
        const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div>Loading pending validations...</div>
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'sticky', top: 0, backgroundColor: '#1e1e1e', paddingBottom: '1rem', zIndex: 10 }}>
                <h2>Pending Validations</h2>
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

            {pendingDeeds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    No pending validations! 🎉
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {pendingDeeds.map((deed) => {
                        const myValidation = deed.validators.find(v => v.playerId === playerId);
                        const otherValidators = deed.validators.filter(v => v.playerId !== playerId);
                        const allApproved = deed.validators.every(v => v.status === 'approved');
                        
                        return (
                            <div
                                key={deed.id}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--warning)'
                                }}
                            >
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '1.125rem' }}>
                                            {deed.deedType === 'course_cleanup' ? '🧹' :
                                             deed.deedType === 'help_other_player' ? '🤝' :
                                             deed.deedType === 'community_service' ? '🌍' : '✨'}
                                        </span>
                                        <span style={{ fontWeight: 'bold' }}>
                                            {playerNames[deed.playerId] || deed.playerId}
                                        </span>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            backgroundColor: deed.status === 'validated' ? 'var(--success)' : 
                                                          deed.status === 'rejected' ? 'var(--danger)' : 'var(--warning)',
                                            color: 'white',
                                            fontWeight: 600
                                        }}>
                                            {deed.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                        {deed.description}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        Value: {deed.mrtzValue.toFixed(2)} MRTZ
                                    </div>
                                    {deed.location?.courseName && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                            Location: {deed.location.courseName}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                        Submitted: {formatDate(deed.createdAt)}
                                    </div>
                                </div>

                                {/* Validator Status */}
                                <div style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: '4px',
                                    marginBottom: '0.75rem'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                        Validator Status:
                                    </div>
                                    {deed.validators.map((validator, idx) => (
                                        <div key={idx} style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                            {playerNames[validator.playerId] || validator.playerId}: 
                                            <span style={{ 
                                                color: validator.status === 'approved' ? 'var(--success)' : 
                                                       validator.status === 'rejected' ? 'var(--danger)' : 'var(--warning)',
                                                marginLeft: '0.5rem'
                                            }}>
                                                {validator.status === 'approved' ? '✓ Approved' :
                                                 validator.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                                            </span>
                                            {validator.comment && (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginLeft: '1rem', marginTop: '0.25rem' }}>
                                                    "{validator.comment}"
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* My Validation Status */}
                                {myValidation && myValidation.status === 'pending' && (
                                    <div>
                                        <div style={{ marginBottom: '0.5rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                                                Comment (optional):
                                            </label>
                                            <textarea
                                                value={validationComment}
                                                onChange={(e) => setValidationComment(e.target.value)}
                                                placeholder="Add a comment about this good deed..."
                                                rows={2}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--border)',
                                                    backgroundColor: 'var(--bg)',
                                                    color: 'var(--text)',
                                                    fontSize: '0.875rem',
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn"
                                                onClick={() => handleValidate(deed.id!, 'approved')}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: 'var(--success)'
                                                }}
                                            >
                                                ✓ Approve
                                            </button>
                                            <button
                                                className="btn"
                                                onClick={() => handleValidate(deed.id!, 'rejected')}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: 'var(--danger)'
                                                }}
                                            >
                                                ✗ Reject
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {myValidation && myValidation.status !== 'pending' && (
                                    <div style={{
                                        padding: '0.5rem',
                                        backgroundColor: myValidation.status === 'approved' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem',
                                        color: myValidation.status === 'approved' ? 'var(--success)' : 'var(--danger)',
                                        fontWeight: 600
                                    }}>
                                        You {myValidation.status === 'approved' ? 'approved' : 'rejected'} this deed
                                        {myValidation.comment && `: "${myValidation.comment}"`}
                                    </div>
                                )}

                                {deed.status === 'validated' && (
                                    <div style={{
                                        padding: '0.5rem',
                                        backgroundColor: 'rgba(46, 204, 113, 0.2)',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem',
                                        color: 'var(--success)',
                                        fontWeight: 600,
                                        marginTop: '0.5rem'
                                    }}>
                                        ✓ Validated! {deed.mrtzAwarded ? 'MRTZ awarded.' : 'MRTZ pending...'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


