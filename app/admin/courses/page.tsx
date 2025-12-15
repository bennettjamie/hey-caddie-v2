'use client';

import { useState } from 'react';
import CourseImporter from '@/components/CourseImporter';
import { getAllCourses, Course } from '@/lib/courses';

export default function AdminCourses() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);

    const loadCourses = async () => {
        setLoading(true);
        try {
            const allCourses = await getAllCourses();
            setCourses(allCourses);
        } catch (error) {
            console.error('Error loading courses:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="container" style={{ padding: '2rem' }}>
            <h1>Course Management</h1>
            
            <div style={{ marginTop: '2rem' }}>
                <CourseImporter />
            </div>

            <div className="card" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2>Imported Courses</h2>
                    <button
                        className="btn"
                        onClick={loadCourses}
                        disabled={loading}
                        style={{ backgroundColor: 'var(--info)' }}
                    >
                        {loading ? 'Loading...' : 'Refresh List'}
                    </button>
                </div>

                {courses.length === 0 ? (
                    <p style={{ color: 'var(--text-light)' }}>No courses imported yet. Use the importer above to add courses.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {courses.map(course => (
                            <div
                                key={course.id}
                                style={{
                                    padding: '1rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div>
                                    <h3 style={{ marginBottom: '0.25rem' }}>{course.name}</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', margin: 0 }}>
                                        {course.location || `${course.city || ''}, ${course.state || ''}`.trim()}
                                        {course.lat && course.lng && ` • ${course.lat.toFixed(4)}, ${course.lng.toFixed(4)}`}
                                    </p>
                                    {course.dgcoursereviewUrl && (
                                        <a
                                            href={course.dgcoursereviewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: '0.75rem', color: 'var(--info)' }}
                                        >
                                            View on dgcoursereview.com →
                                        </a>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                                    {Object.keys(course.layouts || {}).length} layout(s)
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}





