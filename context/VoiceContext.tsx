'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import Fuse from 'fuse.js';
import { detectHotWord, extractCommandAfterHotWord } from '@/lib/hotWordDetection';
import { processQuery } from '@/lib/voiceQueries';
import { speak, stopSpeaking } from '@/lib/textToSpeech';

interface VoiceContextType {
    isListening: boolean;
    isListeningForHotWord: boolean;
    transcript: string;
    lastCommand: any;
    lastResponse: string | null;
    startListening: () => void;
    stopListening: () => void;
    startHotWordListening: () => void;
    stopHotWordListening: () => void;
    isSupported: boolean;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
    const [isListening, setIsListening] = useState(false);
    const [isListeningForHotWord, setIsListeningForHotWord] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastCommand, setLastCommand] = useState<any>(null);
    const [lastResponse, setLastResponse] = useState<string | null>(null);
    const [recognition, setRecognition] = useState<any>(null);
    const [hotWordRecognition, setHotWordRecognition] = useState<any>(null);
    const [isSupported, setIsSupported] = useState(false);
    const gameStateRef = useRef<any>(null);

    // Score terms with variations
    const scoreTerms: { [key: string]: number } = {
        'ace': -2,
        'hole in one': -2,
        'double eagle': -3,
        'albatross': -3,
        'eagle': -2,
        'birdie': -1,
        'birdy': -1,
        'par': 0,
        'bogey': 1,
        'bogie': 1,
        'bogy': 1,
        'double bogey': 2,
        'double bogie': 2,
        'triple bogey': 3,
        'triple bogie': 3,
        'quadruple bogey': 4,
        'quadruple bogie': 4
    };

    // Enhanced Command Parsing Logic
    const parseCommand = useCallback((text: string, players?: any[]): any => {
        const lowerText = text.toLowerCase().trim();

        // Check for queries first
        if (lowerText.includes('?') || 
            lowerText.includes("who's") || 
            lowerText.includes("what's") ||
            lowerText.includes("what is") ||
            lowerText.includes("how") ||
            lowerText.includes("read back") ||
            lowerText.includes("show me")) {
            return { type: 'QUESTION', text: lowerText };
        }

        if (lowerText.includes('start round')) {
            return { type: 'START_ROUND' };
        }

        // Fundatory Parsing
        if (lowerText.includes('hit the gap')) {
            const parts = lowerText.split(' hit the gap');
            if (parts.length > 0) {
                return { type: 'FUNDATORY_RESULT', player: parts[0].trim(), result: 'success' };
            }
        }

        if (lowerText.includes('missed the gap')) {
            const parts = lowerText.split(' missed the gap');
            if (parts.length > 0) {
                return { type: 'FUNDATORY_RESULT', player: parts[0].trim(), result: 'fail' };
            }
        }

        // Extract hole number if present
        let holeNumber: number | null = null;
        const holeMatch = lowerText.match(/(?:hole|on hole)\s+(\d+)/i);
        if (holeMatch) {
            holeNumber = parseInt(holeMatch[1], 10);
        }

        // Parse multiple scores: "I got a bogey, Joey got a birdie"
        const scorePatterns: any[] = [];
        
        // Try to find all score patterns in the text
        for (const [term, value] of Object.entries(scoreTerms)) {
            // Pattern: "Player got a [term]" or "Player got [term]"
            const pattern1 = new RegExp(`([^,]+?)\\s+got\\s+a\\s+${term.replace(/\s+/g, '\\s+')}`, 'gi');
            const pattern2 = new RegExp(`([^,]+?)\\s+got\\s+${term.replace(/\s+/g, '\\s+')}`, 'gi');
            
            let match;
            while ((match = pattern1.exec(lowerText)) !== null) {
                scorePatterns.push({
                    player: match[1].trim(),
                    score: value,
                    term
                });
            }
            while ((match = pattern2.exec(lowerText)) !== null) {
                scorePatterns.push({
                    player: match[1].trim(),
                    score: value,
                    term
                });
            }
        }

        if (scorePatterns.length > 0) {
            return {
                type: 'MULTI_SCORE',
                scores: scorePatterns,
                holeNumber
            };
        }

        // Single score parsing
        for (const [term, value] of Object.entries(scoreTerms)) {
            const parts = lowerText.split(` got a ${term}`);
            if (parts.length > 1) {
                const playerName = parts[0].trim();
                return { type: 'SCORE', player: playerName, score: value, term, holeNumber };
            }
            const parts2 = lowerText.split(` got ${term}`);
            if (parts2.length > 1) {
                const playerName = parts2[0].trim();
                return { type: 'SCORE', player: playerName, score: value, term, holeNumber };
            }
        }

        return { type: 'UNKNOWN', text };
    }, []);

    // Fuzzy match player names
    const findPlayerByName = useCallback((name: string, players: any[]): any => {
        if (!players || players.length === 0) return null;

        // Exact match first
        const exactMatch = players.find((p: any) => 
            p.name.toLowerCase() === name.toLowerCase()
        );
        if (exactMatch) return exactMatch;

        // Partial match
        const partialMatch = players.find((p: any) => 
            p.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(p.name.toLowerCase())
        );
        if (partialMatch) return partialMatch;

        // Fuzzy match using Fuse.js
        const fuse = new Fuse(players, {
            keys: ['name'],
            threshold: 0.4
        });
        const results = fuse.search(name);
        if (results.length > 0) {
            return results[0].item;
        }

        return null;
    }, []);

    // Initialize hot word recognition (continuous, low-power listening)
    useEffect(() => {
        if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            setIsSupported(true);
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            // Hot word recognition (continuous, always listening when enabled)
            const hotWordInstance = new SpeechRecognition();
            hotWordInstance.continuous = true;
            hotWordInstance.interimResults = true;
            hotWordInstance.lang = 'en-US';

            hotWordInstance.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                const fullText = (finalTranscript + interimTranscript).toLowerCase();
                
                if (detectHotWord(fullText)) {
                    console.log('Hot word detected!');
                    stopSpeaking(); // Stop any ongoing TTS
                    
                    // Extract command after hot word
                    const commandText = extractCommandAfterHotWord(finalTranscript || interimTranscript);
                    
                    if (commandText) {
                        // Switch to active listening mode
                        setIsListeningForHotWord(false);
                        setIsListening(true);
                        
                        // Process the command immediately
                        setTimeout(() => {
                            handleCommand(commandText);
                        }, 100);
                    } else {
                        // Just hot word, wait for command
                        setIsListeningForHotWord(false);
                        setIsListening(true);
                    }
                }
            };

            hotWordInstance.onerror = (event: any) => {
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    console.error('Hot word recognition error', event.error);
                }
            };

            hotWordInstance.onend = () => {
                if (isListeningForHotWord) {
                    try {
                        hotWordInstance.start();
                    } catch (e) {
                        // Ignore restart errors
                    }
                }
            };

            setHotWordRecognition(hotWordInstance);
        }
    }, [isListeningForHotWord]);

    // Initialize active command recognition
    useEffect(() => {
        if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = false;
            recognitionInstance.lang = 'en-US';

            recognitionInstance.onresult = (event: any) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        currentTranscript += event.results[i][0].transcript;
                    }
                }
                if (currentTranscript) {
                    const cleanTranscript = currentTranscript.trim();
                    setTranscript(cleanTranscript);
                    console.log('Voice Command:', cleanTranscript);
                    handleCommand(cleanTranscript);
                }
            };

            recognitionInstance.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed') {
                    setIsListening(false);
                }
            };

            recognitionInstance.onend = () => {
                if (isListening) {
                    try {
                        recognitionInstance.start();
                    } catch (e) {
                        console.log("Failed to restart recognition", e);
                    }
                }
            };

            setRecognition(recognitionInstance);
        }
    }, [isListening]);

    // Handle command processing
    const handleCommand = useCallback(async (text: string) => {
        const gameState = gameStateRef.current;
        const players = gameState?.currentRound?.players || [];

        const command = parseCommand(text, players);

        if (command.type === 'QUESTION') {
            // Process query and generate TTS response
            if (gameState) {
                const response = processQuery(text, {
                    currentRound: gameState.currentRound,
                    activeHole: gameState.activeHole,
                    fundatoryBets: gameState.fundatoryBets || []
                });

                if (response) {
                    setLastResponse(response.text);
                    await speak(response.text);
                } else {
                    const noResponse = "I didn't understand that question.";
                    setLastResponse(noResponse);
                    await speak(noResponse);
                }
            }
        } else if (command.type === 'MULTI_SCORE') {
            // Handle multiple scores
            setLastCommand(command);
        } else if (command.type !== 'UNKNOWN') {
            setLastCommand(command);
        }
    }, [parseCommand]);

    // Expose game state setter for components to update
    useEffect(() => {
        // This will be called by components that need to update game state
        if (typeof window !== 'undefined') {
            (window as any).__updateVoiceGameState = (state: any) => {
                gameStateRef.current = state;
            };
        }
    }, []);

    const startListening = useCallback(() => {
        if (recognition && !isListening) {
            try {
                stopSpeaking();
                recognition.start();
                setIsListening(true);
                setIsListeningForHotWord(false);
                if (hotWordRecognition) {
                    hotWordRecognition.stop();
                }
            } catch (error) {
                console.error('Error starting recognition:', error);
            }
        }
    }, [recognition, isListening, hotWordRecognition]);

    const stopListening = useCallback(() => {
        if (recognition && isListening) {
            recognition.stop();
            setIsListening(false);
        }
    }, [recognition, isListening]);

    const startHotWordListening = useCallback(() => {
        if (hotWordRecognition && !isListeningForHotWord) {
            try {
                stopSpeaking();
                hotWordRecognition.start();
                setIsListeningForHotWord(true);
                setIsListening(false);
                if (recognition) {
                    recognition.stop();
                }
            } catch (error) {
                console.error('Error starting hot word recognition:', error);
            }
        }
    }, [hotWordRecognition, isListeningForHotWord, recognition]);

    const stopHotWordListening = useCallback(() => {
        if (hotWordRecognition && isListeningForHotWord) {
            hotWordRecognition.stop();
            setIsListeningForHotWord(false);
        }
        if (recognition && isListening) {
            recognition.stop();
            setIsListening(false);
        }
    }, [hotWordRecognition, isListeningForHotWord, recognition, isListening]);

    return (
        <VoiceContext.Provider
            value={{
                isListening,
                isListeningForHotWord,
                transcript,
                lastCommand,
                lastResponse,
                startListening,
                stopListening,
                startHotWordListening,
                stopHotWordListening,
                isSupported
            }}
        >
            {children}
        </VoiceContext.Provider>
    );
}

export function useVoice() {
    const context = useContext(VoiceContext);
    if (!context) {
        throw new Error('useVoice must be used within a VoiceProvider');
    }
    return context;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
        __updateVoiceGameState?: (state: any) => void;
    }
}
