'use client';

import { useState, useEffect } from 'react';
import { getAllCourses, getLocalCourses, searchCourses, createCourse } from '@/lib/courses';
import { saveLocalCourses } from '@/lib/courses';
import CourseParSetup from './CourseParSetup';
import { Course } from '@/types/firestore';

export default function CourseSelector({ onSelect }: { onSelect: (course: Course) => void }) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCourseName, setNewCourseName] = useState('');
    const [newCourseLocation, setNewCourseLocation] = useState('');
    const [newCourseLayoutName, setNewCourseLayoutName] = useState('Main');
    const [isAdding, setIsAdding] = useState(false);
    const [newlyCreatedCourse, setNewlyCreatedCourse] = useState<Course | null>(null);
    const [showParSetup, setShowParSetup] = useState(false);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        setLoading(true);
        try {
            // First, try to load from localStorage cache for instant display
            const cachedCourses = getLocalCourses();
            if (cachedCourses.length > 0) {
                setCourses(cachedCourses);
                setLoading(false); // Show cached courses immediately
            }
            
            // Then try to load from Firebase in background
            try {
                const allCourses = await getAllCourses();
                if (allCourses.length > 0) {
                    setCourses(allCourses);
                    // Note: getAllCourses already saves to localStorage cache, so we don't need to call saveLocalCourses again
                } else if (cachedCourses.length === 0) {
                    // Only show defaults if no cache and no Firebase courses
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
            } catch (firebaseError) {
                console.error('Error loading from Firebase:', firebaseError);
                // Keep using cached courses if Firebase fails
                if (cachedCourses.length === 0) {
                    const localCourses = getLocalCourses();
                    setCourses(localCourses.length > 0 ? localCourses : []);
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

    const handleAddCourse = async () => {
        if (!newCourseName.trim()) {
            alert('Please enter a course name');
            return;
        }
        setIsAdding(true);
        // #region agent log
        if (typeof window !== 'undefined') {
            fetch('http://127.0.0.1:7242/ingest/11000245-4554-436b-bff4-d7680d0619d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CourseSelector.tsx:78',message:'handleAddCourse called',data:{courseName:newCourseName,location:newCourseLocation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        }
        // #endregion
        try {
            // Create default layout with 18 holes, par 3 each
            const defaultHoles: { [key: number]: { par: number } } = {};
            for (let i = 1; i <= 18; i++) {
                defaultHoles[i] = { par: 3 };
            }
            
            const layoutKey = newCourseLayoutName.trim().toLowerCase().replace(/\s+/g, '_') || 'main';
            const newCourse: Omit<Course, 'id'> = {
                name: newCourseName.trim(),
                location: newCourseLocation.trim() || undefined,
                layouts: {
                    [layoutKey]: {
                        name: newCourseLayoutName.trim() || 'Main',
                        holes: defaultHoles,
                        parTotal: 54
                    }
                }
            };
            
            // #region agent log
            if (typeof window !== 'undefined') {
                fetch('http://127.0.0.1:7242/ingest/11000245-4554-436b-bff4-d7680d0619d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CourseSelector.tsx:95',message:'About to call createCourse',data:{courseName:newCourse.name,hasLayouts:!!newCourse.layouts},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            }
            // #endregion
            
            const courseId = await createCourse(newCourse);
            
            // #region agent log
            if (typeof window !== 'undefined') {
                fetch('http://127.0.0.1:7242/ingest/11000245-4554-436b-bff4-d7680d0619d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CourseSelector.tsx:103',message:'createCourse returned',data:{courseId,isLocal:courseId.startsWith('local_')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            }
            // #endregion
            
            const createdCourse = { id: courseId, ...newCourse } as Course;
            
            // Note: createCourse already saved to localStorage if Firebase failed
            // Update UI immediately with the new course
            setCourses(prev => [...prev, createdCourse]);
            
            // Reload courses list to ensure everything is in sync
            // This will also refresh from localStorage if needed
            setTimeout(() => {
                loadCourses().catch(() => {
                    // Ignore errors, we already have the course in state
                });
            }, 100);
            
            // Reset form
            setNewCourseName('');
            setNewCourseLocation('');
            setNewCourseLayoutName('Main');
            setShowAddModal(false);
            
            // Show par setup screen
            setNewlyCreatedCourse(createdCourse);
            setShowParSetup(true);
        } catch (error: any) {
            // #region agent log
            if (typeof window !== 'undefined') {
                fetch('http://127.0.0.1:7242/ingest/11000245-4554-436b-bff4-d7680d0619d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CourseSelector.tsx:165',message:'ERROR in handleAddCourse',data:{errorMessage:error?.message,errorName:error?.name,errorStack:error?.stack?.split('\n').slice(0,8).join('|'),hasSaveLocalCourses:typeof saveLocalCourses,importsCheck:{hasGetAllCourses:typeof getAllCourses,hasGetLocalCourses:typeof getLocalCourses,hasCreateCourse:typeof createCourse}},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            }
            // #endregion
            console.error('Error adding course:', error);
            console.error('Available imports:', { getAllCourses: typeof getAllCourses, getLocalCourses: typeof getLocalCourses, createCourse: typeof createCourse, saveLocalCourses: typeof saveLocalCourses });
            alert(`Failed to add course: ${error?.message || 'Unknown error'}. Please try again.`);
        } finally {
            setIsAdding(false);
        }
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Select Course</h2>
                    <button
                        className="btn"
                        onClick={() => setShowAddModal(true)}
                        style={{
                            backgroundColor: 'var(--success)',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem'
                        }}
                    >
                        + Add Course
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="input"
                    style={{ marginTop: '1rem' }}
                />
            </div>

            {showAddModal && (
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
                    padding: '1rem'
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '500px', backgroundColor: '#1e1e1e' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2>Add New Course</h2>
                            <button
                                className="btn"
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewCourseName('');
                                    setNewCourseLocation('');
                                    setNewCourseLayoutName('Main');
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: 'var(--danger)',
                                    minHeight: 'auto'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                                    Course Name *
                                </label>
                                <input
                                    type="text"
                                    value={newCourseName}
                                    onChange={(e) => setNewCourseName(e.target.value)}
                                    placeholder="e.g., Central Park"
                                    className="input"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                                    Location (optional)
                                </label>
                                <input
                                    type="text"
                                    value={newCourseLocation}
                                    onChange={(e) => setNewCourseLocation(e.target.value)}
                                    placeholder="e.g., New York, NY"
                                    className="input"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                                    Layout Name *
                                </label>
                                <input
                                    type="text"
                                    value={newCourseLayoutName}
                                    onChange={(e) => setNewCourseLayoutName(e.target.value)}
                                    placeholder="e.g., Main, Short, Long"
                                    className="input"
                                    style={{ width: '100%' }}
                                />
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                    You'll set pars for each hole after creating the course
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    className="btn"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setNewCourseName('');
                                        setNewCourseLocation('');
                                        setNewCourseLayoutName('Main');
                                    }}
                                    style={{ flex: 1, backgroundColor: 'var(--border)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn"
                                    onClick={handleAddCourse}
                                    disabled={isAdding || !newCourseName.trim()}
                                    style={{ flex: 1, backgroundColor: 'var(--success)' }}
                                >
                                    {isAdding ? 'Adding...' : 'Add Course'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                        onClick={() => onSelect({ ...course, selectedLayoutKey: 'default' })}
                                    >
                                        Select Course
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showParSetup && newlyCreatedCourse && (
                <CourseParSetup
                    course={newlyCreatedCourse}
                    layoutKey={Object.keys(newlyCreatedCourse.layouts || {})[0] || 'main'}
                    onComplete={() => {
                        setShowParSetup(false);
                        // Select the course after par setup
                        const layoutKey = Object.keys(newlyCreatedCourse.layouts || {})[0] || 'main';
                        const layout = newlyCreatedCourse.layouts?.[layoutKey];
                        onSelect({
                            ...newlyCreatedCourse,
                            selectedLayoutKey: layoutKey
                        });
                        setNewlyCreatedCourse(null);
                    }}
                    onCancel={() => {
                        setShowParSetup(false);
                        setNewlyCreatedCourse(null);
                    }}
                />
            )}
        </div>
    );
}
