'use client';

import React from 'react';

interface VoiceWaveformProps {
    isListening: boolean;
    height?: number;
    color?: string;
}

export default function VoiceWaveform({ isListening, height = 40, color = 'var(--text-light)' }: VoiceWaveformProps) {
    if (!isListening) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: `${height}px` }}>
            {[...Array(5)].map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: '4px',
                        backgroundColor: color,
                        height: '100%',
                        borderRadius: '2px',
                        animation: `wave 1.2s ease-in-out infinite ${i * 0.1}s`
                    }}
                />
            ))}
            <style jsx>{`
                @keyframes wave {
                    0%, 100% { height: 20%; opacity: 0.5; }
                    50% { height: 100%; opacity: 1; }
                }
            `}</style>
        </div>
    );
}
