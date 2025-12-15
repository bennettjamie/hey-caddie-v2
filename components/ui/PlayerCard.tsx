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
    const prevAbsoluteScore = React.useRef<number | null>(null);
    const prevRelativeScore = React.useRef<number | null>(null);

    // Calculate score color based on relative and absolute score
    const getScoreColor = (relScore: number | null, absScore: number | null, holePar: number): string => {
        if (relScore === null) return 'var(--text)';
        
        // Special cases
        if (absScore === 1) return '#ff0000'; // Hole-in-one (bright red)
        if (absScore === 8) return '#34495e'; // Snowman (dark gray)
        
        // Relative to par
        if (relScore <= -2) return '#ff3333'; // Double eagle/eagle (bright red)
        if (relScore === -1) return '#e74c3c'; // Birdie (red)
        if (relScore === 0) return 'var(--success)'; // Par (current green)
        if (relScore === 1) return '#27ae60'; // Bogey (green)
        if (relScore === 2) return '#1e8449'; // Double bogey (darker green)
        if (relScore >= 3) return '#196f3d'; // Triple+ bogey (darkest green)
        
        return 'var(--text)';
    };

    // Trigger animations when score changes
    useEffect(() => {
        if (absoluteScore !== null && absoluteScore !== prevAbsoluteScore.current) {
            if (absoluteScore === 1) {
                setShowHoleInOneAnimation(true);
                setTimeout(() => setShowHoleInOneAnimation(false), 2000);
            }
            if (absoluteScore === 8) {
                setShowSnowmanAnimation(true);
                setTimeout(() => setShowSnowmanAnimation(false), 2000);
            }
            prevAbsoluteScore.current = absoluteScore;
        }
    }, [absoluteScore]);

    // Check for birdie and Turkey animations (3 consecutive birdies across holes)
    useEffect(() => {
        if (relativeScore === -1) {
            // Always show birdie animation when a birdie is scored
            // Check for Turkey (3 consecutive birdies on last 3 holes)
            if (recentHoleScores.length >= 3 && recentHoleScores.slice(-3).every(score => score === -1)) {
                setShowTurkeyAnimation(true);
                // Play gobble gobble sound
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance('gobble gobble');
                    utterance.rate = 0.8;
                    utterance.pitch = 1.2;
                    speechSynthesis.speak(utterance);
                }
                setTimeout(() => setShowTurkeyAnimation(false), 3000);
            } else if (relativeScore !== prevRelativeScore.current) {
                // Single birdie (only animate when score changes, not on every render)
                setShowBirdieAnimation(true);
                setTimeout(() => setShowBirdieAnimation(false), 2000);
            }
            prevRelativeScore.current = relativeScore;
        } else {
            // Reset animations when not a birdie
            prevRelativeScore.current = relativeScore;
        }
    }, [relativeScore, recentHoleScores]);
    
    const scoreColor = getScoreColor(relativeScore, absoluteScore, par);
    
    const cardStyle: React.CSSProperties = {
        border: `2px solid ${hasScore ? 'var(--primary)' : 'var(--warning)'}`,
        backgroundColor: hasScore ? 'rgba(46, 204, 113, 0.1)' : 'rgba(243, 156, 18, 0.1)',
        borderRadius: '16px',
        padding: '1.5rem',
        transition: 'all 0.2s ease',
        cursor: onCardClick ? 'pointer' : 'default'
    };

    const scoreDisplay = hasScore && absoluteScore !== null ? absoluteScore : '-';
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
                <div style={{ textAlign: 'center', flex: 1 }}>
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
                            color: scoreColor,
                            animation: showHoleInOneAnimation ? 'holeInOnePulse 1s ease-in-out' : 
                                      showSnowmanAnimation ? 'snowmanBounce 1s ease-in-out' :
                                      showTurkeyAnimation ? 'turkeyCelebration 2s ease-in-out' :
                                      showBirdieAnimation ? 'birdieFly 1.5s ease-in-out' : 'none',
                            position: 'relative'
                        }}
                    >
                        {isHoleInOne && showHoleInOneAnimation && '🎯'}
                        {isSnowman && showSnowmanAnimation && '⛄'}
                        {showTurkeyAnimation && '🦃'}
                        {showBirdieAnimation && !showTurkeyAnimation && '🐦'}
                        {scoreDisplay}
                    </span>
                    <span
                        style={{
                            fontSize: '0.9rem',
                            color: scoreColor,
                            marginTop: '0.25rem',
                            display: 'block',
                            fontWeight: hasScore ? 500 : 400
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

