'use client';

import { useState, useEffect } from 'react';
import { getAllCourses, getLocalCourses, searchCourses, Course } from '@/lib/courses';

export default function CourseSelector({ onSelect }: { onSelect: (course: any) => void }) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        setLoading(true);
        try {
            const allCourses = await getAllCourses();
            if (allCourses.length > 0) {
                setCourses(allCourses);
            } else {
                // Fallback to local storage
                const localCourses = getLocalCourses();
                if (localCourses.length > 0) {
                    setCourses(localCourses);
                } else {
                    // Default mock courses
                    setCourses([
                        {
                            id: '1',
                            name: 'Kiwi Park',
                            location: 'Local',
                            layouts: {
                                main: { name: 'Main', holes: {}, parTotal: 54 },
                                short: { name: 'Short', holes: {}, parTotal: 54 }
                            }
                        },
                        {
                            id: '2',
                            name: 'Oak Grove',
                            location: 'Local',
                            layouts: {
                                long: { name: 'Long', holes: {}, parTotal: 54 },
                                short: { name: 'Short', holes: {}, parTotal: 54 }
                            }
                        }
                    ] as Course[]);
                }
            }
        } catch (error) {
            console.error('Error loading courses:', error);
            const localCourses = getLocalCourses();
            setCourses(localCourses.length > 0 ? localCourses : []);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.trim()) {
            const results = await searchCourses(term);
            setCourses(results);
        } else {
            loadCourses();
        }
    };

    const getLayoutNames = (course: Course): string[] => {
        if (!course.layouts) return [];
        return Object.keys(course.layouts).map(key => course.layouts[key].name);
    };

    if (loading) {
        return (
            <div className="card">
                <p>Loading courses...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="card">
                <h2>Select Course</h2>
                <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="input"
                    style={{ marginTop: '1rem' }}
                />
            </div>

            {courses.length === 0 ? (
                <div className="card">
                    <p>No courses found.</p>
                </div>
            ) : (
                <div>
                    {courses.map(course => {
                        const layoutNames = getLayoutNames(course);
                        return (
                            <div key={course.id} className="card" style={{ marginTop: '1rem' }}>
                                <div>
                                    <h3 style={{ marginBottom: '0.25rem' }}>{course.name}</h3>
                                    {course.location && (
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', margin: 0 }}>
                                            {course.location}
                                        </p>
                                    )}
                                </div>
                                {layoutNames.length > 0 ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                        {layoutNames.map(layoutName => {
                                            const layoutKey = Object.keys(course.layouts || {}).find(
                                                key => course.layouts![key].name === layoutName
                                            );
                                            return (
                                                <button
                                                    key={layoutName}
                                                    className="btn"
                                                    style={{
                                                        fontSize: '0.875rem',
                                                        padding: '0.5rem 1rem',
                                                        backgroundColor: 'var(--info)'
                                                    }}
                                                    onClick={() =>
                                                        onSelect({
                                                            ...course,
                                                            selectedLayout: layoutName,
                                                            selectedLayoutKey: layoutKey
                                                        })
                                                    }
                                                >
                                                    {layoutName}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <button
                                        className="btn"
                                        style={{ marginTop: '1rem', backgroundColor: 'var(--info)' }}
                                        onClick={() => onSelect({ ...course, selectedLayout: 'Default' })}
                                    >
                                        Select Course
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
