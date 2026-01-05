'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGame } from '@/context/GameContext';
import { useVoice } from '@/context/VoiceContext';
import CourseSelector from '@/components/CourseSelector';
import PlayerSelector from '@/components/PlayerSelector';
import PermissionsDashboard from '@/components/PermissionsDashboard';
import ActiveRound from '@/components/ActiveRound';
import InstallPrompt from '@/components/InstallPrompt';
import LandingPage from '@/components/LandingPage';
import { db, auth, isFirebaseConfigured } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { Player, getAllPlayers } from '@/lib/players';
import { getAllCourses, findCoursesNearLocation, searchCourses } from '@/lib/courses';
import { speak } from '@/lib/textToSpeech';
import { Course } from '@/types/firestore';
import VoiceWaveform from '@/components/ui/VoiceWaveform';
import VoiceHelpModal from '@/components/VoiceHelpModal';

export default function Home() {
    const [isOffline, setIsOffline] = useState(false);
    const { currentRound, startRound, isLoading, hasRecentRound, restoreRecentRound } = useGame();
    const { startHotWordListening, isListeningForHotWord, isSupported, lastCommand, transcript, error: voiceError, isListening, startListening, stopListening } = useVoice();

    // Debug logging
    useEffect(() => {
        console.log('Voice Context State:', {
            hasStartFunction: !!startHotWordListening,
            isSupported,
            voiceError
        });
    }, [startHotWordListening, isSupported, voiceError]);
    const [showCourseSelector, setShowCourseSelector] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
    const [recentCourses, setRecentCourses] = useState<Course[]>([]);
    const [nearbyCourses, setNearbyCourses] = useState<Course[]>([]);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isRequestingLocation, setIsRequestingLocation] = useState(false);
    const [isStartingVoice, setIsStartingVoice] = useState(false);
    const [manualLocationQuery, setManualLocationQuery] = useState('');
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [voiceCourseSearch, setVoiceCourseSearch] = useState('');

    // Interactive Voice State
    const [voiceStep, setVoiceStep] = useState<'idle' | 'course' | 'players' | 'confirm'>('idle');
    const [voiceData, setVoiceData] = useState<{ course?: Course, players?: string[] }>({});
    const [showVoiceHelp, setShowVoiceHelp] = useState(false);

    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [showLanding, setShowLanding] = useState(true);

    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            // If user is logged in, hide landing, OR if they manually proceeded
            if (u) setShowLanding(false);
        });
        return () => unsubscribe();
    }, []);

    const handleGoogleLogin = async () => {
        if (!auth) {
            alert("Authentication is not available (Firebase config missing).");
            return;
        }
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const handleManualSetup = () => {
        setShowLanding(false);
    };

    // Reset state if listening stops manually and we are not transitioning
    useEffect(() => {
        if (!isListening && voiceStep === 'course' && !voiceData.course) {
            // If stopped listening while waiting for course, we might want to reset or keep waiting?
            // Let's keep state for a moment or show a retry button? 
            // Ideally we stay in 'course' step so next click resumes it
        }
    }, [isListening, voiceStep]);

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

    // Load recent courses (cached for faster loading)
    useEffect(() => {
        const loadRecentCourses = async () => {
            try {
                // First, try to load from cache for instant display
                const cachedRecent = localStorage.getItem('recentCoursesData');
                if (cachedRecent) {
                    try {
                        const cached = JSON.parse(cachedRecent);
                        if (Array.isArray(cached) && cached.length > 0) {
                            setRecentCourses(cached.slice(0, 5) as Course[]);
                        }
                    } catch (e) {
                        // Ignore cache parse errors
                    }
                }

                // Then load fresh data in background
                const allCourses = await getAllCourses();
                const recentIds = JSON.parse(localStorage.getItem('recentCourses') || '[]');
                const recent = recentIds
                    .map((id: string) => allCourses.find(c => c.id === id))
                    .filter(Boolean)
                    .slice(0, 5) as Course[];

                // Update cache
                if (typeof window !== 'undefined') {
                    localStorage.setItem('recentCoursesData', JSON.stringify(recent));
                }

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
                    setLocationError('Location access denied. Check your browser address bar/settings to enable permissions.');
                }
            );
        }
    }, []);

    // Start hot word listening on mount
    useEffect(() => {
        // Only start if supported and function exists
        if (typeof window !== 'undefined' && startHotWordListening && isSupported) {
            // Add a small delay to ensure VoiceContext is fully initialized
            const timer = setTimeout(() => {
                try {
                    startHotWordListening();
                } catch (error) {
                    console.error('Error starting hot word listening:', error);
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [startHotWordListening, isSupported]);

    // Handle voice start click
    const handleEnableVoice = async () => {
        setIsStartingVoice(true);
        try {
            if (startHotWordListening) {
                await startHotWordListening();
                // Wait a moment to see if state updates, otherwise reset loading
                setTimeout(() => setIsStartingVoice(false), 2000);
            } else {
                console.error('startHotWordListening function is missing');
                setIsStartingVoice(false);
            }
        } catch (e) {
            console.error('Error starting voice:', e);
            setIsStartingVoice(false);
        }
    };

    // Interactive Voice Conversation Handler
    useEffect(() => {
        if (!transcript) return; // Wait for result

        const lowerText = transcript.toLowerCase();

        // 1. IDLE State: Listen for "Start Round" or direct Course Name
        if (voiceStep === 'idle') {
            const startTriggers = ['start round', 'start a round', 'start around', 'play a round', 'play around', 'begin round', 'new round', 'lets play', "let's play"];
            const isStartIntent = startTriggers.some(t => lowerText.includes(t));

            if (isStartIntent) {
                // Parse intent: "at [Course] with [Players]"
                // Regex: match "at X" or "at the X" until "with", "and", or end
                const courseMatch = lowerText.match(/(?:at|at the)\s+(.+?)(?:\s+(?:with|and)|$)/);
                const playersMatch = lowerText.match(/(?:with|and)\s+(.+)/);

                let foundCourse: Course | undefined;
                let foundPlayers: string[] = [];

                const processIntent = async () => {
                    // 1. Try to resolve course if mentioned
                    if (courseMatch) {
                        const courseName = courseMatch[1].trim();
                        try {
                            // Use search instead of getAll to avoid timeout on large DBs
                            const results = await searchCourses(courseName);
                            if (results.length > 0) {
                                foundCourse = results[0]; // Best match
                            }
                        } catch (e) {
                            console.error("Course search failed", e);
                        }
                    }

                    // 2. Parse players
                    if (playersMatch) {
                        foundPlayers = playersMatch[1].split(/and|,/).map(p => p.trim()).filter(Boolean);
                    }

                    // 3. Decide next step
                    if (foundCourse && foundPlayers.length > 0) {
                        // All info present
                        setVoiceData({ course: foundCourse, players: foundPlayers });
                        speak(`Okay, let's play ${foundCourse.name} with ${foundPlayers.join(' and ')}. Ready?`)
                            .then(() => startListening());
                        setVoiceStep('confirm');
                    } else if (foundCourse) {
                        // Course found, need players
                        setVoiceData({ course: foundCourse });
                        speak(`Found ${foundCourse.name}. Who is playing?`)
                            .then(() => startListening());
                        setVoiceStep('players');
                    } else if (courseMatch && !foundCourse) {
                        // Course mentioned but not found -> Jump to manual setup
                        setVoiceData({ players: foundPlayers });
                        setVoiceCourseSearch(courseMatch[1].trim());

                        // Set players if we found them
                        if (foundPlayers.length > 0) {
                            const playerObjs = foundPlayers.map(name => ({ id: `p_${Date.now()}_${Math.random()}`, name }));
                            setSelectedPlayers(playerObjs);
                        }

                        speak(`I couldn't find '${courseMatch[1].trim()}', but let's set it up.`);
                        setVoiceStep('idle');
                        setShowCourseSelector(true);
                        stopListening();
                    } else if (foundPlayers.length > 0) {
                        // Players found, need course
                        setVoiceData({ players: foundPlayers });
                        speak(`Okay, playing with ${foundPlayers.join(' and ')}. What course?`)
                            .then(() => startListening());
                        setVoiceStep('course');
                    } else {
                        // Nothing found
                        speak("Okay. What course are you playing?")
                            .then(() => startListening());
                        setVoiceStep('course');
                    }
                };

                processIntent();
            } else if (lowerText.includes('hello') || lowerText.includes('hi ')) {
                speak("Hello! Do you want to play a round?")
                    .then(() => startListening());
            }
        }

        // 2. COURSE State: Search for course
        if (voiceStep === 'course') {
            // Assume input is course name
            searchCourses(lowerText).then(courses => {
                if (courses.length > 0) {
                    const found = courses[0];
                    setVoiceData(prev => ({ ...prev, course: found }));

                    if (voiceData.players && voiceData.players.length > 0) {
                        speak(`Okay, ${found.name} with ${voiceData.players.join(' and ')}. Ready?`)
                            .then(() => startListening());
                        setVoiceStep('confirm');
                    } else {
                        speak(`Found ${found.name}. Who is playing?`)
                            .then(() => startListening());
                        setVoiceStep('players');
                    }
                } else {
                    // Not found -> fallback
                    speak(`I couldn't find '${lowerText}', but let's see what we can find.`);
                    setVoiceCourseSearch(lowerText);
                    setVoiceStep('idle');
                    setShowCourseSelector(true);
                    stopListening();
                }
            });
        }

        // 3. PLAYERS State: Parse players
        if (voiceStep === 'players') {
            const players = lowerText.split(/and|with|,/).map(n => n.trim()).filter(n => n.length > 0);
            if (players.length > 0) {
                // Create dummy player objects for now (or match with friends list later)
                const playerObjs = players.map(name => ({ id: `p_${Date.now()}_${Math.random()}`, name }));

                // Reuse valid players from voiceData if they exist (merging logic could go here)
                // For now, just accept the new input
                const finalPlayers = playerObjs;
                // (Also could merge with existing voiceData.players string array logic)

                setVoiceData(prev => ({ ...prev, players: players })); // Keep simple string array for display

                speak(`Starting round at ${voiceData.course?.name} with ${players.join(' and ')}. Ready?`)
                    .then(() => startListening());
                setVoiceStep('confirm');
            }
        }

        // 4. CONFIRM State
        if (voiceStep === 'confirm') {
            if (lowerText.includes('yes') || lowerText.includes('ready') || lowerText.includes('start') || lowerText.includes('sure')) {
                // Resolve players against DB
                import('@/lib/players').then(async ({ getAllPlayers }) => {
                    const allPlayers = await getAllPlayers();
                    const resolved = (voiceData.players || []).map(name => {
                        const match = allPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
                        if (match) return match;
                        // Simple fuzzy fallback (can be improved)
                        const fuzzy = allPlayers.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
                        return fuzzy || { id: `p_${Date.now()}_${Math.random()}`, name };
                    });

                    setSelectedPlayers(resolved);
                    if (voiceData.course) {
                        handleCourseSelect(voiceData.course);
                    }
                    setVoiceStep('idle');
                });
            } else if (lowerText.includes('no') || lowerText.includes('cancel') || lowerText.includes('stop')) {
                speak("Okay, cancelled. Say 'Start Round' to try again.");
                setVoiceStep('idle');
            }
        }
    }, [transcript, isListening, voiceStep]);

    // Handle voice commands on home page (Legacy / Secondary)
    useEffect(() => {
        if (!lastCommand || currentRound) return;

        // Legacy: START_ROUND used to just open selector. Now we let the interactive flow handle it.
        // if (lastCommand.type === 'START_ROUND') {
        //    setShowCourseSelector(true);
        // }
    }, [lastCommand, transcript, currentRound]);

    const handleCourseSelect = (course: Course) => {
        setSelectedCourse(course);
        setShowCourseSelector(false);
        // Save to recent courses (both ID and full data for faster loading)
        if (typeof window !== 'undefined') {
            const recentIds = JSON.parse(localStorage.getItem('recentCourses') || '[]');
            const updated = [course.id, ...recentIds.filter((id: string) => id !== course.id)].slice(0, 10);
            localStorage.setItem('recentCourses', JSON.stringify(updated));

            // Also cache the course data
            const recentData = JSON.parse(localStorage.getItem('recentCoursesData') || '[]');
            const updatedData = [course, ...recentData.filter((c: Course) => c.id !== course.id)].slice(0, 10);
            localStorage.setItem('recentCoursesData', JSON.stringify(updatedData));
        }
        // Default to at least one player if none selected
        if (selectedPlayers.length === 0) {
            setSelectedPlayers([{ id: 'p1', name: 'Me' }]);
        }
    };

    const handleRecentCourseSelect = (course: Course) => {
        const layoutNames = Object.keys(course.layouts || {}).map(key => course.layouts![key].name);

        // If multiple layouts exist, force user to choose via the main selector
        if (layoutNames.length > 1) {
            setVoiceCourseSearch(course.name);
            setShowCourseSelector(true);
            return;
        }

        const firstLayout = layoutNames[0] || 'Default';
        const layoutKey = Object.keys(course.layouts || {}).find(
            key => course.layouts![key].name === firstLayout
        ) || 'default';

        handleCourseSelect({
            ...course,
            selectedLayoutKey: layoutKey
        });
    };

    const handlePlayersSelect = (players: Player[]) => {
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

    if (showLanding && !user) {
        return (
            <LandingPage
                onLogin={handleGoogleLogin}
                onManualSetup={handleManualSetup}
                isConfigured={isFirebaseConfigured}
            />
        );
    }

    return (
        <main className="container">
            {/* Header / Nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Hey Caddy ⛳</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href="/history" className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
                        History
                    </Link>
                    <Link href="/stats" className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
                        Stats
                    </Link>
                    <Link href="/admin/courses" className="btn btn-secondary" style={{ fontSize: '0.9rem', padding: '0.5rem' }}>
                        Manage Courses
                    </Link>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowVoiceHelp(true)}
                        style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                        aria-label="Voice Help"
                    >
                        🎤 ?
                    </button>
                    <PermissionsDashboard />
                </div>
            </div>

            {showVoiceHelp && (
                <VoiceHelpModal
                    onClose={() => setShowVoiceHelp(false)}
                />
            )}

            {/* Voice Activation Status */}
            <div
                className={`card ${isListening ? 'listening-pulse' : ''}`}
                style={{
                    marginBottom: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onClick={handleEnableVoice}
            >
                {/* Waveform Background */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, pointerEvents: 'none' }}>
                    <VoiceWaveform isListening={isListening || isListeningForHotWord} />
                </div>

                <div style={{ position: 'relative', zIndex: 1, padding: '1rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                        {isListening ? '🎙️ Listening...' : isStartingVoice ? '⏳ Starting...' : '🎤 Enable Voice'}
                    </div>
                    <p style={{ color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                        {isListening ? (
                            voiceStep === 'idle' ? "Say 'Start Round'..." :
                                voiceStep === 'course' ? "Say a course name..." :
                                    voiceStep === 'players' ? "Who is playing?" :
                                        voiceStep === 'confirm' ? "Say 'Yes' to start" :
                                            "Listening..."
                        ) : (
                            isSupported ? "Tap or say 'Hey Caddy' to start" : "Voice commands not supported"
                        )}
                    </p>
                    {transcript && isListening && (
                        <div style={{
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            backgroundColor: 'rgba(0,0,0,0.1)',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            fontStyle: 'italic'
                        }}>
                            "{transcript}"
                        </div>
                    )}
                </div>
            </div>

            {/* Main Action Card */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Start a Round</h2>

                {/* Course Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Course</label>
                    <button
                        className="btn btn-outline"
                        style={{ width: '100%', justifyContent: 'space-between' }}
                        onClick={() => setShowCourseSelector(true)}
                    >
                        <span>{selectedCourse ? selectedCourse.name : 'Select Course...'}</span>
                        <span>{selectedCourse ? 'Change' : 'Find'}</span>
                    </button>
                </div>

                {/* Player Selection */}
                {selectedCourse && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Players</label>
                        <PlayerSelector
                            initialPlayers={selectedPlayers}
                            onSelect={handlePlayersSelect}
                        />
                    </div>
                )}

                {/* Start Button */}
                <button
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}
                    disabled={!selectedCourse || selectedPlayers.length === 0}
                    onClick={handleStartRound}
                >
                    Start Round
                </button>
            </div>

            {/* Quick Actions / Recent */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {recentCourses.length > 0 && (
                    <div className="card">
                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-light)' }}>Recent Courses</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {recentCourses.map(course => (
                                <button
                                    key={course.id}
                                    className="btn btn-outline"
                                    style={{ justifyContent: 'flex-start' }}
                                    onClick={() => handleRecentCourseSelect(course)}
                                >
                                    📍 {course.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {hasRecentRound() && (
                    <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Unfinished Round</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
                            You have a round in progress.
                        </p>
                        <button
                            className="btn btn-secondary"
                            onClick={restoreRecentRound}
                        >
                            Resume Round
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCourseSelector && (
                <CourseSelector
                    onSelect={handleCourseSelect}
                    onClose={() => setShowCourseSelector(false)}
                    initialSearch={voiceCourseSearch}
                />
            )}

            <InstallPrompt />
        </main>
    );
}
