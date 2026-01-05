'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { testFirebaseConnection, testFirestoreRules } from '@/lib/testFirebase';

export default function TestFirebase() {
    // Protect from production deployment
    useEffect(() => {
        if (process.env.NODE_ENV === 'production') {
            redirect('/');
        }
    }, []);

    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleTest = async () => {
        setLoading(true);
        const testResult = await testFirebaseConnection();
        setResult(testResult);
        setLoading(false);
    };

    const handleTestRules = async () => {
        setLoading(true);
        const testResult = await testFirestoreRules();
        setResult(testResult);
        setLoading(false);
    };

    return (
        <main className="container" style={{ padding: '2rem' }}>
            <h1>Firebase Connection Test</h1>
            
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                    className="btn"
                    onClick={handleTest}
                    disabled={loading}
                    style={{ backgroundColor: 'var(--success)' }}
                >
                    Test Connection
                </button>
                <button
                    className="btn"
                    onClick={handleTestRules}
                    disabled={loading}
                    style={{ backgroundColor: 'var(--info)' }}
                >
                    Test Firestore Rules
                </button>
            </div>

            {loading && <p style={{ marginTop: '1rem' }}>Testing...</p>}

            {result && (
                <div
                    className="card"
                    style={{
                        marginTop: '2rem',
                        backgroundColor: result.success
                            ? 'rgba(46, 204, 113, 0.1)'
                            : 'rgba(231, 76, 60, 0.1)',
                        borderColor: result.success ? 'var(--success)' : 'var(--danger)',
                        borderWidth: '2px',
                        borderStyle: 'solid'
                    }}
                >
                    <h3>{result.success ? '✅ Success' : '❌ Error'}</h3>
                    <p>{result.message}</p>
                    {result.error && (
                        <details style={{ marginTop: '1rem' }}>
                            <summary style={{ cursor: 'pointer' }}>Error Details</summary>
                            <pre style={{ 
                                marginTop: '0.5rem', 
                                fontSize: '0.875rem',
                                background: 'rgba(0,0,0,0.1)',
                                padding: '1rem',
                                borderRadius: '4px',
                                overflow: 'auto'
                            }}>
                                {JSON.stringify(result.error, null, 2)}
                            </pre>
                        </details>
                    )}
                </div>
            )}

            <div className="card" style={{ marginTop: '2rem' }}>
                <h3>Environment Variables Status</h3>
                <div style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                        API Key: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY 
                            ? `✅ Set (${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 10)}...)` 
                            : '❌ Missing'}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                        Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID 
                            ? `✅ Set (${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID})` 
                            : '❌ Missing'}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                        Auth Domain: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN 
                            ? `✅ Set (${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN})` 
                            : '❌ Missing'}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                        Storage Bucket: {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET 
                            ? `✅ Set (${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET})` 
                            : '❌ Missing'}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                        Messaging Sender ID: {process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID 
                            ? `✅ Set (${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID})` 
                            : '❌ Missing'}
                    </div>
                    <div>
                        App ID: {process.env.NEXT_PUBLIC_FIREBASE_APP_ID 
                            ? `✅ Set (${process.env.NEXT_PUBLIC_FIREBASE_APP_ID.substring(0, 20)}...)` 
                            : '❌ Missing'}
                    </div>
                </div>
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(52, 152, 219, 0.1)', borderRadius: '8px' }}>
                    <strong>Note:</strong> In Next.js, environment variables are embedded at build time. 
                    If they show "Missing" here but the "Test Connection" button works, Firebase is configured correctly.
                    The display issue is a Next.js client-side rendering quirk.
                </div>
            </div>
        </main>
    );
}

