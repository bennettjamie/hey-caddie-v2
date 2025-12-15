'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)'
                }}>
                    <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
                        <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
                            ⚠️ Something went wrong
                        </h2>
                        <p style={{ marginBottom: '1rem', color: 'var(--text-light)' }}>
                            An unexpected error occurred. Don't worry, your data is safe.
                        </p>
                        {this.state.error && (
                            <details style={{
                                marginTop: '1rem',
                                marginBottom: '1rem',
                                textAlign: 'left',
                                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                padding: '1rem',
                                borderRadius: '8px'
                            }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    Error Details
                                </summary>
                                <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <strong>Error:</strong> {this.state.error.message}
                                    </div>
                                    {this.state.error.stack && (
                                        <pre style={{
                                            fontSize: '0.75rem',
                                            overflow: 'auto',
                                            maxHeight: '200px',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word'
                                        }}>
                                            {this.state.error.stack}
                                        </pre>
                                    )}
                                </div>
                            </details>
                        )}
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                className="btn"
                                onClick={this.handleReset}
                                style={{
                                    backgroundColor: 'var(--primary)',
                                    padding: '0.75rem 1.5rem'
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                className="btn"
                                onClick={() => window.location.reload()}
                                style={{
                                    backgroundColor: 'var(--info)',
                                    padding: '0.75rem 1.5rem'
                                }}
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}





