'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { calculateSkins, calculateNassau, calculateFundatory } from '@/lib/betting';
import { calculateRoundMRTZ, getAllLocalMRTZ } from '@/lib/mrtz';
import BettingSetupModal from '@/components/BettingSetupModal';
import BettingResults from '@/components/BettingResults';

export default function TestBetting() {
    const {
        currentRound,
        players,
        course,
        activeHole,
        activeBets,
        fundatoryBets,
        startRound,
        updateScore,
        setActiveHole,
        startSkins,
        startNassau,
        addFundatoryBet,
        updateFundatoryBet,
        endRound
    } = useGame();

    const [testResults, setTestResults] = useState<string[]>([]);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [mrtzBalances, setMrtzBalances] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        // Load MRTZ balances
        const balances = getAllLocalMRTZ();
        setMrtzBalances(balances);
    }, []);

    const addTestResult = (message: string) => {
        setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const setupTestRound = () => {
        // Create test course
        const testCourse = {
            id: 'test-course',
            name: 'Test Course',
            layouts: {
                default: {
                    name: 'Main',
                    holes: {},
                    parTotal: 54
                }
            }
        };

        // Create test players
        const testPlayers = [
            { id: 'player1', name: 'Alice' },
            { id: 'player2', name: 'Bob' },
            { id: 'player3', name: 'Charlie' }
        ];

        startRound(testCourse, testPlayers);
        addTestResult('✅ Test round started with 3 players');
    };

    const addTestScores = () => {
        if (!currentRound || !players.length) {
            addTestResult('❌ No active round. Start a test round first.');
            return;
        }

        // Add scores for first 3 holes
        const testScores = [
            { hole: 1, scores: { player1: -1, player2: 0, player3: 1 } }, // Alice birdie, Bob par, Charlie bogey
            { hole: 2, scores: { player1: 0, player2: -1, player3: 0 } }, // Bob birdie
            { hole: 3, scores: { player1: -1, player2: -1, player3: 0 } }, // Alice and Bob birdie (tie)
        ];

        testScores.forEach(({ hole, scores }) => {
            Object.entries(scores).forEach(([playerName, score]) => {
                const player = players.find((p: any) => p.name === playerName);
                if (player) {
                    updateScore(player.id, hole, score);
                }
            });
        });

        addTestResult('✅ Added test scores for holes 1-3');
    };

    const testSkinsCalculation = () => {
        if (!currentRound || !activeBets.skins?.started) {
            addTestResult('❌ Start a round and skins bet first.');
            return;
        }

        const holes = Array.from({ length: 18 }, (_, i) => i + 1);
        const skins = calculateSkins(currentRound.scores, holes, activeBets.skins.value, activeBets.skins.participants);
        
        addTestResult(`✅ Skins calculated: ${skins.length} holes with results`);
        skins.forEach(s => {
            if (s.winnerId) {
                const winner = players.find((p: any) => p.id === s.winnerId);
                addTestResult(`   Hole ${s.holeNumber}: ${winner?.name} won ${s.value} MRTZ`);
            } else {
                addTestResult(`   Hole ${s.holeNumber}: Push (${s.value} MRTZ carried over)`);
            }
        });
    };

    const testNassauCalculation = () => {
        if (!currentRound || !activeBets.nassau?.started) {
            addTestResult('❌ Start a round and nassau bet first.');
            return;
        }

        const playerIds = players.map((p: any) => p.id);
        const nassau = calculateNassau(currentRound.scores, playerIds, activeBets.nassau.participants);
        
        addTestResult('✅ Nassau calculated:');
        if (nassau.front9WinnerId) {
            const winner = players.find((p: any) => p.id === nassau.front9WinnerId);
            addTestResult(`   Front 9: ${winner?.name} wins`);
        } else {
            addTestResult('   Front 9: Tie');
        }
        if (nassau.back9WinnerId) {
            const winner = players.find((p: any) => p.id === nassau.back9WinnerId);
            addTestResult(`   Back 9: ${winner?.name} wins`);
        } else {
            addTestResult('   Back 9: Tie');
        }
        if (nassau.overallWinnerId) {
            const winner = players.find((p: any) => p.id === nassau.overallWinnerId);
            addTestResult(`   Overall: ${winner?.name} wins`);
        } else {
            addTestResult('   Overall: Tie');
        }
    };

    const testMRTZCalculation = () => {
        if (!currentRound) {
            addTestResult('❌ No active round.');
            return;
        }

        const playerIds = players.map((p: any) => p.id);
        const roundMRTZ = calculateRoundMRTZ(
            {
                ...currentRound,
                players: playerIds
            } as any,
            activeBets,
            fundatoryBets
        );

        addTestResult('✅ MRTZ calculated:');
        Object.entries(roundMRTZ).forEach(([playerId, amount]) => {
            const player = players.find((p: any) => p.id === playerId);
            addTestResult(`   ${player?.name}: ${amount > 0 ? '+' : ''}${amount.toFixed(2)} MRTZ`);
        });
    };

    const testFundatoryBet = () => {
        if (!currentRound || players.length < 2) {
            addTestResult('❌ Need at least 2 players.');
            return;
        }

        const bet = {
            id: `test-${Date.now()}`,
            challengerId: players[0].id,
            targetId: players[1].id,
            amount: 1,
            gapDescription: 'Test Gap',
            status: 'pending' as const,
            holeNumber: activeHole
        };

        addFundatoryBet(bet);
        addTestResult(`✅ Fundatory bet created: ${players[0].name} challenges ${players[1].name} on hole ${activeHole}`);
    };

    const testCompleteFlow = async () => {
        addTestResult('🚀 Starting complete betting flow test...');
        
        // Setup
        setupTestRound();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Start bets
        startSkins(0.25);
        startNassau(0.5);
        addTestResult('✅ Started Skins (0.25) and Nassau (0.5) bets');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Add scores
        addTestScores();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Test calculations
        testSkinsCalculation();
        testNassauCalculation();
        testMRTZCalculation();
        
        addTestResult('✅ Complete flow test finished!');
    };

    const clearTestResults = () => {
        setTestResults([]);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>Betting System Test Page</h1>
            <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
                Use this page to test all betting functionality
            </p>

            {/* Status Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card">
                    <h3>Round Status</h3>
                    <p>{currentRound ? '✅ Active' : '❌ No Round'}</p>
                    {currentRound && (
                        <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            <div>Players: {players.length}</div>
                            <div>Active Hole: {activeHole}</div>
                            <div>Holes Scored: {Object.keys(currentRound.scores || {}).length}</div>
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3>Active Bets</h3>
                    {activeBets.skins?.started ? (
                        <p style={{ color: 'var(--success)' }}>✅ Skins: {activeBets.skins.value} MRTZ</p>
                    ) : (
                        <p style={{ color: 'var(--text-light)' }}>❌ No Skins</p>
                    )}
                    {activeBets.nassau?.started ? (
                        <p style={{ color: 'var(--success)' }}>✅ Nassau: {activeBets.nassau.value} MRTZ</p>
                    ) : (
                        <p style={{ color: 'var(--text-light)' }}>❌ No Nassau</p>
                    )}
                    <p>Fundatory: {fundatoryBets.length} bets</p>
                </div>

                <div className="card">
                    <h3>MRTZ Balances</h3>
                    {Object.keys(mrtzBalances).length > 0 ? (
                        Object.entries(mrtzBalances).map(([playerId, balance]) => {
                            const player = players.find((p: any) => p.id === playerId);
                            return (
                                <div key={playerId} style={{ fontSize: '0.875rem' }}>
                                    {player?.name || playerId}: {balance.toFixed(2)} MRTZ
                                </div>
                            );
                        })
                    ) : (
                        <p style={{ color: 'var(--text-light)' }}>No balances yet</p>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2>Quick Actions</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn" onClick={setupTestRound}>
                        Setup Test Round
                    </button>
                    <button className="btn" onClick={() => setShowSetupModal(true)}>
                        Start Bets (Modal)
                    </button>
                    <button className="btn" onClick={() => startSkins(0.25)}>
                        Start Skins (0.25)
                    </button>
                    <button className="btn" onClick={() => startNassau(0.5)}>
                        Start Nassau (0.5)
                    </button>
                    <button className="btn" onClick={addTestScores}>
                        Add Test Scores
                    </button>
                    <button className="btn" onClick={testFundatoryBet}>
                        Add Fundatory Bet
                    </button>
                    <button className="btn" onClick={testCompleteFlow}>
                        Run Complete Flow Test
                    </button>
                    <button className="btn" onClick={() => setShowResults(true)}>
                        Show Betting Results
                    </button>
                    <button className="btn" onClick={endRound} style={{ backgroundColor: 'var(--danger)' }}>
                        End Round
                    </button>
                </div>
            </div>

            {/* Test Calculations */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2>Test Calculations</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn" onClick={testSkinsCalculation}>
                        Test Skins Calculation
                    </button>
                    <button className="btn" onClick={testNassauCalculation}>
                        Test Nassau Calculation
                    </button>
                    <button className="btn" onClick={testMRTZCalculation}>
                        Test MRTZ Calculation
                    </button>
                </div>
            </div>

            {/* Test Results Log */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2>Test Results</h2>
                    <button className="btn" onClick={clearTestResults} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                        Clear
                    </button>
                </div>
                <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '1rem',
                    borderRadius: '8px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                }}>
                    {testResults.length === 0 ? (
                        <p style={{ color: 'var(--text-light)' }}>No test results yet. Run some tests!</p>
                    ) : (
                        testResults.map((result, index) => (
                            <div key={index} style={{ marginBottom: '0.25rem' }}>
                                {result}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            {showSetupModal && <BettingSetupModal onClose={() => setShowSetupModal(false)} />}
            {showResults && currentRound && (
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
                        <BettingResults onClose={() => setShowResults(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}





