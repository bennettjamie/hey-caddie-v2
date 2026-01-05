'use client';

import React, { useState } from 'react';

interface VoiceHelpModalProps {
    onClose: () => void;
}

export default function VoiceHelpModal({ onClose }: VoiceHelpModalProps) {
    const [activeTab, setActiveTab] = useState<'offline' | 'online'>('offline');

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <h2>🎤 Voice Commands</h2>
                    <button onClick={onClose} className="btn" style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setActiveTab('offline')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'offline' ? '2px solid var(--primary)' : 'none',
                            color: activeTab === 'offline' ? 'var(--primary)' : 'var(--text-light)',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Basic (Offline)
                    </button>
                    <button
                        onClick={() => setActiveTab('online')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'online' ? '2px solid var(--info)' : 'none',
                            color: activeTab === 'online' ? 'var(--info)' : 'var(--text-light)',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Pro (AI / Online)
                    </button>
                </div>

                {activeTab === 'offline' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <h4 style={{ color: 'var(--success)' }}>⛳ Scoring</h4>
                            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
                                <li>"I got a par"</li>
                                <li>"Jamie got a birdie"</li>
                                <li>"Change score for me to 5"</li>
                            </ul>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <h4 style={{ color: 'var(--warning)' }}>🚶 Navigation</h4>
                            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
                                <li>"Next hole" / "Previous hole"</li>
                                <li>"Go to hole 18"</li>
                            </ul>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <h4 style={{ color: 'var(--danger)' }}>💰 Betting</h4>
                            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
                                <li>"Start Skins for 1 dollar"</li>
                                <li>"Start Nassau"</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0, 242, 96, 0.1)', borderRadius: '8px', border: '1px solid var(--info)' }}>
                            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}><em>Requires Internet Connection</em></p>
                            <h4 style={{ color: 'var(--info)' }}>🤖 Smart Queries</h4>
                            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
                                <li>"Start a round at Zilker Park"</li>
                                <li>"Who is winning?"</li>
                                <li>"Read back the scores"</li>
                                <li>"What's the tee order?"</li>
                                <li>"Did Jamie hit the gap?"</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
