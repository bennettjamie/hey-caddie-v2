'use client';

import React, { useEffect, useState } from 'react';
import { AchievementType } from '@/lib/stats';

interface AchievementToastProps {
    type: AchievementType;
    details: string;
    onClose: () => void;
    duration?: number;
}

export default function AchievementToast({ type, details, onClose, duration = 4000 }: AchievementToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            // Wait for fade out animation before unmounting
            setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (type === 'NONE') return null;

    const getIcon = () => {
        switch (type) {
            case 'PERSONAL_BEST': return '🏆';
            case 'COMEBACK': return '🔥';
            default: return '✨';
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'PERSONAL_BEST': return 'Personal Best!';
            case 'COMEBACK': return 'Comeback!';
            default: return 'Achievement!';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'PERSONAL_BEST': return 'var(--primary, #00f260)';
            case 'COMEBACK': return '#ff9f43'; // Orange
            default: return 'var(--text-light)';
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: `translateX(-50%) translateY(${isVisible ? '0' : '-20px'})`,
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.3s ease-in-out',
            zIndex: 9999,
            background: 'var(--surface, #1e1e1e)',
            border: `2px solid ${getColor()}`,
            borderRadius: '12px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
            maxWidth: '90vw',
            width: 'max-content'
        }}>
            <div style={{ fontSize: '2rem' }}>{getIcon()}</div>
            <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: getColor() }}>
                    {getTitle()}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text, #fff)' }}>
                    {details}
                </div>
            </div>
        </div>
    );
}
