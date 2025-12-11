'use client';

import { useState, useEffect, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { useVoice } from '@/context/VoiceContext';
import BettingSummary from '@/components/BettingSummary';
import FundatoryModal from '@/components/FundatoryModal';
import ScoreInput from '@/components/ScoreInput';
import Leaderboard from '@/components/Leaderboard';
import PlayerCard from '@/components/ui/PlayerCard';
import VoiceIndicator from '@/components/ui/VoiceIndicator';
import TeeOrderDisplay from '@/components/ui/TeeOrderDisplay';
import Fuse from 'fuse.js';

export default function ActiveRound() {
    const { 
        currentRound, 
        activeHole, 
        updateScore, 
        setActiveHole, 
        fundatoryBets,
        teeOrder,
        currentTeeIndex,
        nextTee,
        setTeeOrder,
        endRound
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
    const [showScoreInput, setShowScoreInput] = useState(false);

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
            if (teeOrder.length > 0) {
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
            if (newOrder.length > 0) {
                setTeeOrder(newOrder);
            }
        } else if (lastCommand.type === 'END_ROUND') {
            if (confirm('End this round? Your scores will be saved to history.')) {
                endRound();
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
    }, [lastCommand, currentRound, activeHole, updateScore, fundatoryBets, nextTee, setTeeOrder, endRound, teeOrder]);

    if (!currentRound) return null;

    const handleScoreChange = (playerId: string, change: number) => {
        const currentScore = currentRound.scores[activeHole]?.[playerId] || 0;
        updateScore(playerId, activeHole, currentScore + change);
    };

    const handleNextHole = () => {
        // Assuming 18 holes for now, or check course data
        if (activeHole < 18) {
            setActiveHole(activeHole + 1);
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
                    <div>
                        <h2 style={{ marginBottom: '0.25rem' }}>Hole {activeHole}</h2>
                        <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', margin: 0 }}>
                            {currentRound.course.name}
                        </p>
                        <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                            Par {currentRound.course.holes?.[activeHole - 1]?.par || 3}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <button
                            className="btn"
                            onClick={isListeningForHotWord ? stopHotWordListening : startHotWordListening}
                            style={{
                                backgroundColor: isListeningForHotWord ? '#3498db' : '#95a5a6',
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.8rem',
                                minHeight: 'auto'
                            }}
                        >
                            {isListeningForHotWord ? 'Hot Word On' : 'Hot Word'}
                        </button>
                        <button
                            className="btn"
                            onClick={isListening ? stopListening : startListening}
                            style={{
                                backgroundColor: isListening ? '#e74c3c' : '#2ecc71',
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.8rem',
                                minHeight: 'auto'
                            }}
                        >
                            {isListening ? 'Stop' : 'Listen'}
                        </button>
                    </div>
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
            {teeOrder.length > 0 && (
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
                <button
                    className="btn"
                    onClick={handleNextHole}
                    disabled={activeHole >= 18}
                    style={{ flex: 1, backgroundColor: activeHole >= 18 ? 'var(--border)' : 'var(--info)' }}
                >
                    Next →
                </button>
            </div>

            {/* Quick Score Buttons for First Player */}
            {!showScoreInput && currentRound.players.length > 0 && (
                <div className="card">
                    <h3 style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-light)' }}>
                        Quick Score: {currentRound.players[0].name}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            className="btn"
                            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', backgroundColor: 'var(--success)' }}
                            onClick={() => updateScore(currentRound.players[0].id, activeHole, -1)}
                        >
                            Birdie
                        </button>
                        <button
                            className="btn"
                            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', backgroundColor: 'var(--info)' }}
                            onClick={() => updateScore(currentRound.players[0].id, activeHole, 0)}
                        >
                            Par
                        </button>
                        <button
                            className="btn"
                            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', backgroundColor: 'var(--warning)' }}
                            onClick={() => updateScore(currentRound.players[0].id, activeHole, 1)}
                        >
                            Bogey
                        </button>
                    </div>
                </div>
            )}

            {/* Voice Status Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                <VoiceIndicator
                    isListening={isListening}
                    isListeningForHotWord={isListeningForHotWord}
                    size="medium"
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                    {isListeningForHotWord
                        ? 'Listening for "Hey Caddie"...'
                        : isListening
                            ? 'Listening for commands...'
                            : 'Voice off'}
                </span>
            </div>

            {/* Score Input Mode Toggle */}
            <div style={{ marginBottom: '1rem' }}>
                <button
                    className="btn"
                    onClick={() => setShowScoreInput(!showScoreInput)}
                    style={{
                        width: '100%',
                        backgroundColor: showScoreInput ? 'var(--primary)' : 'var(--info)'
                    }}
                >
                    {showScoreInput ? 'Hide Quick Score' : 'Show Quick Score Input'}
                </button>
            </div>

            {showScoreInput ? (
                <ScoreInput
                    players={currentRound.players}
                    par={currentRound.course.holes?.[activeHole - 1]?.par || 3}
                    onScoreSelect={(playerId, score) => {
                        updateScore(playerId, activeHole, score);
                    }}
                    currentScores={currentRound.scores[activeHole] || {}}
                />
            ) : (
                <div className="players-grid">
                    {currentRound.players.map((player: any) => {
                        const par = currentRound.course.holes?.[activeHole - 1]?.par || 3;
                        const relativeScore = currentRound.scores[activeHole]?.[player.id] ?? null;
                        const absoluteScore = relativeScore !== null ? par + relativeScore : null;

                        return (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                par={par}
                                relativeScore={relativeScore}
                                absoluteScore={absoluteScore}
                                onScoreChange={(change) => handleScoreChange(player.id, change)}
                            />
                        );
                    })}
                </div>
            )}

            <div style={{ marginTop: '2rem' }}>
                <Leaderboard />
            </div>

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button className="btn" onClick={() => setShowFundatoryModal(true)} style={{ backgroundColor: '#f39c12', width: '100%' }}>
                    + Fundatory Bet
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
        </div>
    );
}
