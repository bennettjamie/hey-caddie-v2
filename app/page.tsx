'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGame } from '@/context/GameContext';
import { useVoice } from '@/context/VoiceContext';
import CourseSelector from '@/components/CourseSelector';
import PlayerSelector from '@/components/PlayerSelector';
import ActiveRound from '@/components/ActiveRound';
import { getAllCourses, findCoursesNearLocation, Course } from '@/lib/courses';

export default function Home() {
    const [isOffline, setIsOffline] = useState(false);
    const { currentRound, startRound, isLoading } = useGame();
    const { startHotWordListening, isListeningForHotWord } = useVoice();
    const [showCourseSelector, setShowCourseSelector] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [selectedPlayers, setSelectedPlayers] = useState<any[]>([]);
    const [recentCourses, setRecentCourses] = useState<Course[]>([]);
    const [nearbyCourses, setNearbyCourses] = useState<Course[]>([]);
    const [locationError, setLocationError] = useState<string | null>(null);

    useEffect(() => {
        setIsOffline(!navigator.onLine);
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Load recent courses
    useEffect(() => {
        const loadRecentCourses = async () => {
            try {
                const allCourses = await getAllCourses();
                const recentIds = JSON.parse(localStorage.getItem('recentCourses') || '[]');
                const recent = recentIds
                    .map((id: string) => allCourses.find(c => c.id === id))
                    .filter(Boolean)
                    .slice(0, 5) as Course[];
                setRecentCourses(recent);
            } catch (error) {
                console.error('Error loading recent courses:', error);
            }
        };
        loadRecentCourses();
    }, []);

    // Request location for nearby courses
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const courses = await findCoursesNearLocation(
                            position.coords.latitude,
                            position.coords.longitude,
                            50 // 50km radius
                        );
                        setNearbyCourses(courses.slice(0, 5));
                    } catch (error) {
                        console.error('Error finding nearby courses:', error);
                    }
                },
                (error) => {
                    setLocationError('Location access denied or unavailable');
                }
            );
        }
    }, []);

    // Start hot word listening on mount
    useEffect(() => {
        startHotWordListening();
    }, [startHotWordListening]);

    const handleCourseSelect = (course: any) => {
        setSelectedCourse(course);
        setShowCourseSelector(false);
        // Save to recent courses
        if (typeof window !== 'undefined') {
            const recentIds = JSON.parse(localStorage.getItem('recentCourses') || '[]');
            const updated = [course.id, ...recentIds.filter((id: string) => id !== course.id)].slice(0, 10);
            localStorage.setItem('recentCourses', JSON.stringify(updated));
        }
        // Default to at least one player if none selected
        if (selectedPlayers.length === 0) {
            setSelectedPlayers([{ id: 'p1', name: 'Me' }]);
        }
    };

    const handleRecentCourseSelect = (course: Course) => {
        const layoutNames = Object.keys(course.layouts || {}).map(key => course.layouts![key].name);
        const firstLayout = layoutNames[0] || 'Default';
        const layoutKey = Object.keys(course.layouts || {}).find(
            key => course.layouts![key].name === firstLayout
        ) || 'default';
        
        handleCourseSelect({
            ...course,
            selectedLayout: firstLayout,
            selectedLayoutKey: layoutKey
        });
    };

    const handlePlayersSelect = (players: any[]) => {
        setSelectedPlayers(players);
    };

    const handleStartRound = () => {
        if (selectedCourse && selectedPlayers.length > 0) {
            startRound(selectedCourse, selectedPlayers);
            setSelectedCourse(null);
            setSelectedPlayers([]);
        }
    };

    if (isLoading) {
        return (
            <main className="container">
                <p>Loading...</p>
            </main>
        );
    }

    if (currentRound) {
        return <ActiveRound />;
    }

    return (
        <main className="container">
            <header suppressHydrationWarning style={{ padding: '2rem 0', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <Link href="/history" style={{ fontSize: '0.875rem', color: 'var(--info)', textDecoration: 'none' }}>
                        📊 History
                    </Link>
                    <h1 style={{ margin: 0 }}>Hey Caddy</h1>
                    <Link href="/stats" style={{ fontSize: '0.875rem', color: 'var(--info)', textDecoration: 'none' }}>
                        📈 Stats
                    </Link>
                </div>
                {isOffline && <div suppressHydrationWarning style={{ color: 'red', marginTop: '0.5rem' }}>Offline Mode</div>}
            </header>

            {!showCourseSelector && !selectedCourse ? (
                <>
                    {/* Voice Command Suggestion */}
                    <div className="card" style={{ border: '2px solid var(--primary)', background: 'rgba(0, 242, 96, 0.1)' }}>
                        <h2>🎤 Start with Voice</h2>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-light)' }}>
                            Try saying: <strong>"Hey Caddie, Start a round at [course name] with [player name 1], [player name 2], and..."</strong>
                        </p>
                        {isListeningForHotWord && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--success)' }}>
                                🔊 Listening for "Hey Caddie"...
                            </div>
                        )}
                    </div>

                    {/* Start Round Button */}
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h2>Start a Round</h2>
                        <p>Ready to play? Select a course to begin.</p>
                        <button
                            className="btn"
                            style={{ marginTop: '1rem', width: '100%', fontSize: '1.2rem', padding: '1rem' }}
                            onClick={() => setShowCourseSelector(true)}
                        >
                            Select Course & Play
                        </button>
                    </div>

                    {/* Recently Played Courses */}
                    {recentCourses.length > 0 && (
                        <div className="card" style={{ marginTop: '1rem' }}>
                            <h3>Recently Played</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {recentCourses.map(course => (
                                    <button
                                        key={course.id}
                                        className="btn"
                                        onClick={() => handleRecentCourseSelect(course)}
                                        style={{
                                            textAlign: 'left',
                                            backgroundColor: 'var(--info)',
                                            fontSize: '0.875rem',
                                            padding: '0.75rem'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold' }}>{course.name}</div>
                                        {course.location && (
                                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                                {course.location}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Find Courses Near Me */}
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h3>📍 Find Courses Near Me</h3>
                        {locationError ? (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                                {locationError}
                            </p>
                        ) : nearbyCourses.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {nearbyCourses.map(course => (
                                    <button
                                        key={course.id}
                                        className="btn"
                                        onClick={() => handleRecentCourseSelect(course)}
                                        style={{
                                            textAlign: 'left',
                                            backgroundColor: 'var(--success)',
                                            fontSize: '0.875rem',
                                            padding: '0.75rem'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold' }}>{course.name}</div>
                                        {(course.location || (course.city && course.state)) && (
                                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                                {course.location || `${course.city}, ${course.state}`}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                                Finding courses near you...
                            </p>
                        )}
                    </div>
                </>
            ) : showCourseSelector ? (
                <CourseSelector onSelect={handleCourseSelect} />
            ) : selectedCourse ? (
                <div>
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3>Selected Course</h3>
                        <p style={{ marginTop: '0.5rem' }}>
                            <strong>{selectedCourse.name}</strong>
                            {selectedCourse.selectedLayout && ` - ${selectedCourse.selectedLayout}`}
                        </p>
                        <button
                            className="btn"
                            onClick={() => {
                                setSelectedCourse(null);
                                setShowCourseSelector(true);
                            }}
                            style={{ marginTop: '1rem', backgroundColor: 'var(--warning)' }}
                        >
                            Change Course
                        </button>
                    </div>
                    <PlayerSelector
                        onSelect={handlePlayersSelect}
                        initialPlayers={selectedPlayers}
                    />
                    {selectedPlayers.length > 0 && (
                        <button
                            className="btn"
                            onClick={handleStartRound}
                            style={{
                                width: '100%',
                                marginTop: '1rem',
                                fontSize: '1.2rem',
                                padding: '1rem',
                                backgroundColor: 'var(--success)'
                            }}
                        >
                            Start Round
                        </button>
                    )}
                </div>
            ) : null}
        </main>
    );
}
