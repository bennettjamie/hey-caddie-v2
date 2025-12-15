'use client';

import { useState, useEffect, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { useVoice } from '@/context/VoiceContext';
import BettingSummary from '@/components/BettingSummary';
import BettingSetupModal from '@/components/BettingSetupModal';
import BettingResults from '@/components/BettingResults';
import FundatoryModal from '@/components/FundatoryModal';
import Leaderboard from '@/components/Leaderboard';
import PlayerCard from '@/components/ui/PlayerCard';
import VoiceIndicator from '@/components/ui/VoiceIndicator';
import TeeOrderDisplay from '@/components/ui/TeeOrderDisplay';
import SettingsModal from '@/components/SettingsModal';
import UnresolvedBetsModal from '@/components/UnresolvedBetsModal';
import EndRoundConfirmModal from '@/components/EndRoundConfirmModal';
import RoundFinalSummary from '@/components/RoundFinalSummary';
import RandomStartModal from '@/components/RandomStartModal';
import RoundReviewModal from '@/components/RoundReviewModal';
import BetSummaryReviewModal from '@/components/BetSummaryReviewModal';
import SettlementModal from '@/components/SettlementModal';
import Fuse from 'fuse.js';

export default function ActiveRound() {
    const { 
        currentRound, 
        activeHole, 
        updateScore, 
        setActiveHole, 
        fundatoryBets,
        activeBets = {},
        startSkins,
        startNassau,
        teeOrder = [],
        currentTeeIndex,
        nextTee,
        setTeeOrder,
        endRound,
        updateCourseLayout
    } = useGame();
    const {
        isListening,
        isListeningForHotWord,
        startListening,
        stopListening,
        startHotWordListening,
        stopHotWordListening,
        transcript,
        lastCommand,
        lastResponse
    } = useVoice();
    const [showFundatoryModal, setShowFundatoryModal] = useState(false);
    const [showBettingSetup, setShowBettingSetup] = useState(false);
    const [showBettingResults, setShowBettingResults] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showUnresolvedBetsModal, setShowUnresolvedBetsModal] = useState(false);
    const [showEndRoundConfirm, setShowEndRoundConfirm] = useState(false);
    const [showFinalSummary, setShowFinalSummary] = useState(false);
    const [showRoundReview, setShowRoundReview] = useState(false);
    const [showRandomStart, setShowRandomStart] = useState(false);
    const [hasRandomized, setHasRandomized] = useState(false);
    const [showBetSummary, setShowBetSummary] = useState(false);
    const [showSettlement, setShowSettlement] = useState(false);
    const [finalRoundData, setFinalRoundData] = useState<any>(null);

    // Update game state for voice queries
    useEffect(() => {
        if (typeof window !== 'undefined' && window.__updateVoiceGameState) {
            window.__updateVoiceGameState({
                currentRound,
                activeHole,
                fundatoryBets,
                teeOrder,
                currentTeeIndex
            });
        }
    }, [currentRound, activeHole, fundatoryBets, teeOrder, currentTeeIndex]);

    // Ensure teeOrder is initialized if missing when round exists
    useEffect(() => {
        if (currentRound && currentRound.players && (!teeOrder || teeOrder.length === 0)) {
            const playerIds = currentRound.players.map((p: any) => p.id).filter(Boolean);
            if (playerIds.length > 0 && setTeeOrder && typeof setTeeOrder === 'function') {
                setTeeOrder(playerIds);
            }
        }
    }, [currentRound, teeOrder, setTeeOrder]);

    // Show random start modal on hole 1 if not yet randomized
    useEffect(() => {
        if (currentRound && activeHole === 1 && !hasRandomized && !showRandomStart) {
            // Check if tee order exists and has players
            if (teeOrder && teeOrder.length > 0) {
                setShowRandomStart(true);
            }
        }
    }, [currentRound, activeHole, hasRandomized, showRandomStart, teeOrder]);

    // Show betting setup modal immediately after round starts (if no bets active)
    useEffect(() => {
        if (currentRound && activeHole === 1 && !showBettingSetup && !showRandomStart) {
            // Check if round just started (no scores yet or only hole 1 scores)
            const hasScores = currentRound.scores && Object.keys(currentRound.scores).length > 0;
            const onlyHole1Scores = hasScores && Object.keys(currentRound.scores).length === 1 && currentRound.scores[1];
            const noBetsActive = !activeBets?.skins?.started && !activeBets?.nassau?.started;
            
            // Show betting setup if no bets are active and round just started
            if (noBetsActive && (!hasScores || onlyHole1Scores)) {
                // Small delay to let UI settle
                const timer = setTimeout(() => {
                    setShowBettingSetup(true);
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [currentRound, activeHole, showBettingSetup, showRandomStart, activeBets]);

    // Listen for trigger to show round review (from Settings modal)
    useEffect(() => {
        const handleTriggerReview = () => {
            if (currentRound && !showRoundReview && !showFinalSummary) {
                setShowRoundReview(true);
            }
        };
        
        if (typeof window !== 'undefined') {
            window.addEventListener('triggerRoundReview', handleTriggerReview);
            return () => {
                window.removeEventListener('triggerRoundReview', handleTriggerReview);
            };
        }
    }, [currentRound, showRoundReview, showFinalSummary]);

    // Detect when hole 18 is completed (all players have scores) - auto-trigger review
    useEffect(() => {
        if (!currentRound || activeHole !== 18) return;

        const hole18Scores = currentRound.scores[18];
        if (!hole18Scores) return;

        // Check if all players have scores for hole 18
        const allPlayersHaveScores = currentRound.players.every((player: any) => {
            const score = hole18Scores[player.id];
            return score !== undefined && score !== null;
        });

        if (allPlayersHaveScores && !showUnresolvedBetsModal && !showRoundReview && !showFinalSummary) {
            // Small delay to let the UI update, then show review modal
            setTimeout(() => {
                setShowRoundReview(true);
            }, 500);
        }
    }, [currentRound, activeHole, showUnresolvedBetsModal, showRoundReview, showFinalSummary]);

    // Fuzzy match player names
    const findPlayerByName = (name: string) => {
        if (!currentRound?.players) return null;

        // Exact match first
        const exactMatch = currentRound.players.find((p: any) =>
            p.name.toLowerCase() === name.toLowerCase()
        );
        if (exactMatch) return exactMatch;

        // Partial match
        const partialMatch = currentRound.players.find((p: any) =>
            p.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(p.name.toLowerCase())
        );
        if (partialMatch) return partialMatch;

        // Fuzzy match using Fuse.js
        const fuse = new Fuse(currentRound.players, {
            keys: ['name'],
            threshold: 0.4
        });
        const results = fuse.search(name);
        if (results.length > 0) {
            return results[0].item;
        }

        return null;
    };

    // Handle Voice Commands
    useEffect(() => {
        if (!lastCommand || !currentRound) return;

        if (lastCommand.type === 'SCORE') {
            const player = findPlayerByName(lastCommand.player);
            if (player) {
                const holeNum = lastCommand.holeNumber || activeHole;
                updateScore(player.id, holeNum, lastCommand.score);
                // Auto-advance tee order after scoring
                nextTee();
            }
        } else if (lastCommand.type === 'MULTI_SCORE') {
            // Handle multiple scores in one command
            lastCommand.scores.forEach((scoreData: any) => {
                const player = findPlayerByName(scoreData.player);
                if (player) {
                    const holeNum = lastCommand.holeNumber || activeHole;
                    updateScore(player.id, holeNum, scoreData.score);
                }
            });
            // Reset tee order after all scores recorded
            if (teeOrder && teeOrder.length > 0 && setTeeOrder && typeof setTeeOrder === 'function') {
                setTeeOrder(teeOrder);
            }
        } else if (lastCommand.type === 'FUNDATORY_RESULT') {
            // Handle fundatory bet results
            const player = findPlayerByName(lastCommand.player);
            if (player) {
                // Find pending fundatory bet for this player on current hole
                const pendingBet = fundatoryBets.find(
                    (bet: any) =>
                        bet.status === 'pending' &&
                        bet.targetId === player.id &&
                        bet.holeNumber === activeHole
                );
                if (pendingBet) {
                    // Update bet status - this would need to be implemented in GameContext
                    // For now, just log it
                    console.log('Fundatory bet result:', pendingBet.id, lastCommand.result);
                }
            }
        } else if (lastCommand.type === 'NEXT_HOLE') {
            if (activeHole < 18) {
                setActiveHole(activeHole + 1);
            }
        } else if (lastCommand.type === 'PREVIOUS_HOLE') {
            if (activeHole > 1) {
                setActiveHole(activeHole - 1);
            }
        } else if (lastCommand.type === 'GO_TO_HOLE') {
            const targetHole = lastCommand.holeNumber;
            if (targetHole >= 1 && targetHole <= 18) {
                setActiveHole(targetHole);
            }
        } else if (lastCommand.type === 'NEXT_TEE') {
            nextTee();
        } else if (lastCommand.type === 'CHANGE_TEE_ORDER') {
            const playerNames = lastCommand.playerNames || [];
            const newOrder: string[] = [];
            playerNames.forEach((name: string) => {
                const player = findPlayerByName(name);
                if (player) {
                    newOrder.push(player.id);
                }
            });
            if (newOrder.length > 0 && setTeeOrder && typeof setTeeOrder === 'function') {
                setTeeOrder(newOrder);
            }
        } else if (lastCommand.type === 'START_SKINS') {
            const value = lastCommand.value || 0.25;
            startSkins(value);
        } else if (lastCommand.type === 'START_NASSAU') {
            const value = lastCommand.value || 0.25;
            startNassau(value);
        } else if (lastCommand.type === 'END_ROUND') {
            if (confirm('End this round? Your scores will be saved to history.')) {
                setShowBettingResults(true);
            }
        } else if (lastCommand.type === 'CHANGE_SCORE') {
            const player = findPlayerByName(lastCommand.player);
            if (player) {
                updateScore(player.id, activeHole, lastCommand.score);
            }
        } else if (lastCommand.type === 'UNDO_SCORE') {
            // Remove last score for current hole
            // This would need a more sophisticated undo system
            console.log('Undo score - feature to be implemented');
        }
    }, [lastCommand, currentRound, activeHole, updateScore, fundatoryBets, nextTee, setTeeOrder, endRound, teeOrder, startSkins, startNassau]);

    if (!currentRound) return null;

    const handleScoreChange = (playerId: string, change: number) => {
        const currentScore = currentRound.scores[activeHole]?.[playerId] || 0;
        updateScore(playerId, activeHole, currentScore + change);
    };

    // Check for unresolved bets before ending round
    const checkAndHandleUnresolvedBets = async () => {
        if (!currentRound) return;

        const holes = Array.from({ length: 18 }, (_, i) => i + 1);
        const playerIds = currentRound.players.map((p: any) => p.id);

        // Import betting functions
        const { calculateSkins, calculateNassau } = await import('@/lib/betting');

        // Check for skins carryovers
        let hasCarryovers = false;
        if (activeBets?.skins?.started) {
            const skinsResults = calculateSkins(currentRound.scores, holes, activeBets.skins.value, (activeBets.skins as any).participants);
            hasCarryovers = skinsResults.some(s => s.isCarryOver);
        }

        // Check for nassau ties
        let hasTies = false;
        if (activeBets?.nassau?.started) {
            const nassauResults = calculateNassau(currentRound.scores, playerIds, (activeBets.nassau as any).participants);
            hasTies = !nassauResults.front9WinnerId || !nassauResults.back9WinnerId || !nassauResults.overallWinnerId;
        }

        if (hasCarryovers || hasTies) {
            setShowUnresolvedBetsModal(true);
        } else {
            // No unresolved bets, proceed to end round
            endRound().then((finalData) => {
                setFinalRoundData(finalData);
                // Show final summary after round ends
                setTimeout(() => {
                    setShowFinalSummary(true);
                }, 500);
            });
        }
    };

    // Handle end round with resolution
    const handleEndRoundWithResolution = async (resolution: any) => {
        // Store resolution in a way that endRound can access it
        if (typeof window !== 'undefined') {
            (window as any).__pendingRoundResolution = resolution;
        }
        const finalData = await endRound();
        setFinalRoundData(finalData);
        // Show bet summary review after resolving bets
        setTimeout(() => {
            setShowBetSummary(true);
        }, 500);
    };

    // Handle randomize tee order
    const handleRandomizeTeeOrder = () => {
        if (!currentRound || !setTeeOrder) return;
        const playerIds = currentRound.players.map((p: any) => p.id).filter(Boolean);
        const shuffled = [...playerIds];
        // Fisher-Yates shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setTeeOrder(shuffled);
        setHasRandomized(true);
    };

    // Handle keep current order
    const handleKeepOrder = () => {
        setHasRandomized(true);
    };

    const handleNextHole = () => {
        // Assuming 18 holes for now, or check course data
        if (activeHole < 18) {
            if (typeof setActiveHole === 'function') {
                setActiveHole(activeHole + 1);
            } else {
                console.error('setActiveHole is not a function:', setActiveHole);
            }
        }
    };

    const handlePrevHole = () => {
        if (activeHole > 1) {
            setActiveHole(activeHole - 1);
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '5rem' }}>
            <header className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '0.25rem' }}>
                            <h2 style={{ marginBottom: 0 }}>Hole {activeHole}</h2>
                        </div>
                        <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', margin: 0 }}>
                            {currentRound.course.name}
                        </p>
                        <p style={{ 
                            color: 'var(--primary)', 
                            fontSize: '1rem', 
                            margin: '0.5rem 0 0 0',
                            fontWeight: 600
                        }}>
                            Par {(() => {
                                const layoutKey = currentRound.course.selectedLayoutKey || 'default';
                                return currentRound.course.layouts?.[layoutKey]?.holes?.[activeHole]?.par || 
                                       currentRound.course.holes?.[activeHole - 1]?.par || 3;
                            })()}
                        </p>
                    </div>
                    {/* Voice Toggle Button - moved to far right */}
                    <button
                        onClick={() => {
                            if (isListening || isListeningForHotWord) {
                                stopListening();
                                stopHotWordListening();
                            } else {
                                startHotWordListening();
                            }
                        }}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: (isListening || isListeningForHotWord) ? 'var(--primary)' : 'var(--border)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            minHeight: '36px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <VoiceIndicator
                            isListening={isListening}
                            isListeningForHotWord={isListeningForHotWord}
                            size="small"
                        />
                        <span>
                            {(isListening || isListeningForHotWord) ? 'Voice On' : 'Voice Off'}
                        </span>
                    </button>
                </div>
                
                {/* Progress Bar */}
                <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-light)' }}>
                        <span>Progress</span>
                        <span>{activeHole} / 18</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-light)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div
                            style={{
                                width: `${(activeHole / 18) * 100}%`,
                                height: '100%',
                                backgroundColor: 'var(--primary)',
                                transition: 'width var(--transition-base)',
                                borderRadius: 'var(--radius-full)'
                            }}
                        />
                    </div>
                </div>
            </header>

            {/* Tee Order Display */}
            {teeOrder && teeOrder.length > 0 && (
                <TeeOrderDisplay 
                    players={currentRound.players} 
                    teeOrder={teeOrder} 
                    currentTeeIndex={currentTeeIndex}
                />
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    className="btn"
                    onClick={handlePrevHole}
                    disabled={activeHole === 1}
                    style={{ flex: 1, backgroundColor: activeHole === 1 ? 'var(--border)' : 'var(--info)' }}
                >
                    ← Previous
                </button>
                {activeHole < 18 ? (
                    <button
                        className="btn"
                        onClick={handleNextHole}
                        style={{ flex: 1, backgroundColor: 'var(--info)' }}
                    >
                        Next →
                    </button>
                ) : (
                    <button
                        className="btn"
                        onClick={() => {
                            // Unconditionally trigger round review
                            setShowRoundReview(true);
                        }}
                        style={{ flex: 1, backgroundColor: 'var(--success)', fontSize: '1.125rem', fontWeight: 600 }}
                    >
                        Finish Round
                    </button>
                )}
            </div>

            {/* Betting Button */}
            <div style={{ marginBottom: '1rem' }}>
                <button
                    className="btn"
                    onClick={() => setShowBettingSetup(true)}
                    style={{
                        width: '100%',
                        backgroundColor: (activeBets?.skins?.started || activeBets?.nassau?.started) ? 'var(--info)' : 'var(--warning)'
                    }}
                >
                    {(activeBets?.skins?.started || activeBets?.nassau?.started) ? 'Add More Bets' : 'Start Bets'}
                </button>
            </div>

            <div className="players-grid">
                    {currentRound.players.map((player: any) => {
                        const layoutKey = currentRound.course.selectedLayoutKey || 'default';
                        const par = currentRound.course.layouts?.[layoutKey]?.holes?.[activeHole]?.par || 
                                   currentRound.course.holes?.[activeHole - 1]?.par || 3;
                        const relativeScore = currentRound.scores[activeHole]?.[player.id] ?? null;
                        const absoluteScore = relativeScore !== null ? par + relativeScore : null;
                        
                        // Get recent hole scores for this player (last 3 holes including current)
                        const recentHoleScores: number[] = [];
                        for (let i = Math.max(1, activeHole - 2); i <= activeHole; i++) {
                            const score = currentRound.scores[i]?.[player.id];
                            if (score !== undefined && score !== null) {
                                recentHoleScores.push(score);
                            }
                        }

                        return (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                par={par}
                                relativeScore={relativeScore}
                                absoluteScore={absoluteScore}
                                onScoreChange={(change) => handleScoreChange(player.id, change)}
                                holeNumber={activeHole}
                                recentHoleScores={recentHoleScores}
                            />
                        );
                    })}
                </div>

            <div style={{ marginTop: '2rem' }}>
                <Leaderboard />
            </div>

            <BettingSummary />

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button className="btn" onClick={() => setShowFundatoryModal(true)} style={{ backgroundColor: '#f39c12', width: '100%' }}>
                    + Fundatory Bet
                </button>
            </div>

            {/* Settings Button at Bottom */}
            <div style={{ 
                position: 'fixed', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                padding: '1rem', 
                backgroundColor: 'var(--background)',
                borderTop: '2px solid var(--border)',
                zIndex: 100
            }}>
                <button
                    className="btn"
                    onClick={() => setShowSettingsModal(true)}
                    style={{
                        width: '100%',
                        backgroundColor: 'var(--info)',
                        padding: '1rem',
                        fontSize: '1rem',
                        fontWeight: 600
                    }}
                >
                    ⚙️ Settings
                </button>
            </div>

            {showFundatoryModal && <FundatoryModal onClose={() => setShowFundatoryModal(false)} />}

            {(transcript || lastResponse) && (
                <div style={{ marginTop: '1rem' }}>
                    {transcript && (
                        <div style={{ padding: '1rem', background: '#e1e1e1', borderRadius: '8px', marginBottom: '0.5rem' }}>
                            <strong>Heard:</strong> {transcript}
                        </div>
                    )}
                    {lastResponse && (
                        <div style={{ padding: '1rem', background: '#d5f4e6', borderRadius: '8px', border: '1px solid #2ecc71' }}>
                            <strong>Caddie:</strong> {lastResponse}
                        </div>
                    )}
                </div>
            )}

            <BettingSummary />

            {/* Modals */}
            {showBettingSetup && <BettingSetupModal onClose={() => setShowBettingSetup(false)} />}
            {showSettingsModal && (
                <SettingsModal onClose={() => setShowSettingsModal(false)} />
            )}
            {showBettingResults && (
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
                    <div style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <BettingResults onClose={() => {
                            setShowBettingResults(false);
                            endRound();
                        }} />
                    </div>
                </div>
            )}

            {showUnresolvedBetsModal && (
                <UnresolvedBetsModal
                    onClose={() => setShowUnresolvedBetsModal(false)}
                    onResolve={(resolution) => {
                        setShowUnresolvedBetsModal(false);
                        // Handle resolution in endRound
                        handleEndRoundWithResolution(resolution);
                    }}
                />
            )}
            {showRandomStart && (
                <RandomStartModal
                    onClose={() => setShowRandomStart(false)}
                    onRandomize={handleRandomizeTeeOrder}
                    onKeepOrder={handleKeepOrder}
                />
            )}
            {showRoundReview && (
                <RoundReviewModal
                    onClose={() => setShowRoundReview(false)}
                    onEdit={() => {
                        setShowRoundReview(false);
                        // Go back to hole 18 to edit
                        setActiveHole(18);
                    }}
                    onConfirm={() => {
                        setShowRoundReview(false);
                        // Check for unresolved bets first
                        checkAndHandleUnresolvedBets();
                    }}
                />
            )}
            {showUnresolvedBetsModal && (
                <UnresolvedBetsModal
                    onClose={() => setShowUnresolvedBetsModal(false)}
                    onResolve={(resolution) => {
                        setShowUnresolvedBetsModal(false);
                        // Handle resolution in endRound
                        handleEndRoundWithResolution(resolution);
                    }}
                />
            )}
            {showBetSummary && finalRoundData && (
                <BetSummaryReviewModal
                    onClose={() => setShowBetSummary(false)}
                    onConfirm={() => {
                        setShowBetSummary(false);
                        // Calculate MRTZ totals for settlement
                        const { calculateRoundMRTZ } = require('@/lib/mrtz');
                        const playerIds = currentRound.players.map((p: any) => p.id);
                        const finalBets = finalRoundData.bets ? {
                            skins: finalRoundData.bets.skins ? { started: true, value: (Object.values(finalRoundData.bets.skins)[0] as any)?.value || 0 } : undefined,
                            nassau: finalRoundData.bets.nassau ? { started: true, value: (finalRoundData.bets.nassau as any)?.value || 0 } : undefined
                        } : activeBets;
                        const mrtzTotals = calculateRoundMRTZ(
                            { ...currentRound, players: playerIds } as any,
                            finalBets,
                            finalRoundData.bets?.fundatory || fundatoryBets
                        );
                        const playerNames: { [key: string]: string } = {};
                        currentRound.players.forEach((p: any) => {
                            playerNames[p.id] = p.name;
                        });
                        setShowSettlement(true);
                    }}
                    finalRoundData={finalRoundData}
                />
            )}
            {showSettlement && finalRoundData && (
                <SettlementModal
                    onClose={() => {
                        setShowSettlement(false);
                        setShowFinalSummary(true);
                    }}
                    onConfirm={(settledIRL: boolean) => {
                        setShowSettlement(false);
                        // Store settlement info
                        if (typeof window !== 'undefined') {
                            (window as any).__roundSettlement = { settledIRL };
                        }
                        setShowFinalSummary(true);
                    }}
                    mrtzTotals={(() => {
                        const { calculateRoundMRTZ } = require('@/lib/mrtz');
                        const playerIds = currentRound.players.map((p: any) => p.id);
                        const finalBets = finalRoundData.bets ? {
                            skins: finalRoundData.bets.skins ? { started: true, value: (Object.values(finalRoundData.bets.skins)[0] as any)?.value || 0 } : undefined,
                            nassau: finalRoundData.bets.nassau ? { started: true, value: (finalRoundData.bets.nassau as any)?.value || 0 } : undefined
                        } : activeBets;
                        return calculateRoundMRTZ(
                            { ...currentRound, players: playerIds } as any,
                            finalBets,
                            finalRoundData.bets?.fundatory || fundatoryBets
                        );
                    })()}
                    playerNames={(() => {
                        const names: { [key: string]: string } = {};
                        currentRound.players.forEach((p: any) => {
                            names[p.id] = p.name;
                        });
                        return names;
                    })()}
                />
            )}
            {showFinalSummary && (
                <RoundFinalSummary 
                    finalRoundData={finalRoundData}
                    onClose={() => {
                        setShowFinalSummary(false);
                        setFinalRoundData(null);
                    }} 
                />
            )}
        </div>
    );
}
