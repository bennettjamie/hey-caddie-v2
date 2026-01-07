'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGame } from '@/context/GameContext';
import { useTheme } from '@/context/ThemeContext';
import CourseAmendmentModal from '@/components/CourseAmendmentModal';
import BettingSetupModal from '@/components/BettingSetupModal';
import EndRoundConfirmModal from '@/components/EndRoundConfirmModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { getAllPlayers, searchPlayers, getOrCreatePlayerByName, Player } from '@/lib/players';
import Fuse from 'fuse.js';

interface SettingsModalProps {
    onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
    const {
        currentRound,
        activeBets = {},
        startSkins,
        startNassau,
        clearBets,
        endRound,
        updateCourseLayout,
        addPlayerToRound,
        removePlayerFromRound,
        getCachedRounds,
        restoreCachedRound
    } = useGame();
    const { theme, toggleTheme } = useTheme();

    const [activeTab, setActiveTab] = useState<'amend' | 'bets' | 'voice' | 'end' | 'players' | 'cached' | 'mrtz'>('amend');
    const [personalityMode, setPersonalityModeState] = useState<'casual' | 'professional' | 'funny' | 'encouraging'>('casual');
    const [showAmendmentModal, setShowAmendmentModal] = useState(false);
    const [showBettingModal, setShowBettingModal] = useState(false);
    const [showEndRoundModal, setShowEndRoundModal] = useState(false);

    // Player management
    const [playerSearch, setPlayerSearch] = useState('');
    const [playerSuggestions, setPlayerSuggestions] = useState<Player[]>([]);
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);

    // Cached rounds
    const [cachedRounds, setCachedRounds] = useState<Array<{ timestamp: string, round: any, courseName: string, holesPlayed: number }>>([]);

    // Confirmation Modal State
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDestructive: false
    });

    const closeConfirmation = () => {
        setConfirmation(prev => ({ ...prev, isOpen: false }));
    };

    // Load current personality mode on mount
    useEffect(() => {
        const loadPersonality = async () => {
            const { getCurrentPersonalityMode } = await import('@/lib/voicePersonality');
            const currentMode = getCurrentPersonalityMode();
            setPersonalityModeState(currentMode);
        };
        loadPersonality();
    }, []);

    // Handle personality mode change
    const handlePersonalityChange = async (mode: 'casual' | 'professional' | 'funny' | 'encouraging') => {
        setPersonalityModeState(mode);
        const { setPersonalityMode } = await import('@/lib/voicePersonality');
        setPersonalityMode(mode);
    };

    // Load players for search
    useEffect(() => {
        const loadPlayers = async () => {
            setIsLoadingPlayers(true);
            try {
                const players = await getAllPlayers(100);
                setAllPlayers(players);
            } catch (error) {
                console.error('Error loading players:', error);
            } finally {
                setIsLoadingPlayers(false);
            }
        };
        loadPlayers();
    }, []);

    // Search players as user types
    useEffect(() => {
        if (playerSearch.trim().length === 0) {
            setPlayerSuggestions([]);
            return;
        }

        if (playerSearch.trim().length < 2) {
            return;
        }

        const fuse = new Fuse(allPlayers, {
            keys: ['name', 'email'],
            threshold: 0.3
        });

        const results = fuse.search(playerSearch);
        setPlayerSuggestions(results.slice(0, 5).map(r => r.item));
    }, [playerSearch, allPlayers]);

    // Load cached rounds
    useEffect(() => {
        if (activeTab === 'cached') {
            setCachedRounds(getCachedRounds());
        }
    }, [activeTab, getCachedRounds]);

    const handleAddPlayer = async (playerName: string) => {
        if (!playerName.trim()) return;

        try {
            const player = await getOrCreatePlayerByName(playerName.trim());
            addPlayerToRound({
                id: player.id,
                name: player.name
            });
            setPlayerSearch('');
            setPlayerSuggestions([]);
        } catch (error) {
            console.error('Error adding player:', error);
            alert('Error adding player. Please try again.');
        }
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    if (!currentRound) {
        return null;
    }

    return (
        <>
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
                        <h2>Settings</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                                className="btn"
                                onClick={toggleTheme}
                                style={{
                                    padding: '0.5rem',
                                    backgroundColor: 'var(--card-bg)',
                                    minHeight: 'auto',
                                    fontSize: '1.25rem',
                                    lineHeight: 1
                                }}
                                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
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
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <button
                            className="btn"
                            onClick={() => setActiveTab('amend')}
                            style={{
                                backgroundColor: activeTab === 'amend' ? 'var(--primary)' : 'var(--border)',
                                fontSize: '0.875rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            Amend Course
                        </button>
                        <button
                            className="btn"
                            onClick={() => setActiveTab('bets')}
                            style={{
                                backgroundColor: activeTab === 'bets' ? 'var(--primary)' : 'var(--border)',
                                fontSize: '0.875rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            Bet Settings
                        </button>
                        <button
                            className="btn"
                            onClick={() => setActiveTab('voice')}
                            style={{
                                backgroundColor: activeTab === 'voice' ? 'var(--primary)' : 'var(--border)',
                                fontSize: '0.875rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            Voice Settings
                        </button>
                        <button
                            className="btn"
                            onClick={() => setActiveTab('end')}
                            style={{
                                backgroundColor: activeTab === 'end' ? 'var(--primary)' : 'var(--border)',
                                fontSize: '0.875rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            End Round
                        </button>
                        <button
                            className="btn"
                            onClick={() => setActiveTab('players')}
                            style={{
                                backgroundColor: activeTab === 'players' ? 'var(--primary)' : 'var(--border)',
                                fontSize: '0.875rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            Edit Players
                        </button>
                        <button
                            className="btn"
                            onClick={() => setActiveTab('cached')}
                            style={{
                                backgroundColor: activeTab === 'cached' ? 'var(--primary)' : 'var(--border)',
                                fontSize: '0.875rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            Cached Rounds
                        </button>
                        <Link
                            href="/mrtz"
                            className="btn"
                            style={{
                                backgroundColor: 'var(--primary)',
                                fontSize: '0.875rem',
                                padding: '0.5rem 1rem',
                                textDecoration: 'none',
                                display: 'inline-block'
                            }}
                            onClick={onClose}
                        >
                            💰 MRTZ Ledger
                        </Link>
                    </div>

                    {/* Tab Content */}
                    <div style={{ minHeight: '300px' }}>
                        {/* Amend Course Tab */}
                        {activeTab === 'amend' && (
                            <div>
                                <p style={{ marginBottom: '1rem', color: 'var(--text-light)' }}>
                                    Adjust par values for this course layout.
                                </p>
                                <button
                                    className="btn"
                                    onClick={() => setShowAmendmentModal(true)}
                                    style={{ width: '100%', backgroundColor: 'var(--info)' }}
                                >
                                    ⚙️ Amend Course Par Values
                                </button>
                            </div>
                        )}

                        {/* Bet Settings Tab */}
                        {activeTab === 'bets' && (
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <h3 style={{ marginBottom: '0.5rem' }}>Active Bets</h3>
                                    {activeBets?.skins?.started && (
                                        <div style={{
                                            padding: '0.75rem',
                                            backgroundColor: 'rgba(0, 242, 96, 0.1)',
                                            borderRadius: '8px',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <strong>Skins:</strong> {activeBets.skins.value} MRTZ per hole
                                        </div>
                                    )}
                                    {activeBets?.nassau?.started && (
                                        <div style={{
                                            padding: '0.75rem',
                                            backgroundColor: 'rgba(0, 242, 96, 0.1)',
                                            borderRadius: '8px',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <strong>Nassau:</strong> {activeBets.nassau.value} MRTZ per segment
                                        </div>
                                    )}
                                    {(!activeBets?.skins?.started && !activeBets?.nassau?.started) && (
                                        <p style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>
                                            No active bets
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <button
                                        className="btn"
                                        onClick={() => setShowBettingModal(true)}
                                        style={{ width: '100%', backgroundColor: 'var(--success)' }}
                                    >
                                        {activeBets?.skins?.started || activeBets?.nassau?.started ? 'Modify Bets' : 'Start Bets'}
                                    </button>
                                    {(activeBets?.skins?.started || activeBets?.nassau?.started) && (
                                        <button
                                            className="btn"
                                            onClick={() => {
                                                setConfirmation({
                                                    isOpen: true,
                                                    title: 'Clear Active Bets?',
                                                    message: 'Are you sure you want to clear all active bets? This cannot be undone.',
                                                    isDestructive: true,
                                                    onConfirm: () => {
                                                        clearBets();
                                                        closeConfirmation();
                                                    }
                                                });
                                            }}
                                            style={{ width: '100%', backgroundColor: 'var(--danger)' }}
                                        >
                                            Clear All Bets
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Voice Settings Tab */}
                        {activeTab === 'voice' && (
                            <div>
                                <h3 style={{ marginBottom: '1rem' }}>Voice Personality</h3>
                                <p style={{ marginBottom: '1rem', color: 'var(--text-light)', fontSize: '0.875rem' }}>
                                    Choose how Hey Caddie speaks to you during your round.
                                </p>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label htmlFor="personality-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                        Personality Mode
                                    </label>
                                    <select
                                        id="personality-select"
                                        value={personalityMode}
                                        onChange={(e) => handlePersonalityChange(e.target.value as 'casual' | 'professional' | 'funny' | 'encouraging')}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            fontSize: '1rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg)',
                                            color: 'var(--text)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="casual">Casual - Natural and friendly</option>
                                        <option value="professional">Professional - Formal and precise</option>
                                        <option value="funny">Funny - Humorous and lighthearted</option>
                                        <option value="encouraging">Encouraging - Motivational and supportive</option>
                                    </select>
                                </div>
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: 'rgba(0, 242, 96, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(0, 242, 96, 0.3)'
                                }}>
                                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Voice Commands</h4>
                                    <ul style={{ fontSize: '0.75rem', color: 'var(--text-light)', paddingLeft: '1.25rem', margin: 0 }}>
                                        <li>&quot;Hey Caddie, tell me a joke&quot;</li>
                                        <li>&quot;Hey Caddie, how am I doing?&quot;</li>
                                        <li>&quot;Hey Caddie, summarize the front nine&quot;</li>
                                        <li>Automatic encouragement after scores</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* End Round Tab */}
                        {activeTab === 'end' && (
                            <div>
                                <p style={{ marginBottom: '1rem', color: 'var(--text-light)' }}>
                                    End this round and proceed through the review and settlement flow.
                                </p>
                                <button
                                    className="btn"
                                    onClick={() => {
                                        // Close settings modal and trigger round review
                                        onClose();
                                        setTimeout(() => {
                                            if (typeof window !== 'undefined') {
                                                window.dispatchEvent(new CustomEvent('triggerRoundReview'));
                                            }
                                        }, 300);
                                    }}
                                    style={{ width: '100%', backgroundColor: 'var(--danger)', padding: '1rem', fontSize: '1rem' }}
                                >
                                    🏁 End Round
                                </button>
                            </div>
                        )}

                        {/* Edit Players Tab */}
                        {activeTab === 'players' && (
                            <div>
                                <h3 style={{ marginBottom: '1rem' }}>Current Players</h3>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    {currentRound.players.map((player: any) => (
                                        <div
                                            key={player.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.75rem',
                                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                borderRadius: '8px',
                                                marginBottom: '0.5rem'
                                            }}
                                        >
                                            <span>{player.name}</span>
                                            {currentRound.players.length > 1 && (
                                                <button
                                                    className="btn"
                                                    onClick={() => {
                                                        setConfirmation({
                                                            isOpen: true,
                                                            title: 'Remove Player?',
                                                            message: `Are you sure you want to remove ${player.name} from this round?`,
                                                            isDestructive: true,
                                                            onConfirm: () => {
                                                                removePlayerFromRound(player.id);
                                                                closeConfirmation();
                                                            }
                                                        });
                                                    }}
                                                    style={{
                                                        padding: '0.25rem 0.75rem',
                                                        backgroundColor: 'var(--danger)',
                                                        fontSize: '0.75rem',
                                                        minHeight: 'auto'
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <h3 style={{ marginBottom: '1rem' }}>Add Player</h3>
                                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                    <input
                                        type="text"
                                        value={playerSearch}
                                        onChange={(e) => setPlayerSearch(e.target.value)}
                                        placeholder="Search or type player name..."
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            fontSize: '1rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg)',
                                            color: 'var(--text)'
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && playerSearch.trim()) {
                                                handleAddPlayer(playerSearch);
                                            }
                                        }}
                                    />
                                    {playerSuggestions.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            backgroundColor: '#2c2c2c',
                                            borderRadius: '8px',
                                            marginTop: '0.25rem',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            zIndex: 100,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                        }}>
                                            {playerSuggestions.map((player) => (
                                                <div
                                                    key={player.id}
                                                    onClick={() => handleAddPlayer(player.name)}
                                                    style={{
                                                        padding: '0.75rem',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid var(--border)',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    {player.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    className="btn"
                                    onClick={() => handleAddPlayer(playerSearch)}
                                    disabled={!playerSearch.trim()}
                                    style={{
                                        width: '100%',
                                        backgroundColor: playerSearch.trim() ? 'var(--success)' : 'var(--border)'
                                    }}
                                >
                                    Add Player
                                </button>
                            </div>
                        )}

                        {/* Cached Rounds Tab */}
                        {activeTab === 'cached' && (
                            <div>
                                <h3 style={{ marginBottom: '1rem' }}>Cached Rounds</h3>
                                {cachedRounds.length === 0 ? (
                                    <p style={{ color: 'var(--text-light)' }}>No cached rounds found.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {cachedRounds.map((cached) => (
                                            <div
                                                key={cached.timestamp}
                                                style={{
                                                    padding: '1rem',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)'
                                                }}
                                            >
                                                <div style={{ marginBottom: '0.5rem' }}>
                                                    <strong>{cached.courseName}</strong>
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                                    {formatDate(cached.timestamp)}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.75rem' }}>
                                                    {cached.holesPlayed} holes played • {cached.round.players?.length || 0} players
                                                </div>
                                                <button
                                                    className="btn"
                                                    onClick={() => {
                                                        setConfirmation({
                                                            isOpen: true,
                                                            title: 'Restore Round?',
                                                            message: 'This will replace your current round. Are you sure?',
                                                            isDestructive: false,
                                                            onConfirm: () => {
                                                                restoreCachedRound(cached.timestamp);
                                                                closeConfirmation();
                                                                onClose();
                                                            }
                                                        });
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        backgroundColor: 'var(--info)',
                                                        fontSize: '0.875rem'
                                                    }}
                                                >
                                                    Restore Round
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sub-modals */}
            {showAmendmentModal && currentRound && (
                <CourseAmendmentModal
                    course={currentRound.course}
                    layoutId={currentRound.course.selectedLayoutKey || 'default'}
                    onClose={() => setShowAmendmentModal(false)}
                    onSave={async ({ pars, distances }, submitToDatabase) => {
                        const layoutId = currentRound.course.selectedLayoutKey || 'default';
                        const courseId = currentRound.course.id || currentRound.course.name;

                        updateCourseLayout(layoutId, pars, distances);

                        try {
                            const { updateCourseLayoutDetails, saveUserCustomLayout } = await import('@/lib/courses');
                            await updateCourseLayoutDetails(courseId, layoutId, pars, distances);

                            if (submitToDatabase) {
                                const layout = currentRound.course.layouts?.[layoutId];
                                if (layout) {
                                    const customLayout: any = {
                                        ...layout,
                                        holes: Object.entries(pars).reduce((acc, [holeNum, par]) => {
                                            const hn = parseInt(holeNum);
                                            acc[hn] = {
                                                ...(layout.holes?.[hn] || {}),
                                                par,
                                                distance: distances[hn]
                                            };
                                            return acc;
                                        }, {} as any),
                                        parTotal: Object.values(pars).reduce((sum, par) => sum + par, 0)
                                    };
                                    await saveUserCustomLayout(courseId, layoutId, customLayout, true);
                                }
                            }
                        } catch (error) {
                            console.error('Error saving course amendments:', error);
                            throw error;
                        }
                    }}
                />
            )}

            {showBettingModal && (
                <BettingSetupModal onClose={() => setShowBettingModal(false)} />
            )}

            {showEndRoundModal && (
                <EndRoundConfirmModal
                    onClose={() => setShowEndRoundModal(false)}
                    onConfirm={async () => {
                        // Close settings modal first
                        setShowEndRoundModal(false);
                        onClose();
                        // Trigger the proper end round flow by setting activeHole to 18 and showing review
                        // This will be handled by the ActiveRound component's useEffect
                        // We need to manually trigger it by dispatching an event or using a callback
                        // For now, we'll use a timeout to let the modal close, then trigger review
                        setTimeout(() => {
                            if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('triggerRoundReview'));
                            }
                        }, 300);
                    }}
                />
            )}

            <ConfirmationModal
                isOpen={confirmation.isOpen}
                title={confirmation.title}
                message={confirmation.message}
                onConfirm={confirmation.onConfirm}
                onCancel={closeConfirmation}
                isDestructive={confirmation.isDestructive}
            />
        </>
    );
}




