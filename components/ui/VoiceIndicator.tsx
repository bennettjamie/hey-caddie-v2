'use client';

import React from 'react';

interface VoiceIndicatorProps {
    isListening: boolean;
    isListeningForHotWord: boolean;
    size?: 'small' | 'medium' | 'large';
}

export default function VoiceIndicator({
    isListening,
    isListeningForHotWord,
    size = 'medium'
}: VoiceIndicatorProps) {
    const sizeMap = {
        small: 12,
        medium: 16,
        large: 24
    };

    const dotSize = sizeMap[size];

    if (!isListening && !isListeningForHotWord) {
        return (
            <div
                style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
                    backgroundColor: '#95a5a6',
                    transition: 'background-color 0.3s ease'
                }}
            />
        );
    }

    const color = isListening ? '#e74c3c' : '#3498db';
    const pulseColor = isListening ? 'rgba(231, 76, 60, 0.4)' : 'rgba(52, 152, 219, 0.4)';

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
                style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
                    backgroundColor: color,
                    position: 'relative',
                    zIndex: 2,
                    animation: 'pulse 1.5s ease-in-out infinite'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: dotSize * 2,
                    height: dotSize * 2,
                    borderRadius: '50%',
                    backgroundColor: pulseColor,
                    zIndex: 1,
                    animation: 'pulse-ring 1.5s ease-in-out infinite'
                }}
            />
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.7;
                    }
                }
                @keyframes pulse-ring {
                    0% {
                        transform: translate(-50%, -50%) scale(0.8);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1.4);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}






