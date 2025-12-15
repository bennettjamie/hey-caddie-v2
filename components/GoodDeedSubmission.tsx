'use client';

import { useState, useEffect } from 'react';
import { submitGoodDeed } from '@/lib/mrtzGoodDeeds';
import { getAllPlayers, Player } from '@/lib/players';
import { getAllCourses, Course } from '@/lib/courses';
import { GoodDeedType } from '@/types/mrtz';

interface GoodDeedSubmissionProps {
    playerId: string;
    onClose?: () => void;
    onSuccess?: () => void;
}

export default function GoodDeedSubmission({ playerId, onClose, onSuccess }: GoodDeedSubmissionProps) {
    const [deedType, setDeedType] = useState<GoodDeedType>('course_cleanup');
    const [description, setDescription] = useState('');
    const [mrtzValue, setMrtzValue] = useState(1.0);
    const [validators, setValidators] = useState<string[]>([]);
    const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [players, courses] = await Promise.all([
                getAllPlayers(100),
                getAllCourses()
            ]);
            setAvailablePlayers(players);
            setAvailableCourses(courses);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleToggleValidator = (validatorId: string) => {
        setValidators(prev => 
            prev.includes(validatorId)
                ? prev.filter(id => id !== validatorId)
                : [...prev, validatorId]
        );
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            alert('Please provide a description');
            return;
        }
        
        if (validators.length === 0) {
            alert('Please select at least one validator');
            return;
        }
        
        if (mrtzValue <= 0) {
            alert('MRTZ value must be greater than 0');
            return;
        }

        setSubmitting(true);
        try {
            const selectedCourse = availableCourses.find(c => c.id === selectedCourseId);
            
            await submitGoodDeed(
                playerId,
                deedType,
                description,
                mrtzValue,
                validators,
                photos.length > 0 ? photos : undefined,
                selectedCourse ? {
                    courseId: selectedCourse.id,
                    courseName: selectedCourse.name,
                    coordinates: selectedCourse.lat && selectedCourse.lng ? {
                        lat: selectedCourse.lat,
                        lng: selectedCourse.lng
                    } : undefined
                } : undefined,
                playerId
            );
            
            alert('Good deed submitted! Waiting for validation...');
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            console.error('Error submitting good deed:', error);
            alert('Error submitting good deed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="card" style={{ padding: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Submit Good Deed</h2>
                {onClose && (
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
                )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Deed Type */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Deed Type:
                    </label>
                    <select
                        value={deedType}
                        onChange={(e) => setDeedType(e.target.value as GoodDeedType)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '1rem'
                        }}
                    >
                        <option value="course_cleanup">🧹 Course Cleanup</option>
                        <option value="help_other_player">🤝 Help Other Player</option>
                        <option value="community_service">🌍 Community Service</option>
                        <option value="custom">✨ Custom</option>
                    </select>
                </div>

                {/* Description */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Description: *
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what you did..."
                        required
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* MRTZ Value */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        MRTZ Value:
                    </label>
                    <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        value={mrtzValue}
                        onChange={(e) => setMrtzValue(parseFloat(e.target.value) || 0.25)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '1rem'
                        }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                        Suggested: Course cleanup (1-2 MRTZ), Help player (0.5-1 MRTZ)
                    </div>
                </div>

                {/* Location (Course) */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Location (Course):
                    </label>
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '1rem'
                        }}
                    >
                        <option value="">Select course (optional)</option>
                        {availableCourses.map(course => (
                            <option key={course.id} value={course.id}>
                                {course.name} {course.location ? `- ${course.location}` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Validators */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Validators (who can confirm this deed): *
                    </label>
                    <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem'
                    }}>
                        {availablePlayers
                            .filter(p => p.id !== playerId)
                            .map(player => (
                                <label
                                    key={player.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0.5rem',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        backgroundColor: validators.includes(player.id) ? 'rgba(0, 242, 96, 0.1)' : 'transparent'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={validators.includes(player.id)}
                                        onChange={() => handleToggleValidator(player.id)}
                                        style={{
                                            marginRight: '0.5rem',
                                            width: '20px',
                                            height: '20px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span>{player.name}</span>
                                </label>
                            ))}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                        Selected: {validators.length} validator(s)
                    </div>
                </div>

                {/* Photo Upload Note */}
                <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    color: 'var(--text-light)'
                }}>
                    📸 Photo upload coming soon. For now, you can describe the deed in detail.
                </div>

                {/* Submit Button */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    {onClose && (
                        <button
                            type="button"
                            className="btn"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                backgroundColor: 'var(--border)'
                            }}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        className="btn"
                        disabled={submitting || !description.trim() || validators.length === 0}
                        style={{
                            flex: 1,
                            backgroundColor: submitting ? 'var(--border)' : 'var(--success)',
                            opacity: submitting || !description.trim() || validators.length === 0 ? 0.5 : 1
                        }}
                    >
                        {submitting ? 'Submitting...' : 'Submit Good Deed'}
                    </button>
                </div>
            </form>
        </div>
    );
}

