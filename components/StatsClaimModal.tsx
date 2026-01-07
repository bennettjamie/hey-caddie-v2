'use client';

import { useState } from 'react';
import { Player } from '@/lib/players';
import { createStatsClaim } from '@/lib/statsClaims';
import SocialShareButton from './SocialShareButton';

interface StatsClaimModalProps {
    roundId: string;
    unregisteredPlayers: Player[]; // Players without userId
    currentUserId: string;
    currentUserName: string;
    onClose: () => void;
}

export default function StatsClaimModal({
    roundId,
    unregisteredPlayers,
    currentUserId,
    currentUserName,
    onClose
}: StatsClaimModalProps) {
    const [claimLinks, setClaimLinks] = useState<{ [playerId: string]: string }>({});
    const [isGenerating, setIsGenerating] = useState<{ [playerId: string]: boolean }>({});
    const [errors, setErrors] = useState<{ [playerId: string]: string }>({});

    const handleGenerateClaim = async (player: Player) => {
        setIsGenerating(prev => ({ ...prev, [player.id]: true }));
        setErrors(prev => ({ ...prev, [player.id]: '' }));

        try {
            const { claimUrl } = await createStatsClaim(
                roundId,
                player.id,
                player.name,
                currentUserId,
                currentUserName,
                'link'
            );

            setClaimLinks(prev => ({ ...prev, [player.id]: claimUrl }));
        } catch (error) {
            console.error('Error generating claim:', error);
            setErrors(prev => ({
                ...prev,
                [player.id]: 'Failed to generate claim link'
            }));
        } finally {
            setIsGenerating(prev => ({ ...prev, [player.id]: false }));
        }
    };

    const handleCopyLink = async (playerId: string, link: string) => {
        try {
            await navigator.clipboard.writeText(link);
            // Visual feedback handled by SocialShareButton
        } catch (error) {
            console.error('Failed to copy:', error);
            alert('Failed to copy to clipboard');
        }
    };

    const allLinksGenerated = unregisteredPlayers.every(p => claimLinks[p.id]);

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}
        >
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--background)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
            >
                {/* Header */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h2 style={{ margin: 0 }}>Invite Players</h2>
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
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Invite unregistered players to claim their stats and create an account
                    </p>
                </div>

                {/* Players List */}
                {unregisteredPlayers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <p>All players are already registered!</p>
                        <p style={{ fontSize: '0.875rem' }}>Everyone in this round has an account.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {unregisteredPlayers.map(player => (
                            <div
                                key={player.id}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: 'var(--surface)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                {/* Player Info */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                        {player.name}
                                    </div>
                                    {player.email && (
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {player.email}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {!claimLinks[player.id] ? (
                                    <div>
                                        <button
                                            className="btn"
                                            onClick={() => handleGenerateClaim(player)}
                                            disabled={isGenerating[player.id]}
                                            style={{
                                                width: '100%',
                                                backgroundColor: 'var(--primary)'
                                            }}
                                        >
                                            {isGenerating[player.id] ? 'Generating...' : 'Generate Invite Link'}
                                        </button>
                                        {errors[player.id] && (
                                            <div style={{
                                                marginTop: '0.5rem',
                                                padding: '0.5rem',
                                                backgroundColor: 'var(--danger)',
                                                borderRadius: '4px',
                                                fontSize: '0.875rem',
                                                color: 'white'
                                            }}>
                                                {errors[player.id]}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        {/* Success Message */}
                                        <div style={{
                                            padding: '0.75rem',
                                            backgroundColor: 'var(--success)',
                                            borderRadius: '6px',
                                            marginBottom: '1rem',
                                            color: 'white',
                                            fontSize: '0.875rem'
                                        }}>
                                            ✓ Invite link generated!
                                        </div>

                                        {/* Claim Link */}
                                        <div style={{
                                            padding: '0.75rem',
                                            backgroundColor: 'var(--background)',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontFamily: 'monospace',
                                            wordBreak: 'break-all',
                                            marginBottom: '1rem',
                                            border: '1px solid var(--border)'
                                        }}>
                                            {claimLinks[player.id]}
                                        </div>

                                        {/* Share Buttons */}
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <button
                                                className="btn"
                                                onClick={() => handleCopyLink(player.id, claimLinks[player.id])}
                                                style={{
                                                    flex: 1,
                                                    minWidth: '120px',
                                                    backgroundColor: 'var(--border)'
                                                }}
                                            >
                                                📋 Copy Link
                                            </button>

                                            <SocialShareButton
                                                shareData={{
                                                    type: 'claim',
                                                    claimUrl: claimLinks[player.id],
                                                    playerName: player.name
                                                }}
                                                platforms={['twitter', 'facebook', 'sms', 'copy']}
                                                style={{
                                                    flex: 1,
                                                    minWidth: '120px',
                                                    backgroundColor: 'var(--primary)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer Actions */}
                <div style={{
                    marginTop: '1.5rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'flex-end'
                }}>
                    {allLinksGenerated && (
                        <button
                            className="btn"
                            onClick={onClose}
                            style={{ backgroundColor: 'var(--success)' }}
                        >
                            Done
                        </button>
                    )}
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{ backgroundColor: 'var(--border)' }}
                    >
                        {allLinksGenerated ? 'Close' : 'Skip for Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}
