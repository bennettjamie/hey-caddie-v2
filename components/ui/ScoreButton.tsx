'use client';

import React from 'react';

interface ScoreButtonProps {
    label: string;
    score: number;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    size?: 'small' | 'medium' | 'large';
}

const variantStyles: { [key: string]: React.CSSProperties } = {
    primary: { backgroundColor: '#3498db', color: 'white' },
    secondary: { backgroundColor: '#95a5a6', color: 'white' },
    success: { backgroundColor: '#2ecc71', color: 'white' },
    warning: { backgroundColor: '#f39c12', color: 'white' },
    danger: { backgroundColor: '#e74c3c', color: 'white' }
};

const sizeStyles: { [key: string]: React.CSSProperties } = {
    small: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
    medium: { padding: '0.75rem 1.5rem', fontSize: '1rem' },
    large: { padding: '1rem 2rem', fontSize: '1.25rem', minHeight: '60px' }
};

export default function ScoreButton({
    label,
    score,
    onClick,
    variant = 'primary',
    size = 'medium'
}: ScoreButtonProps) {
    const baseStyle: React.CSSProperties = {
        border: 'none',
        borderRadius: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        ...variantStyles[variant],
        ...sizeStyles[size]
    };

    return (
        <button
            style={baseStyle}
            onClick={onClick}
            onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
            }}
            onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <span>{label}</span>
                <span style={{ fontSize: '0.75em', opacity: 0.9 }}>
                    {score < 0 ? score : score > 0 ? `+${score}` : 'E'}
                </span>
            </div>
        </button>
    );
}

