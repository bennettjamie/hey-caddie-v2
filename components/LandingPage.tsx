'use client';

import { useState } from 'react';
import { useVoice } from '@/context/VoiceContext';

interface LandingPageProps {
    onLogin: () => void;
    onManualSetup: () => void;
    isConfigured: boolean;
}

export default function LandingPage({ onLogin, onManualSetup, isConfigured }: LandingPageProps) {
    const { isListening, startListening } = useVoice();

    return (
        <div className="landing-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '1000px',
            margin: '0 auto'
        }}>
            {/* Header */}
            <div style={{ marginTop: '2rem', marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 800, margin: 0 }}>Hey Caddie</h1>
                    <span style={{ fontSize: '3rem' }}>🏌️‍♂️</span>
                </div>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-light)' }}>natural language golf scoring</p>
            </div>

            {/* Config Error Warning */}
            {!isConfigured && (
                <div className="card" style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid var(--error)', marginBottom: '2rem', maxWidth: '600px' }}>
                    <h3 style={{ color: 'var(--error)' }}>⚠️ Configuration Missing</h3>
                    <p>The app is not connected to the database. Please check your Vercel Environment Variables.</p>
                </div>
            )}

            {/* Voice Prompt Card */}
            <div className="card" style={{
                width: '100%',
                maxWidth: '600px',
                marginBottom: '1.5rem',
                backgroundColor: 'var(--surface-paper)',
                padding: '2rem'
            }}>
                <p style={{ color: 'var(--text-light)', marginBottom: '1rem', fontWeight: 600 }}>Try saying...</p>
                <p style={{
                    color: 'var(--primary)',
                    fontSize: '1.4rem',
                    marginBottom: '0',
                    lineHeight: '1.4'
                }}>
                    "Hey Caddie, let's start a round at QE Park with me and John"
                </p>
            </div>

            {/* Voice Input Bar */}
            <div style={{
                width: '100%',
                maxWidth: '600px',
                display: 'flex',
                backgroundColor: 'var(--surface-paper)',
                borderRadius: '50px',
                padding: '0.75rem 1.5rem',
                alignItems: 'center',
                marginBottom: '3rem',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <span onClick={startListening} style={{ fontSize: '1.5rem', marginRight: '1rem', cursor: 'pointer' }}>🎤</span>
                <input
                    type="text"
                    placeholder="Tap mic and say 'Start round at...'"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        flex: 1,
                        fontSize: '1.1rem',
                        outline: 'none'
                    }}
                />
                <span style={{ fontSize: '1.5rem', marginLeft: '1rem', opacity: 0.5 }}>➤</span>
            </div>

            {/* Login / Auth Section */}
            <div style={{ width: '100%', maxWidth: '400px' }}>
                <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>Sign in to save your stats and courses</p>

                <button
                    onClick={onLogin}
                    className="btn"
                    style={{
                        width: '100%',
                        backgroundColor: 'white',
                        color: 'black',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.8rem',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        marginBottom: '2rem'
                    }}
                >
                    {/* Google Icon SVG */}
                    <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                        </g>
                    </svg>
                    Sign in with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', gap: '1rem', color: 'var(--text-light)' }}>
                    <div style={{ height: '1px', backgroundColor: 'var(--text-light)', width: '100px', opacity: 0.3 }}></div>
                    <span>OR</span>
                    <div style={{ height: '1px', backgroundColor: 'var(--text-light)', width: '100px', opacity: 0.3 }}></div>
                </div>

                <button
                    onClick={onManualSetup}
                    className="btn btn-secondary"
                    style={{
                        width: '100%',
                        padding: '1rem',
                        fontSize: '1rem',
                        marginBottom: '4rem'
                    }}
                >
                    Set Up a Round Manually
                </button>
            </div>

            {/* Bottom Nav */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: '600px' }}>
                <button className="btn btn-secondary" onClick={onManualSetup}>Manage Players</button>
                <button className="btn btn-secondary" onClick={onManualSetup}>Manage Courses</button>
                <button className="btn btn-secondary" onClick={onManualSetup}>Import Game</button>
                <button className="btn btn-secondary" onClick={onManualSetup}>Join Tournament</button>
            </div>
        </div>
    );
}
