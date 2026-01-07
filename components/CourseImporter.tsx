'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Course } from '@/types/firestore';

export default function CourseImporter({ onClose }: { onClose: () => void }) {
    const [jsonInput, setJsonInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'validating' | 'importing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleImport = async () => {
        setStatus('validating');
        setMessage('');

        try {
            // 1. Parse JSON
            let courseData: Partial<Course>;
            try {
                courseData = JSON.parse(jsonInput);
            } catch (e) {
                throw new Error('Invalid JSON format');
            }

            // 2. minimal validation
            if (!courseData.name || !courseData.layouts) {
                throw new Error('Missing required fields: name, layouts');
            }

            // 3. Prepare data
            const cleanData = {
                ...courseData,
                isPublic: true,
                source: 'manual-import',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                // Ensure array fields exist
                images: courseData.images || [],
                amenities: courseData.amenities || [],
            };

            setStatus('importing');

            // 4. Save to public_courses
            await addDoc(collection(db, 'public_courses'), cleanData);

            setStatus('success');
            setMessage(`Successfully imported "${cleanData.name}"!`);
            setJsonInput(''); // Clear input on success
        } catch (error: any) {
            console.error('Import failed', error);
            setStatus('error');
            setMessage(error.message || 'Import failed');
        }
    };

    const loadExample = () => {
        const example: Partial<Course> = {
            name: "DeLaveaga Disc Golf Course",
            city: "Santa Cruz",
            state: "CA",
            country: "USA",
            rating: 4.8,
            lat: 37.000,
            lng: -122.000,
            layouts: {
                "masters_cup": {
                    name: "Masters Cup Layout (24 Holes)",
                    holeCount: 24,
                    parTotal: 72,
                    holes: {
                        1: { par: 3, distance: 350, label: "1 (I5)" },
                        2: { par: 3, distance: 280, label: "2" },
                        // ...
                        27: {
                            par: 3,
                            distance: 550,
                            label: "Top of the World",
                            teeLocation: { lat: 37.005, lng: -121.999 },
                            images: [{ url: "https://example.com/top-of-world.jpg", type: "tee", caption: "View from Tee" }]
                        }
                    }
                }
            }
        };
        setJsonInput(JSON.stringify(example, null, 2));
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1100,
            display: 'flex', flexDirection: 'column', padding: '2rem'
        }}>
            <div className="card" style={{ maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2>Import Public Course (JSON)</h2>
                    <button className="btn" style={{ backgroundColor: 'var(--danger)' }} onClick={onClose}>Close</button>
                </div>

                <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>
                    Paste a JSON object representing the course. Must follow the Course schema.
                    Supports multiple layouts, GPS coordinates, and images.
                </p>

                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" style={{ backgroundColor: 'var(--info)' }} onClick={loadExample}>Load Example Template</button>
                </div>

                <textarea
                    className="input"
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem', resize: 'none', minHeight: '300px' }}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='{ "name": "...", "layouts": { ... } }'
                />

                {message && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        backgroundColor: status === 'error' ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,0,0.1)',
                        border: `1px solid ${status === 'error' ? 'red' : 'green'}`,
                        borderRadius: '4px'
                    }}>
                        {message}
                    </div>
                )}

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className="btn"
                        style={{ backgroundColor: 'var(--success)', minWidth: '120px' }}
                        onClick={handleImport}
                        disabled={status === 'validating' || status === 'importing'}
                    >
                        {status === 'importing' ? 'Importing...' : 'Import Course'}
                    </button>
                </div>
            </div>
        </div>
    );
}
