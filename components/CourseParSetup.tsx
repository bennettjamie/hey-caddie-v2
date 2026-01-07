'use client';

import { useState, useEffect } from 'react';
import { updateCourseLayoutDetails } from '@/lib/courses';
import { Course } from '@/types/firestore';

interface CourseParSetupProps {
    course: Course;
    layoutKey: string;
    onComplete: () => void;
    onCancel: () => void;
}

export default function CourseParSetup({ course, layoutKey, onComplete, onCancel }: CourseParSetupProps) {
    const [numHoles, setNumHoles] = useState(18);
    const [holePars, setHolePars] = useState<{ [holeNumber: number]: number }>({});
    const [isSaving, setIsSaving] = useState(false);

    // Initialize pars when component mounts or numHoles changes
    useEffect(() => {
        const existingLayout = course.layouts?.[layoutKey];
        const initialPars: { [holeNumber: number]: number } = {};

        for (let i = 1; i <= numHoles; i++) {
            // Use existing par if available, otherwise default to 3
            initialPars[i] = existingLayout?.holes?.[i]?.par || 3;
        }

        setHolePars(initialPars);
    }, [numHoles, course, layoutKey]);

    const updatePar = (holeNumber: number, change: number) => {
        setHolePars(prev => {
            const newPar = Math.max(3, Math.min(6, (prev[holeNumber] || 3) + change));
            return { ...prev, [holeNumber]: newPar };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Pass the course object directly to avoid lookup issues
            await updateCourseLayoutDetails(course.id, layoutKey, holePars, undefined, course);
            onComplete();
        } catch (error: any) {
            console.error('Error saving pars:', error);
            alert(`Failed to save pars: ${error?.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const rows = [];
    for (let i = 0; i < numHoles; i += 2) {
        const hole1 = i + 1;
        const hole2 = i + 2 <= numHoles ? i + 2 : null;

        rows.push(
            <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                {/* Hole 1 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: '8px' }}>
                    <span style={{ minWidth: '60px', fontWeight: 600 }}>Hole {hole1}:</span>
                    <button
                        className="btn"
                        onClick={() => updatePar(hole1, -1)}
                        style={{ minWidth: '40px', padding: '0.5rem', backgroundColor: 'var(--danger)' }}
                    >
                        −
                    </button>
                    <span style={{ minWidth: '30px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 600 }}>
                        {holePars[hole1] || 3}
                    </span>
                    <button
                        className="btn"
                        onClick={() => updatePar(hole1, 1)}
                        style={{ minWidth: '40px', padding: '0.5rem', backgroundColor: 'var(--success)' }}
                    >
                        +
                    </button>
                </div>

                {/* Hole 2 (if exists) */}
                {hole2 && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: '8px' }}>
                        <span style={{ minWidth: '60px', fontWeight: 600 }}>Hole {hole2}:</span>
                        <button
                            className="btn"
                            onClick={() => updatePar(hole2, -1)}
                            style={{ minWidth: '40px', padding: '0.5rem', backgroundColor: 'var(--danger)' }}
                        >
                            −
                        </button>
                        <span style={{ minWidth: '30px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 600 }}>
                            {holePars[hole2] || 3}
                        </span>
                        <button
                            className="btn"
                            onClick={() => updatePar(hole2, 1)}
                            style={{ minWidth: '40px', padding: '0.5rem', backgroundColor: 'var(--success)' }}
                        >
                            +
                        </button>
                    </div>
                )}
            </div>
        );
    }

    const totalPar = Object.values(holePars).reduce((sum, par) => sum + par, 0);

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
            padding: '1rem',
            overflowY: 'auto'
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', backgroundColor: '#1e1e1e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Set Course Pars - {course.name}</h2>
                    <button
                        className="btn"
                        onClick={onCancel}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--danger)',
                            minHeight: 'auto'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Number of Holes Selector */}
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Number of Holes:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                            className="btn"
                            onClick={() => setNumHoles(Math.max(9, numHoles - 1))}
                            style={{ minWidth: '40px', padding: '0.5rem', backgroundColor: 'var(--danger)' }}
                        >
                            −
                        </button>
                        <span style={{ minWidth: '60px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 600 }}>
                            {numHoles}
                        </span>
                        <button
                            className="btn"
                            onClick={() => setNumHoles(Math.min(36, numHoles + 1))}
                            style={{ minWidth: '40px', padding: '0.5rem', backgroundColor: 'var(--success)' }}
                        >
                            +
                        </button>
                        <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: 'var(--text-light)' }}>
                            (Range: 9-36 holes)
                        </span>
                    </div>
                </div>

                {/* Par Display */}
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(0, 242, 96, 0.1)', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                        Total Par: <span style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>{totalPar}</span>
                    </div>
                </div>

                {/* Holes Grid */}
                <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '1.5rem' }}>
                    {rows}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn"
                        onClick={onCancel}
                        style={{ flex: 1, backgroundColor: 'var(--border)' }}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn"
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{ flex: 1, backgroundColor: 'var(--success)' }}
                    >
                        {isSaving ? 'Saving...' : 'Save Pars'}
                    </button>
                </div>
            </div>
        </div>
    );
}
