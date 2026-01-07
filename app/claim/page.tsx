'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { getStatsClaim, claimStats } from '@/lib/statsClaims';
import { StatsClaim } from '@/types/firestore';

function ClaimPageContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [claim, setClaim] = useState<StatsClaim | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Auth state
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    // Load claim data
    useEffect(() => {
        const loadClaim = async () => {
            if (!token) {
                setError('No claim token provided');
                setIsLoading(false);
                return;
            }

            try {
                const claimData = await getStatsClaim(token);

                if (!claimData) {
                    setError('Invalid or expired claim link');
                    setIsLoading(false);
                    return;
                }

                setClaim(claimData);
            } catch (err) {
                console.error('Error loading claim:', err);
                setError('Failed to load claim');
            } finally {
                setIsLoading(false);
            }
        };

        loadClaim();
    }, [token]);

    // Auto-claim if user is already signed in
    useEffect(() => {
        const autoClaim = async () => {
            if (currentUser && claim && !claim.claimedBy && !isClaiming && !success) {
                await handleClaim();
            }
        };

        autoClaim();
    }, [currentUser, claim]);

    const handleGoogleSignIn = async () => {
        if (!auth) {
            alert('Authentication is not available');
            return;
        }

        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // Auto-claim will trigger via useEffect
        } catch (error) {
            console.error('Sign-in failed:', error);
            setError('Sign-in failed. Please try again.');
        }
    };

    const handleClaim = async () => {
        if (!currentUser || !claim || !token) return;

        setIsClaiming(true);
        setError(null);

        try {
            await claimStats(token, currentUser.uid);
            setSuccess(true);

            // Redirect to home after 2 seconds
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } catch (err: any) {
            console.error('Error claiming stats:', err);
            setError(err.message || 'Failed to claim stats');
            setIsClaiming(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatScore = (score: number) => {
        if (score > 0) return `+${score}`;
        if (score === 0) return 'E';
        return `${score}`;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading your round stats...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error && !claim) {
        return (
            <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <h1 style={{ marginBottom: '1rem', color: 'var(--danger)' }}>Invalid Link</h1>
                    <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                        {error}
                    </p>
                    <Link href="/" className="btn">
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✓</div>
                    <h1 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Stats Claimed!</h1>
                    <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                        Your round stats have been added to your profile.
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Redirecting to home...
                    </p>
                </div>
            </div>
        );
    }

    // Already claimed
    if (claim?.claimedBy) {
        return (
            <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <h1 style={{ marginBottom: '1rem' }}>Already Claimed</h1>
                    <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                        These stats have already been claimed.
                    </p>
                    <Link href="/" className="btn">
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    // Main claim view
    return (
        <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>Claim Your Stats</h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {claim?.inviterName} has invited you to claim your round stats
                </p>
            </div>

            {/* Round Preview Card */}
            {claim && (
                <div
                    style={{
                        padding: '2rem',
                        backgroundColor: 'var(--surface)',
                        borderRadius: '12px',
                        marginBottom: '2rem',
                        border: '2px solid var(--border)'
                    }}
                >
                    {/* Player Name */}
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Player
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {claim.playerName}
                        </div>
                    </div>

                    {/* Score */}
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Score
                        </div>
                        <div
                            style={{
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                color: claim.roundSummary.score < 0 ? 'var(--success)' : claim.roundSummary.score > 0 ? 'var(--danger)' : 'var(--text)'
                            }}
                        >
                            {formatScore(claim.roundSummary.score)}
                        </div>
                    </div>

                    {/* Round Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Course:</span>
                            <span style={{ fontWeight: '500' }}>{claim.roundSummary.courseName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Date:</span>
                            <span style={{ fontWeight: '500' }}>{formatDate(claim.roundSummary.date)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Players:</span>
                            <span style={{ fontWeight: '500' }}>{claim.roundSummary.players.length}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'var(--danger)',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    color: 'white',
                    textAlign: 'center'
                }}>
                    {error}
                </div>
            )}

            {/* Action Button */}
            {!currentUser ? (
                <div>
                    <button
                        className="btn"
                        onClick={handleGoogleSignIn}
                        style={{
                            width: '100%',
                            backgroundColor: 'var(--primary)',
                            fontSize: '1.125rem',
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem'
                        }}
                    >
                        <span>Sign in with Google to Claim</span>
                    </button>
                    <p style={{
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        marginTop: '1rem'
                    }}>
                        Create a free account to track all your rounds
                    </p>
                </div>
            ) : isClaiming ? (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Claiming your stats...</p>
                </div>
            ) : null}
        </div>
    );
}

export default function ClaimPage() {
    return (
        <Suspense fallback={
            <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
                </div>
            </div>
        }>
            <ClaimPageContent />
        </Suspense>
    );
}
