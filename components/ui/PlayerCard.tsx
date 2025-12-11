'use client';

import React from 'react';

interface PlayerCardProps {
    player: { id: string; name: string };
    par: number;
    relativeScore: number | null;
    absoluteScore: number | null;
    onScoreChange: (change: number) => void;
    onCardClick?: () => void;
}

export default function PlayerCard({
    player,
    par,
    relativeScore,
    absoluteScore,
    onScoreChange,
    onCardClick
}: PlayerCardProps) {
    const hasScore = relativeScore !== null;
    
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
                    <span
                        style={{
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            display: 'block',
                            lineHeight: 1.2
                        }}
                    >
                        {scoreDisplay}
                    </span>
                    <span
                        style={{
                            fontSize: '0.9rem',
                            color: '#666',
                            marginTop: '0.25rem',
                            display: 'block'
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
        </div>
    );
}

