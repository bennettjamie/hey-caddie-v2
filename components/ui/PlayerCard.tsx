'use client';

import React, { useState, useEffect } from 'react';

interface PlayerCardProps {
    player: { id: string; name: string };
    par: number;
    relativeScore: number | null;
    absoluteScore: number | null;
    onScoreChange: (change: number) => void;
    onCardClick?: () => void;
    holeNumber?: number;
    recentHoleScores?: number[]; // Last 3 holes' relative scores for this player
}

import { playSound } from '@/lib/audio';

export default function PlayerCard({
    player,
    par,
    relativeScore,
    absoluteScore,
    onScoreChange,
    onCardClick,
    holeNumber,
    recentHoleScores = []
}: PlayerCardProps) {
    const hasScore = relativeScore !== null;
    const [showHoleInOneAnimation, setShowHoleInOneAnimation] = useState(false);
    const [showSnowmanAnimation, setShowSnowmanAnimation] = useState(false);
    const [showBirdieAnimation, setShowBirdieAnimation] = useState(false);
    const [showTurkeyAnimation, setShowTurkeyAnimation] = useState(false);
    
    // Track previous score to detect new entries
    const prevAbsoluteScore = React.useRef<number | null>(null);

    useEffect(() => {
        // Only trigger on new score entry (prev was null, now has value)
        if (hasScore && absoluteScore !== null && prevAbsoluteScore.current === null) {
            
            // Hole-in-One
            if (absoluteScore === 1) {
                setShowHoleInOneAnimation(true);
                playSound('hole_in_one');
                setTimeout(() => setShowHoleInOneAnimation(false), 3000);
            }
            // Snowman (8)
            else if (absoluteScore === 8) {
                setShowSnowmanAnimation(true);
                playSound('snowman');
                setTimeout(() => setShowSnowmanAnimation(false), 2000);
            }
            // Birdie (-1) or better
            else if (relativeScore !== null && relativeScore <= -1) {
                // Check for Turkey (3 birdies/eagles in a row)
                // recentHoleScores includes the current hole at the end
                // We need 3 scores <= -1
                const isTurkey = recentHoleScores.length >= 3 && 
                               recentHoleScores.slice(-3).every(s => s <= -1);

                if (isTurkey) {
                    setShowTurkeyAnimation(true);
                    playSound('turkey');
                    setTimeout(() => setShowTurkeyAnimation(false), 3000);
                } else {
                    setShowBirdieAnimation(true);
                    playSound('birdie');
                    setTimeout(() => setShowBirdieAnimation(false), 2000);
                }
            }
        }
        
        // Update ref
        prevAbsoluteScore.current = absoluteScore;
    }, [absoluteScore, relativeScore, hasScore, recentHoleScores]);

    // Updated Score Colors to match Emerald Theme
    const getScoreColor = (relScore: number | null, absScore: number | null, holePar: number): string => {
        if (relScore === null) return 'var(--text)';

        // Special cases
        if (absScore === 1) return '#F59E0B'; // Hole-in-one (Amber/Gold)
        if (absScore === 8) return '#94A3B8'; // Snowman (Slate Gray)

        // Relative to par
        if (relScore <= -2) return '#10B981'; // Eagle (Bright Emerald)
        if (relScore === -1) return '#34D399'; // Birdie (Light Emerald)
        if (relScore === 0) return '#F8FAFC'; // Par (White)
        if (relScore === 1) return '#FCA5A5'; // Bogey (Soft Red)
        if (relScore >= 2) return '#EF4444'; // Double+ (Bright Red)

        return 'var(--text)';
    };

    const scoreColor = getScoreColor(relativeScore, absoluteScore, par);

    // Card Style: Dark Surface, Subtle Border
    const cardStyle: React.CSSProperties = {
        border: `1px solid ${hasScore ? 'var(--primary-dark)' : 'var(--border)'}`,
        backgroundColor: hasScore ? 'rgba(16, 185, 129, 0.05)' : 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onCardClick ? 'pointer' : 'default',
        boxShadow: hasScore ? '0 4px 12px -2px rgba(16, 185, 129, 0.1)' : 'var(--shadow-sm)'
    };


    const relativeDisplay = hasScore
        ? relativeScore === 0
            ? 'E'
            : relativeScore > 0
                ? `+${relativeScore}`
                : relativeScore
        : `Par ${par}`;

    // Determine if we should show special display for hole-in-one or snowman
    const isHoleInOne = absoluteScore === 1;
    const isSnowman = absoluteScore === 8;

    return (
        <div
            style={cardStyle}
            onClick={onCardClick}
            onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
            }}
        >
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>{player.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button
                    className="btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onScoreChange(-1);
                    }}
                    style={{
                        minWidth: '44px',
                        minHeight: '44px',
                        borderRadius: '50%',
                        fontSize: '1.5rem',
                        padding: 0
                    }}
                >
                    −
                </button>
                <div
                    style={{
                        textAlign: 'center',
                        flex: 1,
                        cursor: 'pointer',
                        userSelect: 'none'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        // If no score set, confirm Par (change 0)
                        if (!hasScore) {
                            onScoreChange(0);
                        }
                    }}
                >
                    {/* Par X label */}
                    <span
                        style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-light)',
                            display: 'block',
                            marginBottom: '0.25rem',
                            fontWeight: 500
                        }}
                    >
                        Par {par}
                    </span>
                    {/* Score display with color and animations */}
                    <span
                        style={{
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            display: 'block',
                            lineHeight: 1.2,
                            color: hasScore ? scoreColor : 'var(--text-light)', // Faint if not set
                            opacity: hasScore ? 1 : 0.5, // Faint look
                            animation: showHoleInOneAnimation ? 'holeInOnePulse 1s ease-in-out' :
                                showSnowmanAnimation ? 'snowmanBounce 1s ease-in-out' :
                                    showTurkeyAnimation ? 'turkeyCelebration 2s ease-in-out' :
                                        showBirdieAnimation ? 'birdieFly 1.5s ease-in-out' : 'none',
                            position: 'relative',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isHoleInOne && showHoleInOneAnimation && '🎯'}
                        {isSnowman && showSnowmanAnimation && '⛄'}
                        {showTurkeyAnimation && '🦃'}
                        {showBirdieAnimation && !showTurkeyAnimation && '🐦'}
                        {hasScore && absoluteScore !== null ? absoluteScore : par}
                    </span>
                    <span
                        style={{
                            fontSize: '0.9rem',
                            color: hasScore ? scoreColor : 'var(--text-light)',
                            marginTop: '0.25rem',
                            display: 'block',
                            fontWeight: hasScore ? 500 : 400,
                            opacity: hasScore ? 1 : 0.5
                        }}
                    >
                        {relativeDisplay}
                    </span>
                </div>
                <button
                    className="btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onScoreChange(1);
                    }}
                    style={{
                        minWidth: '44px',
                        minHeight: '44px',
                        borderRadius: '50%',
                        fontSize: '1.5rem',
                        padding: 0
                    }}
                >
                    +
                </button>
            </div>
            {/* Animation styles */}
            <style jsx>{`
                @keyframes holeInOnePulse {
                    0%, 100% {
                        transform: scale(1);
                        filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.8));
                    }
                    50% {
                        transform: scale(1.2);
                        filter: drop-shadow(0 0 20px rgba(255, 0, 0, 1));
                    }
                }
                @keyframes snowmanBounce {
                    0%, 100% {
                        transform: rotate(0deg) scale(1);
                    }
                    25% {
                        transform: rotate(-10deg) scale(1.1);
                    }
                    75% {
                        transform: rotate(10deg) scale(1.1);
                    }
                }
                @keyframes birdieFly {
                    0% {
                        transform: translateY(0) scale(1);
                    }
                    25% {
                        transform: translateY(-10px) scale(1.1);
                    }
                    50% {
                        transform: translateY(-15px) scale(1.15);
                    }
                    75% {
                        transform: translateY(-10px) scale(1.1);
                    }
                    100% {
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes turkeyCelebration {
                    0%, 100% {
                        transform: scale(1) rotate(0deg);
                        filter: drop-shadow(0 0 15px rgba(255, 165, 0, 0.8));
                    }
                    25% {
                        transform: scale(1.3) rotate(-15deg);
                        filter: drop-shadow(0 0 25px rgba(255, 165, 0, 1));
                    }
                    50% {
                        transform: scale(1.4) rotate(0deg);
                        filter: drop-shadow(0 0 30px rgba(255, 165, 0, 1));
                    }
                    75% {
                        transform: scale(1.3) rotate(15deg);
                        filter: drop-shadow(0 0 25px rgba(255, 165, 0, 1));
                    }
                }
            `}</style>
        </div>
    );
}

