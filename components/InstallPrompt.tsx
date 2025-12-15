'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (typeof window !== 'undefined') {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;
            setIsStandalone(isStandaloneMode);

            // Check if iOS
            const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
            setIsIOS(iOS);

            // Listen for beforeinstallprompt event (Android/Chrome)
            const handleBeforeInstallPrompt = (e: Event) => {
                e.preventDefault();
                setDeferredPrompt(e as BeforeInstallPromptEvent);
                // Show prompt after a delay (don't be too aggressive)
                const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-seen');
                if (!hasSeenPrompt) {
                    setTimeout(() => setShowPrompt(true), 3000);
                }
            };

            window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

            return () => {
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            };
        }
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
                setDeferredPrompt(null);
            }
            localStorage.setItem('pwa-install-prompt-seen', 'true');
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-install-prompt-seen', 'true');
    };

    // Don't show if already installed or if prompt was dismissed
    if (isStandalone || !showPrompt || (!deferredPrompt && !isIOS)) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'var(--bg)',
                borderTop: '2px solid var(--primary)',
                padding: '1rem',
                zIndex: 1000,
                boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        Install Hey Caddy
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                        {isIOS
                            ? 'Tap the share button, then "Add to Home Screen"'
                            : 'Install for a better experience with offline support'}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!isIOS && deferredPrompt && (
                        <button
                            className="btn"
                            onClick={handleInstallClick}
                            style={{
                                backgroundColor: 'var(--success)',
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem'
                            }}
                        >
                            Install
                        </button>
                    )}
                    <button
                        className="btn"
                        onClick={handleDismiss}
                        style={{
                            backgroundColor: 'var(--border)',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem'
                        }}
                    >
                        {isIOS ? 'Got it' : 'Later'}
                    </button>
                </div>
            </div>
        </div>
    );
}
