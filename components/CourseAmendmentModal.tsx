'use client';

import { useState, useEffect } from 'react';
import { Course, CourseLayout } from '@/types/firestore';

interface CourseAmendmentModalProps {
    course: Course;
    layoutId: string;
    onClose: () => void;
    onSave: (holePars: { [holeNumber: number]: number }, submitToDatabase: boolean) => Promise<void>;
}

export default function CourseAmendmentModal({
    course,
    layoutId,
    onClose,
    onSave
}: CourseAmendmentModalProps) {
    const [holePars, setHolePars] = useState<{ [holeNumber: number]: number }>({});
    const [submitToDatabase, setSubmitToDatabase] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize with current par values
    useEffect(() => {
        const layout = course.layouts?.[layoutId];
        const pars: { [holeNumber: number]: number } = {};
        
        if (layout?.holes) {
            // Get pars from layout
            for (let i = 1; i <= 18; i++) {
                pars[i] = layout.holes[i]?.par || 3;
            }
        } else {
            // Fallback: default all to par 3
            for (let i = 1; i <= 18; i++) {
                pars[i] = 3;
            }
        }
        
        setHolePars(pars);
    }, [course, layoutId]);

    const handleParChange = (holeNumber: number, value: string) => {
        const parValue = parseInt(value, 10);
        if (parValue >= 2 && parValue <= 6) {
            setHolePars(prev => ({
                ...prev,
                [holeNumber]: parValue
            }));
            setError(null);
        } else {
            setError(`Par must be between 2 and 6`);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        
        try {
            await onSave(holePars, submitToDatabase);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save course amendments');
        } finally {
            setSaving(false);
        }
    };

    const parTotal = Object.values(holePars).reduce((sum, par) => sum + par, 0);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    backgroundColor: '#1e1e1e'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Amend Course Par Values</h2>
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--danger)',
                            minHeight: 'auto'
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        Course: <strong>{course.name}</strong>
                    </p>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        Layout: <strong>{course.layouts?.[layoutId]?.name || 'Main'}</strong>
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'rgba(231, 76, 60, 0.2)',
                        border: '1px solid var(--danger)',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        color: 'var(--danger)'
                    }}>
                        {error}
                    </div>
                )}

                {/* Par Input Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '0.75rem',
                    marginBottom: '1.5rem'
                }}>
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(holeNumber => (
                        <div key={holeNumber} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-light)',
                                fontWeight: 500
                            }}>
                                Hole {holeNumber}
                            </label>
                            <input
                                type="number"
                                min="2"
                                max="6"
                                value={holePars[holeNumber] || 3}
                                onChange={(e) => handleParChange(holeNumber, e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    fontSize: '1rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg)',
                                    color: 'var(--text)',
                                    textAlign: 'center'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Par Total */}
                <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>Total Par: </span>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{parTotal}</strong>
                </div>

                {/* Submit to Database Checkbox */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: 'var(--text-light)'
                    }}>
                        <input
                            type="checkbox"
                            checked={submitToDatabase}
                            onChange={(e) => setSubmitToDatabase(e.target.checked)}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer'
                            }}
                        />
                        <span>Submit as custom layout to database for possible inclusion</span>
                    </label>
                    {submitToDatabase && (
                        <p style={{
                            fontSize: '0.75rem',
                            color: 'var(--info)',
                            marginTop: '0.5rem',
                            marginLeft: '1.75rem'
                        }}>
                            Your custom layout will be reviewed and may be added to the public course database.
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            backgroundColor: 'var(--border)'
                        }}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn"
                        onClick={handleSave}
                        style={{
                            flex: 1,
                            backgroundColor: 'var(--success)'
                        }}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Amendments'}
                    </button>
                </div>
            </div>
        </div>
    );
}





