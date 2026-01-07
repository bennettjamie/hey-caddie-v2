'use client';

import { useState } from 'react';

export type ShareType = 'round' | 'achievement' | 'challenge' | 'claim';

interface ShareData {
    type: ShareType;
    // Round result data
    score?: number;
    courseName?: string;
    date?: string;
    // Achievement data
    achievementTitle?: string;
    achievementDescription?: string;
    // Challenge data
    challengeText?: string;
    targetScore?: number;
    // Claim invite data
    claimUrl?: string;
    playerName?: string;
}

interface SocialShareButtonProps {
    shareData: ShareData;
    platforms?: ('twitter' | 'facebook' | 'sms' | 'copy')[];
    className?: string;
    style?: React.CSSProperties;
}

export default function SocialShareButton({
    shareData,
    platforms = ['twitter', 'facebook', 'sms', 'copy'],
    className = '',
    style = {}
}: SocialShareButtonProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateShareText = (): string => {
        const { type } = shareData;

        switch (type) {
            case 'round':
                const scoreText = shareData.score! > 0
                    ? `+${shareData.score}`
                    : shareData.score === 0
                        ? 'E'
                        : shareData.score;
                return `Just shot ${scoreText} at ${shareData.courseName}! 🎯⛓️ #DiscGolf #HeyCaddie`;

            case 'achievement':
                return `${shareData.achievementTitle}! ${shareData.achievementDescription || ''} 🏆 #DiscGolf #HeyCaddie`;

            case 'challenge':
                return `${shareData.challengeText || `Can you beat my ${shareData.targetScore} at ${shareData.courseName}?`} 💪 #DiscGolfChallenge #HeyCaddie`;

            case 'claim':
                return `Hey ${shareData.playerName}, check out your round stats! Click to claim your profile: ${shareData.claimUrl} 📊`;

            default:
                return 'Check out HeyCaddie - The best disc golf scoring app! #DiscGolf';
        }
    };

    const generateShareUrl = (): string => {
        if (shareData.type === 'claim' && shareData.claimUrl) {
            return shareData.claimUrl;
        }
        // Default to app homepage
        return typeof window !== 'undefined' ? window.location.origin : 'https://heycaddie.app';
    };

    const handleShare = (platform: string) => {
        const text = generateShareText();
        const url = generateShareUrl();
        const encodedText = encodeURIComponent(text);
        const encodedUrl = encodeURIComponent(url);

        let shareUrl = '';

        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
                break;

            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
                break;

            case 'sms':
                shareUrl = `sms:?&body=${encodedText}`;
                break;

            case 'copy':
                handleCopyLink(text);
                return;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }

        setShowMenu(false);
    };

    const handleCopyLink = async (customText?: string) => {
        const textToCopy = customText || generateShareText();

        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            alert('Failed to copy to clipboard');
        }
    };

    return (
        <div style={{ position: 'relative', ...style }}>
            <button
                className={`btn ${className}`}
                onClick={() => setShowMenu(!showMenu)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    ...style
                }}
            >
                <span>Share</span>
                <span style={{ fontSize: '1.2em' }}>↗</span>
            </button>

            {showMenu && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        backgroundColor: 'var(--surface)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        minWidth: '200px',
                        overflow: 'hidden'
                    }}
                >
                    {platforms.includes('twitter') && (
                        <button
                            onClick={() => handleShare('twitter')}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: 'var(--text)',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontSize: '0.95rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--border)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <span style={{ fontSize: '1.2em' }}>🐦</span>
                            <span>Share on Twitter</span>
                        </button>
                    )}

                    {platforms.includes('facebook') && (
                        <button
                            onClick={() => handleShare('facebook')}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: 'var(--text)',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontSize: '0.95rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--border)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <span style={{ fontSize: '1.2em' }}>📘</span>
                            <span>Share on Facebook</span>
                        </button>
                    )}

                    {platforms.includes('sms') && (
                        <button
                            onClick={() => handleShare('sms')}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: 'var(--text)',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontSize: '0.95rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--border)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <span style={{ fontSize: '1.2em' }}>💬</span>
                            <span>Share via SMS</span>
                        </button>
                    )}

                    {platforms.includes('copy') && (
                        <button
                            onClick={() => handleShare('copy')}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: 'var(--text)',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontSize: '0.95rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--border)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <span style={{ fontSize: '1.2em' }}>{copied ? '✓' : '📋'}</span>
                            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                        </button>
                    )}
                </div>
            )}

            {/* Backdrop to close menu when clicking outside */}
            {showMenu && (
                <div
                    onClick={() => setShowMenu(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                    }}
                />
            )}
        </div>
    );
}
